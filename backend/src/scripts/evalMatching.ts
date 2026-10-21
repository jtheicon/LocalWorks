// Measures job-matching quality on the hand-labeled cases in matching/evalCases.ts.
//
//   npm run eval:matching              rules + AI (needs GEMINI_API_KEY)
//   npm run eval:matching -- --rules   rules only, no AI calls
//
// A job counts as "recommended" when its score reaches RECOMMENDED_SCORE. Precision is the
// share of recommended jobs that were labeled relevant; recall is the share of relevant jobs
// that were recommended. No database needed: AI verdicts are fetched fresh, not cached.
import { EVAL_CASES } from "../matching/evalCases";
import { RECOMMENDED_SCORE, scoreJob, unresolvedSkills } from "../matching/skillScore";
import { judgeSkills, pairKey } from "../ai/skillMatching";
import { describeError, MODEL } from "../ai/verification";
import { ApiError } from "@google/genai";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The free tier allows only a few requests per minute and is sometimes overloaded:
// space the calls out and retry busy/rate-limited ones.
const judgeWithRetry = async (jobSkills: string[], workerSkills: string[]) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await judgeSkills(jobSkills, workerSkills);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      if (attempt >= 4 || (status !== 429 && status !== 503)) throw error;
      const delay = 15_000 * attempt;
      console.log(`  (AI busy, error ${status}; retrying in ${delay / 1000}s)`);
      await sleep(delay);
    }
  }
};

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "n/a");

const summarize = (label: string, results: { relevant: boolean; recommended: boolean }[]) => {
  const tp = results.filter((r) => r.relevant && r.recommended).length;
  const fp = results.filter((r) => !r.relevant && r.recommended).length;
  const fn = results.filter((r) => r.relevant && !r.recommended).length;
  const correct = results.filter((r) => r.relevant === r.recommended).length;
  console.log(`${label.padEnd(12)} accuracy ${pct(correct, results.length).padStart(4)}   precision ${pct(tp, tp + fp).padStart(4)}   recall ${pct(tp, tp + fn).padStart(4)}`);
};

const main = async () => {
  const useAi = !process.argv.includes("--rules") && Boolean(process.env.GEMINI_API_KEY);
  if (!useAi) console.log(process.env.GEMINI_API_KEY ? "Rules only (--rules)." : "GEMINI_API_KEY not set: rules only.");
  else console.log(`Using AI model ${MODEL}.`);

  const rules: { relevant: boolean; recommended: boolean }[] = [];
  const withAi: { relevant: boolean; recommended: boolean }[] = [];

  console.log(`\n${"worker".padEnd(28)}${"job".padEnd(38)}label  rules${useAi ? "    AI" : ""}`);
  for (const c of EVAL_CASES) {
    const ruleScore = scoreJob(c.job, c.worker).score ?? 0;
    rules.push({ relevant: c.relevant, recommended: ruleScore >= RECOMMENDED_SCORE });

    let aiCol = "";
    if (useAi) {
      try {
        const unresolved = unresolvedSkills(c.job, c.worker);
        const verdicts = await judgeWithRetry(unresolved, c.worker);
        if (unresolved.length) await sleep(4_000);
        const aiScore = scoreJob(c.job, c.worker, (j, w) => verdicts.get(pairKey(j, w))).score ?? 0;
        withAi.push({ relevant: c.relevant, recommended: aiScore >= RECOMMENDED_SCORE });
        aiCol = `${aiScore}`.padStart(6);
      } catch (error) {
        aiCol = "  error";
        console.error(`  AI failed: ${describeError(error)}`);
      }
    }

    const mark = (score: number) => ((score >= RECOMMENDED_SCORE) === c.relevant ? " " : "✗");
    console.log(
      `${c.worker.join(", ").slice(0, 26).padEnd(28)}${c.job.join(", ").slice(0, 36).padEnd(38)}${(c.relevant ? "yes" : "no").padEnd(5)}${`${ruleScore}`.padStart(6)}${mark(ruleScore)}${aiCol}${aiCol && !aiCol.includes("error") ? mark(Number(aiCol)) : ""}`,
    );
  }

  console.log(`\n${EVAL_CASES.length} cases, recommended at score >= ${RECOMMENDED_SCORE}. ✗ = disagrees with the label.\n`);
  summarize("Rules", rules);
  if (useAi) summarize("Rules + AI", withAi);
  if (useAi && withAi.length < EVAL_CASES.length) console.log(`(AI failed on ${EVAL_CASES.length - withAi.length} case(s); those are left out of its numbers.)`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
