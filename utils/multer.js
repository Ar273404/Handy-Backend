import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.js';

// Define Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary : cloudinary,
  params: async (req, file) => {
    const folder = file.fieldname === 'aadharCard' ? 'aadhar_cards' : 'profile_images';
    return {
      folder, // Store files in specific folders
      public_id: `${file.originalname.split('.')[0]}-${Date.now()}`, // Generate unique public ID
      allowed_formats: ['jpg', 'jpeg', 'png'], // Allowed file types
    };
  },
});

// Configure multer
const upload = multer({ storage });

export default upload;
