import { Document, Schema, model, Types } from "mongoose";

export interface IReactivationToken extends Document {
  userId: Types.ObjectId;
  role: "worker" | "employer";
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
}

const ReactivationTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    role: { type: String, enum: ["worker", "employer"], required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ReactivationTokenSchema.index({ userId: 1, role: 1, usedAt: 1 });

export default model<IReactivationToken>("ReactivationToken", ReactivationTokenSchema);
