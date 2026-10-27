import { useEffect, useRef, useState } from "react";
import { ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";
import FileUpload from "./FileUpload";
import axios from "axios";
import { API_ORIGIN } from "@/lib/apiOrigin";
import { Progress } from "@/components/ui/progress";
import {
  aiSimulatedProgress,
  scanStageLabel,
  uploadProgressPercent,
} from "@/lib/documentScanProgress";
import { pollSignupDocumentScan } from "@/lib/signupDocumentPoll";
import { getSignupUploadLimits } from "@/lib/signupUploadLimits";

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

const ScanProgressBar = ({
  progress,
  field,
  phase,
}: {
  progress: number;
  field: "resume" | "permit";
  phase: "uploading" | "verifying";
}) => (
  <div className="space-y-2" aria-live="polite">
    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>{scanStageLabel(progress, field)}</span>
      <span className="tabular-nums font-medium text-foreground">{progress}%</span>
    </div>
    <Progress
      value={progress}
      className="h-2 bg-muted"
      aria-label={phase === "uploading" ? "Document upload progress" : "AI document review progress"}
    />
    {phase === "verifying" && progress < 100 && (
      <p className="text-[11px] text-muted-foreground">
        AI review usually takes 15–60 seconds (longer for large PDFs). Progress slows near the end
        while the model finishes; you can keep this page open.
      </p>
    )}
  </div>
);

// Step 1 of sign-up: the document is uploaded first, checked by AI, and its details are
// used to pre-fill the rest of the form.
const DocumentScanUpload = <F,>({ label, accept, helpText, type, field, onVerified, onCleared }: DocumentScanUploadProps<F>) => {
  const [file, setFile] = useState<File | null>(null);
  const [scan, setScan] = useState<ScanState>({ status: "idle" });
  const [maxBytes, setMaxBytes] = useState(5 * 1024 * 1024);
  const [maxSizeLabel, setMaxSizeLabel] = useState("5 MB");
  const activeRequest = useRef<AbortController | null>(null);
  const aiProgressStart = useRef<number | null>(null);

  useEffect(() => {
    getSignupUploadLimits().then(({ maxBytes: bytes, label }) => {
      setMaxBytes(bytes);
      setMaxSizeLabel(label);
    });
  }, []);

  useEffect(() => {
    if (scan.status !== "scanning" || scan.phase !== "verifying") {
      aiProgressStart.current = null;
      return;
    }
    if (aiProgressStart.current == null) aiProgressStart.current = Date.now();

    const tick = () => {
      const started = aiProgressStart.current;
      if (started == null) return;
      const next = aiSimulatedProgress(Date.now() - started);
      setScan((prev) => {
        if (prev.status !== "scanning" || prev.phase !== "verifying") return prev;
        return next > prev.progress ? { ...prev, progress: next } : prev;
      });
    };

    tick();
    const id = window.setInterval(tick, 450);
    return () => window.clearInterval(id);
  }, [scan.status, scan.phase]);

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
    if (selected.size > maxBytes) {
      setScan({
        status: "rejected",
        message: `The file is too large. Maximum upload size is ${maxSizeLabel}.`,
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
        validateStatus: (s) => s === 202 || s === 200,
        onUploadProgress: (event) => {
          if (!event.total) return;
          const progress = uploadProgressPercent(event.loaded, event.total);
          const done = event.loaded >= event.total;
          setScan({
            status: "scanning",
            phase: done ? "verifying" : "uploading",
            progress: done ? uploadProgressPercent(event.total, event.total) : progress,
          });
        },
      });
      if (controller.signal.aborted) return;

      setScan({ status: "scanning", phase: "verifying", progress: uploadProgressPercent(1, 1) });

      let documentToken: string;
      let documentType: string;
      let fields: F;

      const scanId = response.data?.scanId as string | undefined;
      if (response.status === 202 && scanId) {
        const result = await pollSignupDocumentScan<F>(scanId, controller.signal);
        documentToken = result.documentToken;
        documentType = result.documentType;
        fields = result.fields;
      } else {
        ({ documentToken, documentType, fields } = response.data);
      }

      if (controller.signal.aborted) return;
      setScan({ status: "scanning", phase: "verifying", progress: 100 });
      setScan({ status: "verified", documentType });
      onVerified({ documentToken, documentType, fields });
    } catch (error: unknown) {
      if (axios.isCancel(error) || controller.signal.aborted) return;
      const response = axios.isAxiosError<{ message?: string; reasons?: string[] }>(error)
        ? error.response?.data
        : undefined;
      const rejection = error as Error & { reasons?: string[]; isSignupRejection?: boolean };
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      let message =
        response?.message ||
        rejection.message ||
        "We couldn't check your document. Please try again.";
      if (status === 504) {
        message =
          "The server timed out before the review finished. Try DOCX or a smaller PDF, then upload again.";
      }
      setScan({
        status: "rejected",
        message,
        reasons: response?.reasons || rejection.reasons || [],
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
        {field === "resume"
          ? `Upload a PDF or DOCX resume up to ${maxSizeLabel}. DOCX files usually upload and process faster.`
          : `Upload a clear PDF or image of your business permit (max ${maxSizeLabel}).`}{" "}
        You will see upload and AI review progress below.
      </p>

      <FileUpload
        label={label}
        accept={accept}
        file={file}
        onChange={handleChange}
        helpText={`${helpText} Maximum file size: ${maxSizeLabel}.`}
        type={type}
      />

      {scan.status === "scanning" && (
        <ScanProgressBar progress={scan.progress} field={field} phase={scan.phase} />
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
