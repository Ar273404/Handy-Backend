import mongoose from "mongoose";

// model for confirmed bookings.
const BookingSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    status: {
      type: String,
      enum: ["ongoing", "completed", "cancelled"],
      default: "ongoing",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    rating: {
      workerRating: { type: Number, default: 0 },
      providerRating: { type: Number, default: 0 },
    },
    cancellationReason: { type: String }, // Reason for booking cancellation
    paymentMethod: { type: String, enum: ["online", "cash"], required: true },
    paymentAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", BookingSchema);

export default Booking;
