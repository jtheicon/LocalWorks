import { useState } from "react";
import { Loader2, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";
import FileUpload from "./FileUpload";
import axios from "axios";

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
  | { status: "scanning" }
  | { status: "verified"; documentType: string }
  | { status: "rejected"; message: string; reasons: string[] };

// Step 1 of sign-up: the document is uploaded first, checked by AI, and its details are
// used to pre-fill the rest of the form.
const DocumentScanUpload = <F,>({ label, accept, helpText, type, field, onVerified, onCleared }: DocumentScanUploadProps<F>) => {
  const [file, setFile] = useState<File | null>(null);
  const [scan, setScan] = useState<ScanState>({ status: "idle" });

  const handleChange = async (selected: File | null) => {
    setFile(selected);
    onCleared();

    if (!selected) {
      setScan({ status: "idle" });
      return;
    }

    setScan({ status: "scanning" });

    const formData = new FormData();
    formData.append(field, selected);

    try {
      const response = await axios.post(`http://localhost:8920/api/auth/signup/${field}`, formData, {
        withCredentials: true,
      });
      const { documentToken, documentType, fields } = response.data;
      setScan({ status: "verified", documentType });
      onVerified({ documentToken, documentType, fields });
    } catch (error: any) {
      setScan({
        status: "rejected",
        message: error?.response?.data?.message || "We couldn't check your document. Please try again.",
        reasons: error?.response?.data?.reasons || [],
      });
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        Step 1: Upload your document
      </div>
      <p className="text-xs text-muted-foreground">
        Our AI verifies it and fills in the form for you. Your account is activated right away once it is verified.
      </p>

      <FileUpload label={label} accept={accept} file={file} onChange={handleChange} helpText={helpText} type={type} />

      {scan.status === "scanning" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verifying your document and reading your details...
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
