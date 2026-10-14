import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },

    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
    },

    // Added to match frontend
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Existing fields kept
    lastMessage: {
      type: String,
      default: "",
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },

    unreadCountWorker: {
      type: Number,
      default: 0,
    },

    unreadCountEmployer: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["active", "archived", "blocked"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

contactSchema.index({ worker: 1, employerId: 1 });

export default mongoose.model("Contact", contactSchema);