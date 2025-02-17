import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config'; 

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Replace with your Cloudinary cloud name
  api_key: process.env.CLOUDINARY_API_KEY,      // Replace with your Cloudinary API key
  api_secret: process.env.CLOUDINARY_API_SECRET,// Replace with your Cloudinary API secret
});

export default cloudinary;
