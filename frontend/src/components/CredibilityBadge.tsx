import { API_ORIGIN } from "@/lib/apiOrigin";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Shield, ShieldAlert, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

axios.defaults.withCredentials = true;

// Mirrors Credibility in backend/src/services/credibility.ts
export interface CredibilityFactor {
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface Credibility {
  score: number;
  level: "High" | "Good" | "Fair" | "Low" | "New";
  factors: CredibilityFactor[];
}

// One batched request per list of ids; cached by react-query.
export const useCredibility = (role: "worker" | "employer", ids: (string | undefined)[]) => {
  const unique = [...new Set(ids.filter(Boolean) as string[])].sort();
  return useQuery<Record<string, Credibility>>({
    queryKey: ["credibility", role, unique],
    queryFn: async () =>
      (await axios.post(`${API_ORIGIN}/api/pro/credibility`, { role, ids: unique })).data.scores,
    enabled: unique.length > 0,
    staleTime: 60_000,
  });
};

// Level is always shown as icon + text, never color alone.
const LEVEL_STYLE: Record<Credibility["level"], { icon: typeof Shield; className: string }> = {
  High: { icon: ShieldCheck, className: "border-green-600/30 bg-green-600/10 text-green-700" },
  Good: { icon: ShieldCheck, className: "border-green-600/30 bg-green-600/5 text-green-700" },
  Fair: { icon: Shield, className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-700" },
  Low: { icon: ShieldAlert, className: "border-red-500/30 bg-red-500/10 text-red-700" },
  New: { icon: Sparkles, className: "border-border bg-muted text-muted-foreground" },
};

export const CredibilityBreakdown = ({ credibility }: { credibility: Credibility }) => (
  <div className="space-y-2 text-sm">
    {credibility.factors.map((f) => (
      <div key={f.label}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium text-foreground">{f.label}</span>
          <span className={`shrink-0 text-xs font-semibold ${f.points < 0 ? "text-red-700" : "text-foreground"}`}>
            {f.max > 0 ? `${f.points} / ${f.max}` : f.points}
          </span>
        </div>
        {f.max > 0 && (
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(Math.max(0, f.points) / f.max) * 100}%` }} />
          </div>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">{f.detail}</p>
      </div>
    ))}
  </div>
);

// Compact pill; click it to see how the score was calculated.
const CredibilityBadge = ({ credibility, subject }: { credibility?: Credibility; subject: string }) => {
  if (!credibility) return null;
  const { icon: Icon, className } = LEVEL_STYLE[credibility.level];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition-opacity hover:opacity-80 ${className}`}
          aria-label={`${subject} credibility ${credibility.score} out of 100, ${credibility.level}. Show details`}
        >
          <Icon className="h-3.5 w-3.5" />
          {credibility.score} · {credibility.level}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start" onClick={(e) => e.stopPropagation()}>
        <p className="font-semibold text-foreground">{subject} credibility: {credibility.score}/100</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Based on AI document verification and activity on LocalWorks.
        </p>
        <CredibilityBreakdown credibility={credibility} />
      </PopoverContent>
    </Popover>
  );
};

export default CredibilityBadge;
