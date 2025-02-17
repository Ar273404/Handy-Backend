import mongoose from "mongoose";

// model for job postings by work providers
const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: {
    city: { type: String },
    state: { type: String },
    coordinates: { type: [Number], index: '2dsphere' }, // [longitude, latitude]
  },
  compensation: { type: String, required: true },
  duration: { type: String }, // E.g., '2 hours', '3 days'
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requiredExpertise: { type: [String], required: true }, // E.g., ['plumber', 'electrician']
  createdAt: { type: Date, default: Date.now },
  applicants: [
    {
      workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['applied', 'rejected', 'accepted'], default: 'applied' },
    },
  ],
  status: { type: String, enum: ['open', 'in progress', 'completed', 'cancelled'], default: 'open' },
});

const Job = mongoose.model('Job', JobSchema);

export default Job;