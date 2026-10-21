// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { compareSkills, scoreJob, skillKey, stemWord, unresolvedSkills, Judge } from "./skillScore";

test("skillKey ignores case, punctuation, extra spaces and accents", () => {
  assert.equal(skillKey("  Electrical-Wiring!! "), "electrical wiring");
  assert.equal(skillKey("Niño"), "nino");
  assert.equal(skillKey(""), "");
});

test("stemWord maps trade nouns and activities to the same stem", () => {
  const same = [["plumbing", "plumber"], ["electrician", "electrical"], ["carpentry", "carpenter"], ["welding", "welder"], ["gardening", "gardener"]];
  for (const [a, b] of same) assert.equal(stemWord(a), stemWord(b), `${a} / ${b}`);
  assert.equal(stemWord("cook"), "cook"); // short words stay intact
});

test("compareSkills matches different wording of the same skill", () => {
  assert.equal(compareSkills("Plumbing", "plumbing"), "exact");
  assert.equal(compareSkills("Electrical-Wiring", "electrical wiring"), "exact");
  assert.equal(compareSkills("Plumbing", "Plumber"), "wording");
  assert.equal(compareSkills("Masonry", "Mason"), "wording");
  assert.equal(compareSkills("Electrician", "Electrican"), "wording"); // typo
  assert.equal(compareSkills("Driving", "Truck Driving"), "wording");  // worker's skill covers it
  assert.equal(compareSkills("Electrical Wiring", "Electrical"), "partial");
});

test("compareSkills does not match unrelated look-alike skills", () => {
  const different = [["Painting", "Printing"], ["Welding", "Wedding"], ["Cooking", "Coding"], ["Electrician", "Electronics"], ["Cleaning", "Learning"], ["Customer Service", "Service Crew"]];
  for (const [a, b] of different) assert.equal(compareSkills(a, b), null, `${a} / ${b}`);
});

test("scoreJob averages credit over the job's required skills", () => {
  assert.equal(scoreJob(["Plumbing", "Carpentry"], ["Plumbing", "Carpentry"]).score, 100);
  assert.equal(scoreJob(["Plumbing", "Carpentry"], ["Plumber"]).score, 50);
  assert.equal(scoreJob(["Electrical Wiring"], ["Electrical"]).score, 50);
  assert.equal(scoreJob(["Plumbing"], []).score, 0);
});

test("scoreJob reports matched and missing skills in their original wording", () => {
  const result = scoreJob(["Plumbing", "Tile Setting"], ["plumber"]);
  assert.deepEqual(result.missing, ["Tile Setting"]);
  assert.equal(result.matched[0].jobSkill, "Plumbing");
  assert.equal(result.matched[0].workerSkill, "plumber");
});

test("scoreJob ignores duplicate and empty skills", () => {
  assert.equal(scoreJob(["Plumbing", "plumbing", " ", ""], ["Plumbing"]).score, 100);
  assert.equal(scoreJob(["Plumbing", "Carpentry", "carpentry"], ["Plumbing"]).score, 50);
});

test("scoreJob returns null for a job with no skills instead of 0%", () => {
  assert.equal(scoreJob([], ["Plumbing"]).score, null);
});

test("AI verdicts add credit the rules can't find", () => {
  const judge: Judge = (job, worker) =>
    job === "carpentry" && worker === "karpintero" ? "equivalent"
      : job === "furniture assembly" && worker === "karpintero" ? "related"
        : undefined;

  const rulesOnly = scoreJob(["Carpentry", "Furniture Assembly"], ["Karpintero"]);
  const withAi = scoreJob(["Carpentry", "Furniture Assembly"], ["Karpintero"], judge);
  assert.equal(rulesOnly.score, 0);
  assert.equal(withAi.score, 75);
  assert.deepEqual(withAi.matched.map((m) => m.method), ["ai-equivalent", "ai-related"]);
});

test("AI verdicts never lower a rule match", () => {
  const judge: Judge = () => "none";
  assert.equal(scoreJob(["Plumbing"], ["Plumber"], judge).score, 100);
});

test("unresolvedSkills only lists skills the rules can't fully match", () => {
  assert.deepEqual(unresolvedSkills(["Plumbing", "Electrical Wiring", "Carpentry"], ["Plumber", "Electrical"]), ["Electrical Wiring", "Carpentry"]);
});
