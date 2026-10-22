import { Request, Response } from "express";
import fs from "node:fs/promises";
import Industry from "../model/Industry";
import { uploadEmployerPermit, uploadFiles } from "../file/upload";
import { extractPermit, extractResume, ExtractionResult } from "../ai/verification";
import { issueSignupDocumentToken, SignupDocumentKind } from "../services/signupDocument";

const removeFile = (filePath: string) => fs.unlink(filePath).catch(() => {});

const multerMessage = (err: any) =>
  err?.code === "LIMIT_FILE_SIZE" ? "The file is too large. The maximum is 5 MB." : "Invalid file type.";

// Shared response: approved -> fields + token; otherwise the file is discarded and the
// applicant is told why, so they can upload a clearer or correct document.
const respond = <F extends { document_type: string }>(res: Response, file: Express.Multer.File, kind: SignupDocumentKind, name: (fields: F) => string, { verification, fields }: ExtractionResult<F>) => {
  if (verification.decision !== "approve" || !fields) {
    removeFile(file.path);
    return res.status(422).json({
      success: false,
      message: verification.method === "unavailable"
        ? "We couldn't check your document right now. Please try again in a few minutes."
        : "We couldn't verify this document.",
      reasons: verification.reasons,
    });
  }

  return res.status(200).json({
    success: true,
    documentToken: issueSignupDocumentToken(kind, file.filename, name(fields), verification),
    documentType: fields.document_type,
    fields,
  });
};

// POST /api/auth/signup/resume  (multipart, field "resume")
export const ScanResume = (req: Request, res: Response) => {
  uploadFiles.single("resume")(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: multerMessage(err) });
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: "Please upload your resume." });

    try {
      respond(res, file, "resume", (f) => f.full_name, await extractResume(file.path));
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
      const industries = (await Industry.find({}).select("title").lean()).map((i) => i.title as string);
      respond(res, file, "permit", (f) => f.business_name, await extractPermit(file.path, industries));
    } catch (error) {
      removeFile(file.path);
      console.error("[signup] permit scan:", error);
      res.status(500).json({ success: false, message: "Something went wrong while reading your permit." });
    }
  });
};
