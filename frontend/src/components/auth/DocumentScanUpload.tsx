import { useRef, useState } from "react";
import { Loader2, ShieldCheck, ShieldAlert, Sparkles, Upload } from "lucide-react";
import FileUpload from "./FileUpload";
import axios from "axios";
import { API_ORIGIN } from "@/lib/apiOrigin";

axios.defaults.withCredentials = true;

export interface DocumentScanResult<F> {
  documentToken: string;
  documentType: string;
  fields: F;
}

interface DocumentScanUploadProps<F> {
  label: string;
  accept: string;
  helpText: string;
  type?: "image" | "document";
  // "resume" or "permit": the form field name and the /api/auth/signup/<field> endpoint
  field: "resume" | "permit";
  onVerified: (result: DocumentScanResult<F>) => void;
  onCleared: () => void;
}

type ScanState =
  | { status: "idle" }
  | { status: "scanning"; phase: "uploading" | "verifying"; progress: number }
  | { status: "verified"; documentType: string }
  | { status: "rejected"; message: string; reasons: string[] };

const MAX_FILE_BYTES = 5 * 1024 * 1024;

// Step 1 of sign-up: the document is uploaded first, checked by AI, and its details are
// used to pre-fill the rest of the form.
const DocumentScanUpload = <F,>({ label, accept, helpText, type, field, onVerified, onCleared }: DocumentScanUploadProps<F>) => {
  const [file, setFile] = useState<File | null>(null);
  const [scan, setScan] = useState<ScanState>({ status: "idle" });
  const activeRequest = useRef<AbortController | null>(null);

  const handleChange = async (selected: File | null) => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setFile(selected);
    onCleared();

    if (!selected) {
      setScan({ status: "idle" });
      return;
    }

    const extension = selected.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = field === "resume" ? ["pdf", "docx"] : ["pdf", "jpg", "jpeg", "png"];
    if (!extension || !allowedExtensions.includes(extension)) {
      setScan({
        status: "rejected",
        message: `Please choose a supported ${field === "resume" ? "PDF or DOCX resume" : "PDF or image permit"}.`,
        reasons: [],
      });
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setScan({
        status: "rejected",
        message: "The file is too large. Maximum upload size is 5 MB.",
        reasons: [],
      });
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    setScan({ status: "scanning", phase: "uploading", progress: 0 });

    const formData = new FormData();
    formData.append(field, selected);

    try {
      const response = await axios.post(`${API_ORIGIN}/api/auth/signup/${field}`, formData, {
        withCredentials: true,
        signal: controller.signal,
        onUploadProgress: (event) => {
          if (!event.total) return;
          const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
          setScan({ status: "scanning", phase: "uploading", progress });
          if (progress === 100) {
            setScan({ status: "scanning", phase: "verifying", progress: 100 });
          }
        },
      });
      if (controller.signal.aborted) return;
      const { documentToken, documentType, fields } = response.data;
      setScan({ status: "verified", documentType });
      onVerified({ documentToken, documentType, fields });
    } catch (error: unknown) {
      if (axios.isCancel(error) || controller.signal.aborted) return;
      const response = axios.isAxiosError<{ message?: string; reasons?: string[] }>(error)
        ? error.response?.data
        : undefined;
      setScan({
        status: "rejected",
        message:
          response?.message ||
          (error instanceof Error ? error.message : "We couldn't check your document. Please try again."),
        reasons: response?.reasons || [],
      });
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        Step 1: Upload your document
      </div>
      <p className="text-xs text-muted-foreground">
        Upload a PDF or DOCX resume up to 5 MB. DOCX files usually upload and process faster. Verification starts after the upload finishes.
      </p>

      <FileUpload label={label} accept={accept} file={file} onChange={handleChange} helpText={helpText} type={type} />

      {scan.status === "scanning" && (
        <div className="space-y-2" aria-live="polite">
          {scan.phase === "uploading" ? (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><Upload className="h-4 w-4" />Uploading resume…</span>
                <span>{scan.progress}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Resume upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={scan.progress}
              >
                <div
                  className="h-full bg-primary transition-[width] duration-200"
                  style={{ width: `${scan.progress}%` }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Upload complete. AI is checking your resume; this can take a little longer.
            </div>
          )}
        </div>
      )}

      {scan.status === "verified" && (
        <div className="flex items-start gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-700">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Verified{scan.documentType ? `: ${scan.documentType}` : ""}</p>
            <p className="text-xs">We filled in the form from your document. Please check the details below.</p>
          </div>
        </div>
      )}

      {scan.status === "rejected" && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">{scan.message}</p>
            {scan.reasons.length > 0 && (
              <ul className="list-disc pl-4 text-xs">
                {scan.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            <p className="text-xs">Remove the file and upload a clear, complete copy to try again.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentScanUpload;
