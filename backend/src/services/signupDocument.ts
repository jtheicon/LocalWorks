// Sign-up documents (worker resume / employer business permit) are checked by AI when they
// are uploaded, before the rest of the form is filled in. The result is handed back to the
// browser as a signed token, so the register endpoint can trust it without a second AI call
// and without letting the client claim its own verdict.
import jwt from "jsonwebtoken";
import stringComparison from "string-comparison";
import type { VerificationResult } from "../ai/verification";

export type SignupDocumentKind = "resume" | "permit";

interface SignupDocumentPayload {
  typ: "signup-document";
  kind: SignupDocumentKind;
  filename: string;
  // Person or business name printed on the document; the registered name must match it.
  name: string;
  verification: VerificationResult;
}

const TOKEN_TTL = "1h"; // time to finish the form after uploading

export class SignupDocumentError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const issueSignupDocumentToken = (kind: SignupDocumentKind, filename: string, name: string, verification: VerificationResult) =>
  jwt.sign({ typ: "signup-document", kind, filename, name, verification } satisfies SignupDocumentPayload, process.env.JWT_SECRET as string, { expiresIn: TOKEN_TTL });

export const readSignupDocumentToken = (token: unknown, kind: SignupDocumentKind): SignupDocumentPayload => {
  const label = kind === "resume" ? "resume" : "business permit";
  if (typeof token !== "string" || !token) {
    throw new SignupDocumentError(`Please upload your ${label} first.`);
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as SignupDocumentPayload;
    if (payload.typ !== "signup-document" || payload.kind !== kind || payload.verification?.decision !== "approve") {
      throw new Error("mismatch");
    }
    return payload;
  } catch {
    throw new SignupDocumentError(`Your ${label} check has expired. Please upload it again.`);
  }
};

/* -------------------------------------------------------------------------- */
/*                                 Name check                                 */
/* -------------------------------------------------------------------------- */

const jaro = stringComparison.jaroWinkler;

const COMPANY_SUFFIXES = new Set([
  "inc", "incorporated", "corp", "corporation", "co", "company", "ltd", "llc", "opc",
  "enterprise", "enterprises", "trading", "the",
]);

// "Peña, Juan D." -> ["pena", "juan", "d"]
const tokens = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);

// Tolerates reordering ("Dela Cruz Juan"), missing middle names, accents and company suffixes.
export const namesMatch = (entered: string, onDocument: string, kind: SignupDocumentKind) => {
  const clean = (s: string) => kind === "permit" ? tokens(s).filter((t) => !COMPANY_SUFFIXES.has(t)) : tokens(s);
  const a = clean(entered);
  const b = clean(onDocument);
  if (!a.length || !b.length) return false;

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.every((t) => longer.includes(t))) return true;

  return jaro.similarity([...a].sort().join(" "), [...b].sort().join(" ")) >= 0.9;
};
