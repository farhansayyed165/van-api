const multer = require("multer")
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const dotenv =  require("dotenv");
dotenv.config()

const baseurl = process.env.AWS_CLOUDFRONT_BASEURL

const accessKeyId = process.env.AWS_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_REGION

const s3 = new S3Client({
    credentials:{
        accessKeyId,
        secretAccessKey
    },
    region,
})

const asyncHandler = require("express-async-handler")
const { pool } = require("../queries")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")

const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex')

const getImageUrl = async(req)=>{
    const fileName = generateFileName()
    const params = {
        Bucket:bucketName,
        Key:fileName,
        Body: req.file.buffer,
        ContentType:req.file.mimetype
    }

    const command = new PutObjectCommand(params)
    await s3.send(command)
    const imageUrl = `${baseurl}/${fileName}`
    return imageUrl
}

module.exports = { getImageUrl }
