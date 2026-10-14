import { Document, Schema, model } from "mongoose";

export interface IPlatformHealth extends Document {
  status: "OK" | "ERR";
  createdAt: Date;
  updatedAt: Date;
}

const PlatformHealthSchema = new Schema<IPlatformHealth>(
  {
    status: {
      type: String,
      enum: ["OK", "ERR"],
      required: true
    }
  },
  {
    timestamps: true
  }
);

export default model<IPlatformHealth>(
  "PlatformHealth",
  PlatformHealthSchema
);