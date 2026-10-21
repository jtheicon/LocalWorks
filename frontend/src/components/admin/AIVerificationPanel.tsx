import { Bot, CheckCircle2, AlertTriangle, CircleSlash } from "lucide-react";

// Mirrors VerificationResult in backend/src/ai/verification.ts
export interface AIVerification {
  method: "ai" | "unavailable";
  decision: "approve" | "needs_review";
  confidence: number;
  reasons: string[];
  details?: Record<string, unknown>;
  checkedAt: string;
}

const DETAIL_LABELS: Record<string, string> = {
  document_type: "Document type",
  name_on_document: "Name on document",
  name_matches: "Name matches",
  registration_number: "Registration no.",
  expiry_date: "Expiry date",
};

const AIVerificationPanel = ({ verification }: { verification?: AIVerification | null }) => {
  if (!verification) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Bot className="h-4 w-4" />
        No automated check on record (registered before AI verification was enabled).
      </div>
    );
  }

  const approved = verification.decision === "approve";
  const unavailable = verification.method === "unavailable";
  const Icon = approved ? CheckCircle2 : unavailable ? CircleSlash : AlertTriangle;
  const tone = approved
    ? "border-green-500/30 bg-green-500/5 text-green-700"
    : "border-yellow-500/30 bg-yellow-500/5 text-yellow-700";

  const details = Object.entries(verification.details ?? {}).filter(
    ([key, value]) => DETAIL_LABELS[key] && value !== "" && value != null
  );

  return (
    <div className={`space-y-2 rounded-lg border p-3 text-sm ${tone}`}>
      <div className="flex flex-wrap items-center gap-2 font-semibold">
        <Icon className="h-4 w-4" />
        {approved
          ? "Auto-approved by AI"
          : unavailable
          ? "AI check unavailable - manual review needed"
          : "Flagged by AI - manual review needed"}
        {verification.method === "ai" && (
          <span className="font-normal opacity-80">
            ({Math.round(verification.confidence * 100)}% confidence)
          </span>
        )}
      </div>

      {details.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-foreground sm:grid-cols-2">
          {details.map(([key, value]) => (
            <div key={key} className="flex gap-1">
              <dt className="text-muted-foreground">{DETAIL_LABELS[key]}:</dt>
              <dd className="font-medium">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</dd>
            </div>
          ))}
        </dl>
      )}

      {verification.reasons.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-foreground">
          {verification.reasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Checked {new Date(verification.checkedAt).toLocaleString()}
      </p>
    </div>
  );
};

export default AIVerificationPanel;
