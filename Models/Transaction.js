import mongoose from "mongoose";

// To track payments between workers and providers.
const TransactionSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
  },
  payerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  payeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  timestamp: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ["online", "cash"], required: true },
});

const Transaction = mongoose.model("Transtion", TransactionSchema);

export default Transaction;
