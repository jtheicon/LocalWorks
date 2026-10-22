import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomInt } from "node:crypto";
import nodemailer from "nodemailer";
import EmailVerification, { OTPPurpose } from "../model/EmailVerification";

const OTP_TTL_MS = 5 * 60 * 1000;      // code is valid for 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;  // one new code per minute per email
const MAX_ATTEMPTS = 5;                // wrong guesses before the code is burned
const TOKEN_TTL = "30m";               // time to finish the form after verifying

export class OTPError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_OWNER,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });
};

// Generates a code, stores only its hash, and emails it. Returns the expiry time.
export const issueOTP = async (rawEmail: string, purpose: OTPPurpose) => {
  const email = rawEmail.toLowerCase().trim();

  const existing = await EmailVerification.findOne({ email, purpose });
  if (existing && Date.now() - existing.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new OTPError("Please wait a minute before requesting another code.", 429);
  }

  const code = randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await EmailVerification.findOneAndDelete({ email, purpose });
  await EmailVerification.create({
    email,
    purpose,
    codeHash: await bcrypt.hash(code, 10),
    expiresAt,
  });

  const subject = purpose === "register" ? "LocalWorks Email Verification" : "LocalWorks Password Reset";
  await sendEmail(email, subject, `Your LocalWorks verification code is ${code}. It expires in 5 minutes.`);

  return expiresAt;
};

// Checks a code and, if correct, returns a signed token proving the email was verified.
export const verifyOTP = async (rawEmail: string, purpose: OTPPurpose, code: string) => {
  const email = rawEmail.toLowerCase().trim();
  const record = await EmailVerification.findOne({ email, purpose });

  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new OTPError("Code has expired. Please request a new one.");
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await record.deleteOne();
    throw new OTPError("Too many incorrect attempts. Please request a new code.", 429);
  }

  const matches = await bcrypt.compare(code, record.codeHash);
  if (!matches) {
    record.attempts += 1;
    await record.save();
    throw new OTPError("Incorrect code.");
  }

  await record.deleteOne(); // single use
  return jwt.sign({ email, purpose }, process.env.JWT_SECRET as string, { expiresIn: TOKEN_TTL });
};

// Used by register / password reset: the request must carry a token for this exact email.
export const assertVerifiedEmail = (token: unknown, rawEmail: string, purpose: OTPPurpose) => {
  if (typeof token !== "string" || !token) {
    throw new OTPError("Please verify your email address first.", 401);
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { email: string; purpose: OTPPurpose };
    if (payload.purpose !== purpose || payload.email !== rawEmail.toLowerCase().trim()) {
      throw new Error("mismatch");
    }
  } catch {
    throw new OTPError("Email verification expired or does not match. Please verify again.", 401);
  }
};
