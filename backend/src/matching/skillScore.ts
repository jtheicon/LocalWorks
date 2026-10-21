// Skill-based job matching (pure functions, no database or AI calls).
//
// Each skill a job requires earns credit (0-1) from the worker's closest skill, and the
// job's match score is the average credit x 100. Rules here handle wording differences
// ("Plumber" / "plumbing", "Electrical Wiring" / "electrical", typos). Synonyms and related
// trades the rules can't know ("Karpintero" / "Carpentry") come from the AI judge in
// services/jobMatching.ts, passed in as `judge`.
import stringComparison from "string-comparison";

const levenshtein = stringComparison.levenshtein;

export type MatchMethod = "exact" | "wording" | "partial" | "ai-equivalent" | "ai-related";

export const CREDIT: Record<MatchMethod, number> = {
  exact: 1,
  wording: 1,
  partial: 0.5,          // worker has a broader/narrower part of it, e.g. "Electrical" for "Electrical Wiring"
  "ai-equivalent": 1,
  "ai-related": 0.5,
};

// Score at or above which a job is shown as recommended (kept in sync with the frontend).
export const RECOMMENDED_SCORE = 50;

export interface SkillMatch {
  jobSkill: string;
  workerSkill: string;
  credit: number;
  method: MatchMethod;
}

export interface JobMatch {
  score: number | null; // null when the job lists no skills
  matched: SkillMatch[];
  missing: string[];
}

export type AiLevel = "equivalent" | "related" | "none";
// Looks up the AI's verdict for a (job skill key, worker skill key) pair, if any.
export type Judge = (jobKey: string, workerKey: string) => AiLevel | undefined;

/* -------------------------------------------------------------------------- */
/*                                Normalizing                                 */
/* -------------------------------------------------------------------------- */

// "  Electrical-Wiring!! " -> "electrical wiring"
export const skillKey = (skill: string) =>
  (skill || "")
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "") // ñ -> n, é -> e
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const STOPWORDS = new Set(["and", "or", "of", "the", "in", "for", "with", "a", "an", "at", "to"]);

// Ordered longest-first; a stem must keep at least 4 letters so short words stay intact.
const SUFFIXES = ["ings", "ians", "ists", "ing", "ian", "ist", "ers", "ant", "ry", "er", "al", "s", "e"];

// plumbing / plumber -> plumb, electrician / electrical -> electric, carpentry / carpenter -> carpent
export const stemWord = (word: string) => {
  let w = word;
  for (let changed = true; changed;) {
    changed = false;
    for (const suffix of SUFFIXES) {
      if (w.endsWith(suffix) && w.length - suffix.length >= 4) {
        w = w.slice(0, -suffix.length);
        changed = true;
        break;
      }
    }
  }
  return w;
};

const stems = (key: string) => key.split(" ").filter((w) => w && !STOPWORDS.has(w)).map(stemWord);

/* -------------------------------------------------------------------------- */
/*                                  Scoring                                   */
/* -------------------------------------------------------------------------- */

// Rule-based comparison of one required skill with one worker skill.
export const compareSkills = (jobSkill: string, workerSkill: string): MatchMethod | null => {
  const a = skillKey(jobSkill);
  const b = skillKey(workerSkill);
  if (!a || !b) return null;
  if (a.replace(/ /g, "") === b.replace(/ /g, "")) return "exact";

  const jobStems = stems(a);
  const workerStems = stems(b);
  if (!jobStems.length || !workerStems.length) return null;
  if (jobStems.join(" ") === workerStems.join(" ")) return "wording";

  // A missing or extra letter ("electrican"), in long words only. Swapped letters are left
  // to the AI, since they often make another real word ("painting" / "printing").
  const ca = a.replace(/ /g, "");
  const cb = b.replace(/ /g, "");
  if (Math.min(ca.length, cb.length) >= 8 && Math.abs(ca.length - cb.length) === 1 && levenshtein.distance(ca, cb) === 1) return "wording";

  // Worker's skill covers every word of the requirement ("Truck Driving" for "Driving").
  if (jobStems.every((s) => workerStems.includes(s))) return "wording";
  // Worker has only part of it ("Electrical" for "Electrical Wiring").
  if (workerStems.every((s) => jobStems.includes(s))) return "partial";

  return null;
};

const fromAi = (level: AiLevel | undefined): MatchMethod | null =>
  level === "equivalent" ? "ai-equivalent" : level === "related" ? "ai-related" : null;

// Unique, non-empty skills in their original wording.
export const uniqueSkills = (skills: string[]) => {
  const seen = new Set<string>();
  return (skills || []).filter((s) => {
    const key = skillKey(s);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const bestMatch = (jobSkill: string, workerSkills: string[], judge?: Judge): SkillMatch | null => {
  let best: SkillMatch | null = null;
  for (const workerSkill of workerSkills) {
    const ruled = compareSkills(jobSkill, workerSkill);
    const judged = fromAi(judge?.(skillKey(jobSkill), skillKey(workerSkill)));
    for (const method of [ruled, judged]) {
      if (method && (!best || CREDIT[method] > best.credit)) {
        best = { jobSkill, workerSkill, credit: CREDIT[method], method };
      }
    }
  }
  return best;
};

// Required skills no rule fully matches; only these are worth asking the AI about.
export const unresolvedSkills = (jobSkills: string[], workerSkills: string[]) =>
  uniqueSkills(jobSkills).filter((s) => (bestMatch(s, uniqueSkills(workerSkills))?.credit ?? 0) < 1);

export const scoreJob = (jobSkills: string[], workerSkills: string[], judge?: Judge): JobMatch => {
  const required = uniqueSkills(jobSkills);
  const worker = uniqueSkills(workerSkills);
  if (!required.length) return { score: null, matched: [], missing: [] };

  const matched: SkillMatch[] = [];
  const missing: string[] = [];
  for (const skill of required) {
    const best = bestMatch(skill, worker, judge);
    if (best) matched.push(best);
    else missing.push(skill);
  }

  const total = matched.reduce((sum, m) => sum + m.credit, 0);
  return { score: Math.round((total / required.length) * 100), matched, missing };
};
