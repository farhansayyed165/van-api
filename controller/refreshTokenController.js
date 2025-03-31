const asyncHandler = require("express-async-handler")
const { pool } = require("../queries")
const jwt = require("jsonwebtoken") 

const refreshToken = asyncHandler(async (req, res) => {
    const cookies = req.cookies
    if(!cookies?.jwt){
        res.status(401).json({error:"no cookies available"});
        throw new Error("no cookies available")
    }

    const refreshToken = cookies.jwt

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded)=>{
        if(err){
            res.status(401).json("Token not authorized")
            throw new Error("User not Authorized");
        }
        // console.log("refresh",decoded)
        const accessToken = jwt.sign({
            user:decoded.name,
            email:decoded.email,
            userid:decoded.userid
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "60m" })
        // console.log(decoded)
        res.json({accessToken, user:decoded.user, userid:decoded.userid, email:decoded.email})
    })
});

module.exports = refreshToken