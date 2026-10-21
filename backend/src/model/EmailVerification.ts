import { Document, Schema, model } from "mongoose";

export type OTPPurpose = "register" | "password_reset";

export interface IEmailVerification extends Document {
  email: string;
  purpose: OTPPurpose;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

// One pending code per email + purpose. The code itself is never stored or
// sent to the browser - only a bcrypt hash, checked server-side.
const EmailVerificationSchema = new Schema<IEmailVerification>({
  email: { type: String, required: true, lowercase: true, trim: true },
  purpose: { type: String, enum: ["register", "password_reset"], required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
}, { timestamps: true })

EmailVerificationSchema.index({ email: 1, purpose: 1 }, { unique: true })
// MongoDB removes expired codes automatically.
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default model<IEmailVerification>("EmailVerification", EmailVerificationSchema)
