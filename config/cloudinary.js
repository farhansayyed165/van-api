require('dotenv').config();
const cloudinary = require('cloudinary');

cloudinary.v2.config({
  cloud_name: 'drqdgsnat',
  api_key: '465641643574548',
  api_secret: process.env.CLOUD_SECRET,
  secure: true,
});