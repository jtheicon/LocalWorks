import { Document, model, Schema } from "mongoose";

export interface IAdminNotification extends Document {
  type: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  category: string;
  details?: string;
}

const AdminNotificationSchema: Schema = new Schema({
  type: {
    type: String,
    enum: ["job_posted", "verification", "application", "report"],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  category: {
    type: String,
    enum: ["job", "account", "report"],
    required: true,
  },
  details: {
    type: String,
    default: null,
  },
});

export default model<IAdminNotification>(
  "AdminNotification",
  AdminNotificationSchema
);