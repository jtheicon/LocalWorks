import mongoose from "mongoose";

// contact, worker, role, content

const messageSchema = new mongoose.Schema(
  {
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    senderRole: {
      type: String,
      enum: ["worker", "employer"],
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    attachments: [
      {
        url: String,
        type: String,
      },
    ],

    readByWorker: {
      type: Boolean,
      default: false,
    },

    readByEmployer: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

messageSchema.index({ contactId: 1, createdAt: -1 });
messageSchema.index({ parentMessageId: 1 });

export default mongoose.model("Message", messageSchema);