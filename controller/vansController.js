const asyncHandler = require("express-async-handler")
const {pool} = require("../queries")

const getAllVans = asyncHandler(async (req, res)=>{
    const { userId, vanid } = req.body
    if(!userId){
        const error = "UserId not provided"
        res.json({error}).status(400)
        throw new Error(error)
    }
    let str = "";
    if(vanid){
        str = `SELECT * FROM vans WHERE userid = $1 AND vanid=${vanid}`;
    }
    else{
        str = "SELECT * FROM vans WHERE userid = $1 ORDER BY vanid ASC";
    }
    const client = await pool.connect()
    const vans = await client.query(str, [userId])
    if(vans.rowCount == 0){
        const error = "No Hosted vans"
        client.release()
        res.json({error}).status(204)
    }
    client.release()
    res.json({vans:vans.rows}).status(200)
});

const getQueryVans = asyncHandler(async (req, res)=>{
    if(!req.query){
        getAllVans()
    }
    const {price, type} = req.query;
    let str = 'SELECT * FROM vans '
    if(type == 'luxury' || type == 'rugged' || type == 'simple'){
       let typeStr = ` WHERE type='${type}' `  
       str = str + typeStr
    }
    if(price == 'asc' || price =='desc'){
        let priceStr = ` ORDER BY price ${price} `
        str = str + priceStr
    }
    pool.query(str, (error, result) => {
        if (error) {
            console.log(error)
        }
        res.json(result.rows).status(200)
    })
}); 

const getVans  =asyncHandler(async(req,res)=>{
    const client = await pool.connect();
    let str = "SELECT * FROM vans" 
    if(req.query.id){
        str = `SELECT * FROM vans WHERE vanid='${req.query.id}'`
    }
    
    const data = await client.query(`${str} ORDER BY vanid ASC`);
    if(data.rowCount == 0){
        res.json({message:"No Vans Found"}).status(404)
        throw new Error("No vans found")
    }
    client.release()
    res.json({vans:data.rows}).status(200)
    
})

module.exports = {getAllVans, getQueryVans, getVans}