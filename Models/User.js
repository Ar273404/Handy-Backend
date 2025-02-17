import mongoose from "mongoose";

// model for For workers and work providers
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  profileImage: { type: String },
  userType: { type: String, enum: ['worker', 'provider'], required: true },
  location: {
    city: { type: String },
    state: { type: String },
    country: { type: String },
    coordinates: { type: [Number], index: '2dsphere' , default : [] }, // [longitude, latitude]
  },
  expertise: { type: [String], default: [] }, // For workers (e.g., ['plumber', 'electrician'])
  rating: { type: Number, default: 0 }, // Aggregate rating for workers
  reviews: [
    {
      reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      comment: { type: String },
      rating: { type: Number, required: true },
    },
  ],
  experience: { type: Number }, // For workers
  aadharCard: { type: String }, // Identity verification for workers
  expectedCompensation: { type: String }, // For workers
});

const User = mongoose.model('User', UserSchema);

export default User;
