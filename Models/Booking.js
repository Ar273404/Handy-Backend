import mongoose from "mongoose";

// model for confirmed bookings.
const BookingSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  status: { type: String, enum: ['ongoing', 'completed', 'cancelled'], default: 'ongoing' },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  rating: {
    workerRating: { type: Number },
    providerRating: { type: Number },
  },
});

const Booking = mongoose.model('Booking', BookingSchema);

export default Booking;
