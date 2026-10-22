// AI-assisted job matching for workers (scoring rules live in matching/skillScore.ts).
//
// Rules match skills worded differently ("Plumber" / "Plumbing"). Required skills the rules
// can't fully match are sent to Gemini once per (job skill, worker skill) pair, and the
// verdicts are cached in SkillSimilarity, so later page loads need no AI call. If the AI is
// off, slow or failing, matching still works on the rules alone.
import SkillSimilarity from "../model/SkillSimilarity";
import { judgeSkills, pairKey, SKILL_PROMPT_VERSION } from "../ai/skillMatching";
import { MODEL, describeError } from "../ai/verification";
import { AiLevel, JobMatch, scoreJob, skillKey, uniqueSkills, unresolvedSkills } from "../matching/skillScore";

// The job list waits this long for new AI verdicts; a slower call still finishes and is cached.
const AI_WAIT_MS = Math.min(
  8000,
  Math.max(0, Number(process.env.AI_JOB_MATCH_WAIT_MS) || 2500),
);
const AI_BATCH = 60; // job skills per Gemini call

// "on": AI verdicts used; "off": AI disabled or not needed; "unavailable": AI failed or is still working.
export type AiStatus = "on" | "off" | "unavailable";

export const aiMatchingEnabled = () => Boolean(process.env.GEMINI_API_KEY) && process.env.AI_JOB_MATCHING !== "off";

const wait = (ms: number) => new Promise<false>((resolve) => setTimeout(() => resolve(false), ms).unref());

const loadCached = async (jobKeys: string[], workerKeys: string[]) => {
  const rows = await SkillSimilarity.find({
    jobSkill: { $in: jobKeys },
    workerSkill: { $in: workerKeys },
    version: SKILL_PROMPT_VERSION,
  }).lean();
  return new Map<string, AiLevel>(rows.map((r) => [pairKey(r.jobSkill, r.workerSkill), r.level]));
};

// Same question asked twice at once (e.g. a quick page refresh) shares one Gemini call.
const inFlight = new Map<string, Promise<void>>();

const judgeAndCache = (jobSkills: string[], workerSkills: string[]) => {
  const id = `${jobSkills.map(skillKey).sort()}|${workerSkills.map(skillKey).sort()}`;
  let pending = inFlight.get(id);
  if (!pending) {
    pending = (async () => {
      for (let i = 0; i < jobSkills.length; i += AI_BATCH) {
        const verdicts = await judgeSkills(jobSkills.slice(i, i + AI_BATCH), workerSkills);
        await SkillSimilarity.bulkWrite([...verdicts].map(([key, level]) => {
          const [jobSkill, workerSkill] = key.split("|");
          return {
            updateOne: {
              filter: { jobSkill, workerSkill, version: SKILL_PROMPT_VERSION },
              update: { $set: { level, aiModel: MODEL } },
              upsert: true,
            },
          };
        }));
      }
    })().finally(() => inFlight.delete(id));
    inFlight.set(id, pending);
  }
  return pending;
};

// Scores every job against the worker's skills. Never throws because of the AI.
export const matchJobsForWorker = async (
  workerSkills: string[],
  jobs: { id: string; skills: string[] }[],
): Promise<{ ai: AiStatus; matches: Map<string, JobMatch> }> => {
  const worker = uniqueSkills(workerSkills);
  let verdicts = new Map<string, AiLevel>();
  let ai: AiStatus = "off";

  const unresolved = worker.length ? uniqueSkills(jobs.flatMap((j) => unresolvedSkills(j.skills, worker))) : [];
  if (aiMatchingEnabled() && unresolved.length) {
    const jobKeys = unresolved.map(skillKey);
    const workerKeys = worker.map(skillKey);
    const isJudged = () => jobKeys.every((j) => workerKeys.every((w) => verdicts.has(pairKey(j, w))));
    try {
      verdicts = await loadCached(jobKeys, workerKeys);
      if (!isJudged()) {
        const unasked = unresolved.filter((s) => workerKeys.some((w) => !verdicts.has(pairKey(skillKey(s), w))));
        const judged = judgeAndCache(unasked, worker);
        judged.catch((error) => console.error("[ai] skill matching:", describeError(error)));
        if (await Promise.race([judged.then(() => true, () => false), wait(AI_WAIT_MS)])) {
          verdicts = await loadCached(jobKeys, workerKeys);
        }
      }
      ai = isJudged() ? "on" : "unavailable";
    } catch (error) {
      console.error("[ai] skill matching cache:", error);
      ai = "unavailable";
    }
  }

  const judge = (jobKey: string, workerKey: string) => verdicts.get(pairKey(jobKey, workerKey));
  const matches = new Map(jobs.map((j) => [j.id, scoreJob(j.skills, worker, judge)]));
  return { ai, matches };
};
