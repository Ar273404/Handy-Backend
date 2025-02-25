import mongoose from "mongoose";
// import expertiseEnum from "../utils/expertiseEnum.js";
import expertiseEnum from "../utils/exoertiseEnum.js";

// model for For workers and work providers
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    profileImage: { type: String },
    userType: {
      type: String,
      enum: ["worker", "provider", "admin"],
      required: true,
    },
    location: {
      address: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      coordinates: { type: [Number], index: "2dsphere", default: [] },
    },
    expertise: { type: [String], enum: expertiseEnum, default: [] }, // For workers (e.g., ['plumber', 'electrician'])
    skillsDescription: { type: String }, // Detailed skill description
    skillsCertifications: [{ type: String }], // List of certificates
    rating: { type: Number, default: 0, min: 0, max: 5 }, // Aggregate rating for workers
    reviews: [
      {
        reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        comment: { type: String },
        rating: { type: Number, required: true },
      },
    ],
    availability: { type: Boolean, default: true }, // Available for work or not
    experience: { type: Number, min: 0 }, // For workers
    aadharCard: { type: String }, // Identity verification for workers
    isVerified: { type: Boolean, default: false },
    expectedCompensation: { type: String }, // For workers
    lastActive: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

export default User;
