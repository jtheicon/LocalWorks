import { Request, Response } from "express";
import fs from "node:fs/promises";
import { uploadEmployerPermit, uploadFiles } from "../file/upload";
import { createSignupScan, pollSignupScan } from "../services/signupDocumentScan";
import {
  SIGNUP_DOCUMENT_MAX_MB,
  signupDocumentMaxBytes,
  signupDocumentMaxSizeLabel,
} from "../config/uploadLimits";

const removeFile = (filePath: string) => fs.unlink(filePath).catch(() => {});

const multerMessage = (err: any) =>
  err?.code === "LIMIT_FILE_SIZE"
    ? `The file is too large. The maximum is ${signupDocumentMaxSizeLabel()}.`
    : "Invalid file type.";

export const SignupUploadLimits = (_req: Request, res: Response) =>
  res.status(200).json({
    success: true,
    maxMb: SIGNUP_DOCUMENT_MAX_MB,
    maxBytes: signupDocumentMaxBytes(),
    label: signupDocumentMaxSizeLabel(),
  });

const acceptUpload = (res: Response, file: Express.Multer.File, kind: "resume" | "permit") => {
  const scanId = createSignupScan(kind, file);
  return res.status(202).json({
    success: true,
    status: "processing",
    scanId,
  });
};

// POST /api/auth/signup/resume  (multipart, field "resume") — returns scanId; poll GET /signup/scan/:scanId
export const ScanResume = (req: Request, res: Response) => {
  uploadFiles.single("resume")(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: multerMessage(err) });
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: "Please upload your resume." });

    try {
      acceptUpload(res, file, "resume");
    } catch (error) {
      removeFile(file.path);
      console.error("[signup] resume scan:", error);
      res.status(500).json({ success: false, message: "Something went wrong while reading your resume." });
    }
  });
};

// POST /api/auth/signup/permit  (multipart, field "permit")
export const ScanPermit = (req: Request, res: Response) => {
  uploadEmployerPermit.single("permit")(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: multerMessage(err) });
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: "Please upload your business permit." });

    try {
      acceptUpload(res, file, "permit");
    } catch (error) {
      removeFile(file.path);
      console.error("[signup] permit scan:", error);
      res.status(500).json({ success: false, message: "Something went wrong while reading your permit." });
    }
  });
};

// GET /api/auth/signup/scan/:scanId
export const PollSignupScan = (req: Request, res: Response) => {
  const scanId = typeof req.params.scanId === "string" ? req.params.scanId.trim() : "";
  if (!scanId) {
    return res.status(400).json({ success: false, message: "Missing scan id." });
  }
  const payload = pollSignupScan(scanId);
  if (!payload) {
    return res.status(404).json({ success: false, message: "This document review expired. Please upload again." });
  }
  if (payload.status === "rejected" || payload.status === "error") {
    return res.status(422).json(payload);
  }
  return res.status(200).json(payload);
};
