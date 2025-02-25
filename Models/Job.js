import mongoose from "mongoose";

// model for job postings by work providers
const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: {
      address: { type: String },
      city: { type: String },
      state: { type: String },
      coordinates: { type: [Number], index: "2dsphere" }, // [longitude, latitude]
    },
    compensation: { type: String, required: true },
    duration: { type: String }, // E.g., '2 hours', '3 days'
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requiredExpertise: { type: [String], required: true }, // E.g., ['plumber', 'electrician']
    createdAt: { type: Date, default: Date.now },
    applicants: [
      {
        workerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["applied", "rejected", "accepted"],
          default: "applied",
        },
      },
    ],
    status: {
      type: String,
      enum: ["open", "alloted", "in progress", "completed", "cancelled"],
      default: "open",
    },
    images: { type: [String] }, // Images related to the job
    isUrgent: { type: Boolean, default: false }, // Urgency flag for jobs
    deadline: { type: Date }, // Deadline for the job to be completed
    distanceRange: { type: Number }, // Maximum distance workers can apply from
  },
  { timestamps: true }
);

const Job = mongoose.model("Job", JobSchema);

export default Job;
