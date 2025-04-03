const asyncHandler = require("express-async-handler")
const { pool } = require("../queries")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const multer = require("multer")
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const { getImageUrl } = require("../config/awsConfig")
/*
asyncHandler(async(req,res)=>{
    
})
*/
const runFunc = (str, res) => {
    pool.query(str, (error, result) => {
        if (error) {
            res.status(400)
            throw new Error(error)
        }
        res.json(result).status(200)
    })
}
const createUser = asyncHandler(async (req, res) => {
    let { name, email, password, about, gender, role } = req.body
    req.file
    if (!name || !email || !password || !gender || !role) {
        res.status(400).json({ error: "fields: name, email, password, and gender  are mandatory" });
        throw new Error("fields: name, email, password, and gender  are mandatory")
    }
    
    const client = await pool.connect();
    const user = await client.query(`SELECT * FROM users WHERE email = '${email}'`)
    if (user.rowCount > 0) {
        res.status(403).json({ error: "Email already exists" })
        client.release()
        throw new Error("Email already exists")
    }
    let imageUrl;
    if (req.file) {
        imageUrl = await getImageUrl(req)
    }
    else {
        imageUrl = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png'
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const result = await client.query("INSERT INTO users VALUES (DEFAULT,$1,$2,$3,$4,$5,$6,$7) RETURNING *", [name, email, hashedPassword, imageUrl, about, gender, role])
        result.rows[0].password = undefined
        res.json(result.rows[0]).status(200)
        client.release()

    } catch (error) {
        client.release()

        res.status(401).json({ error: `Something Went Wrong while connecting to postgres` })
        throw new Error(error)
    }
})


const getUser = asyncHandler(async (req, res) => {
    const { column, value } = req.body
    
    if (!column || !value) {
        res.status(400)
        throw new Error(`"value" or "column" parameter required for the request is empty`)
    }
    if(column == 'name'){
        str = `SELECT * FROM users WHERE $1 ILIKE '$2'`
    }
    else{
        str = `SELECT * FROM users WHERE userid = $1`
    }
    const client = await pool.connect()
    const user = await client.query(str, [value])
    client.release()
    res.json(user?.rows).status(200)
})


const updateUser = asyncHandler(async (req, res) => {
    const { id, columns, values } = req.body;
    let str = "UPDATE users SET";
    for (let index = 0; index < columns.length; index++) {
        const column = columns[index];
        const value = values[index];
        let tempStr = ` ${column} = '${value}'`
        str = str + tempStr
    }
    str = str + ` WHERE userid = ${id} RETURNING *`
    pool.query(str, (error, result) => {
        if (error) {
            console.log(error)
        }
        res.json(result.rows).status(200)
    })

})



const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400);
        throw new Error("fields: email, password are mandatory")
    }
    const client = await pool.connect();
    let user;

    user = await client.query(`SELECT * FROM users WHERE email = '${email}'`)
    client.release()

    if (user.rowCount == 0) {
        res.status(401).json({ error: `cannot find account with email:  "${email}"` })
        throw new Error("User not found")
    }


    let condition
    try {
        condition = await bcrypt.compare(password, user.rows[0]?.password)
    } catch (error) {
        res.sendStatus(500)
    }
    if (condition) {
        const accessToken = jwt.sign({
            user: user.rows[0].name,
            email: user.rows[0].email,
            userid: user.rows[0].userid
        },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "30m" })

        const refreshToken = jwt.sign({
            user: user.rows[0].name,
            email: user.rows[0].email,
            userid: user.rows[0].userid

        },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "1d" })
        res.cookie('jwt', refreshToken, { httpOnly: true, maxAge: 2 * 24 * 60 * 60 * 1000, sameSite:"none", secure:true })
        let userObj = user.rows[0]
        let {name, email, userid} = user.rows[0]
        userObj.password = undefined
        res.json({userid, email, name, accessToken, }).status(200)
    }
    else {
        res.status(401).json({ error: `email or password not valid` })
        throw new Error("email or password is not valid");
    }

})


const logoutUser = asyncHandler(async (req, res) => {
    const cookies = req.cookies
    if (!cookies?.jwt) {
        res.status(401).json({error:"no cookies available"});
        throw new Error("no cookies available")
    }
    const refreshToken = cookies.jwt

    res.clearCookie('jwt', { httpOnly: true, secure: true, sameSite:"none" })
    res.json({ message: "Logged out successfully" }).status(200)
})



const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.body
    if (!id) {
        res.status(400)
        throw new Error("ID not provided");
    }
    const client = await pool.connect();
    try {
        const user = await client.query("DELETE FROM users WHERE userid=$1  RETURNING *", [id])
        res.status(200).json(user)
    } catch (error) {
        res.status(500)
        throw new Error("SOMETHING WENT WRONG");
    }
})

module.exports = { getUser, loginUser, createUser, deleteUser, updateUser, logoutUser }