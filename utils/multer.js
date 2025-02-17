import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js"; // Ensure cloudinary.js is correctly exporting

// Define Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary, // Ensure cloudinary is properly configured
  params: async (req, file) => {
    // Select the folder based on the fieldname
    const folder =
      file.fieldname === "aadharCard" ? "aadhar_cards" : "profile_images";

    return {
      folder, // Store files in specified folders
      public_id: `${file.originalname.split(".")[0]}-${Date.now()}`, // Generate unique public ID
      allowed_formats: ["jpg", "jpeg", "png"], // Restrict allowed file formats
    };
  },
});

// Configure multer with file validation (only allows jpg, jpeg, png)
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only jpg, jpeg, and png formats are allowed"),
        false
      );
    }
    cb(null, true);
  },
});

export default upload;
