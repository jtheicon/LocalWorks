/**
 * Async signup document AI scans — upload returns immediately; client polls by scanId.
 * Avoids 504 from reverse proxies when Gemini review exceeds ~60s.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import Industry from "../model/Industry";
import { extractPermit, extractResume, type PermitFields, type ResumeFields } from "../ai/verification";
import type { VerificationResult } from "../ai/verification";
import { issueSignupDocumentToken, type SignupDocumentKind } from "./signupDocument";

const SCAN_TTL_MS = 20 * 60 * 1000;
const PURGE_INTERVAL_MS = 60_000;

export type SignupScanStatus = "processing" | "complete" | "rejected" | "error";

export type SignupScanPollResponse =
  | { success: true; status: "processing" }
  | {
      success: true;
      status: "complete";
      documentToken: string;
      documentType: string;
      fields: ResumeFields | PermitFields;
    }
  | { success: false; status: "rejected" | "error"; message: string; reasons: string[] };

type ScanRecord = {
  kind: SignupDocumentKind;
  status: SignupScanStatus;
  filePath: string;
  filename: string;
  createdAt: number;
  documentToken?: string;
  documentType?: string;
  fields?: ResumeFields | PermitFields;
  message?: string;
  reasons?: string[];
};

const scans = new Map<string, ScanRecord>();

const removeFile = (filePath: string) => fs.unlink(filePath).catch(() => {});

const purgeExpired = () => {
  const cutoff = Date.now() - SCAN_TTL_MS;
  for (const [id, rec] of scans) {
    if (rec.createdAt >= cutoff) continue;
    scans.delete(id);
    removeFile(rec.filePath);
  }
};

const purgeTimer = setInterval(purgeExpired, PURGE_INTERVAL_MS);
purgeTimer.unref?.();

export const createSignupScan = (kind: SignupDocumentKind, file: Express.Multer.File): string => {
  purgeExpired();
  const scanId = randomUUID();
  scans.set(scanId, {
    kind,
    status: "processing",
    filePath: file.path,
    filename: file.filename,
    createdAt: Date.now(),
  });
  void runSignupScan(scanId);
  return scanId;
};

export const pollSignupScan = (scanId: string): SignupScanPollResponse | null => {
  purgeExpired();
  const rec = scans.get(scanId);
  if (!rec) return null;

  if (rec.status === "processing") {
    return { success: true, status: "processing" };
  }
  if (rec.status === "complete" && rec.documentToken && rec.documentType && rec.fields) {
    return {
      success: true,
      status: "complete",
      documentToken: rec.documentToken,
      documentType: rec.documentType,
      fields: rec.fields,
    };
  }
  return {
    success: false,
    status: rec.status === "error" ? "error" : "rejected",
    message: rec.message ?? "We couldn't verify this document.",
    reasons: rec.reasons ?? [],
  };
};

const rejectScan = (
  scanId: string,
  rec: ScanRecord,
  message: string,
  reasons: string[],
  status: "rejected" | "error" = "rejected",
) => {
  removeFile(rec.filePath);
  scans.set(scanId, { ...rec, status, message, reasons });
};

const completeScan = (
  scanId: string,
  rec: ScanRecord,
  kind: SignupDocumentKind,
  name: string,
  verification: VerificationResult,
  fields: ResumeFields | PermitFields,
) => {
  scans.set(scanId, {
    ...rec,
    status: "complete",
    documentToken: issueSignupDocumentToken(kind, rec.filename, name, verification),
    documentType: fields.document_type,
    fields,
  });
};

async function runSignupScan(scanId: string) {
  const rec = scans.get(scanId);
  if (!rec || rec.status !== "processing") return;

  try {
    if (rec.kind === "resume") {
      const { verification, fields } = await extractResume(rec.filePath, { signup: true });
      if (verification.decision !== "approve" || !fields) {
        rejectScan(
          scanId,
          rec,
          verification.method === "unavailable"
            ? "We couldn't check your document right now. Please try again in a few minutes."
            : "We couldn't verify this document.",
          verification.reasons,
        );
        return;
      }
      completeScan(scanId, rec, "resume", fields.full_name, verification, fields);
      return;
    }

    const industries = (await Industry.find({}).select("title").lean()).map((i) => i.title as string);
    const { verification, fields } = await extractPermit(rec.filePath, industries, { signup: true });
    if (verification.decision !== "approve" || !fields) {
      rejectScan(
        scanId,
        rec,
        verification.method === "unavailable"
          ? "We couldn't check your document right now. Please try again in a few minutes."
          : "We couldn't verify this document.",
        verification.reasons,
      );
      return;
    }
    completeScan(scanId, rec, "permit", fields.business_name, verification, fields);
  } catch (error) {
    console.error("[signup] async scan:", scanId, error);
    rejectScan(
      scanId,
      rec,
      "Something went wrong while reading your document.",
      [],
      "error",
    );
  }
}

/** Test hook — clear in-memory scans. */
export const _clearSignupScansForTests = () => {
  scans.clear();
};
