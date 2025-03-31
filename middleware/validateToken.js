require("dotenv").config()
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

const validateToken = asyncHandler(async (req, res, next)=>{

    let token;
    let authHeader = req.headers.authorization || req.headers.Authorization;
    if(authHeader && authHeader.startsWith("Bearer")){
        token = authHeader.split(" ")[1];
 
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
            if(err){
                res.status(403).json({error:"User not Authorized"})
                throw new Error("User not Authorized");
            }

            next();  
        })
    }
    else{
        res.status(401).json({error:"Token is ot authorized"});
        throw new Error("Token is not authorized")
    }
})

module.exports = validateToken;