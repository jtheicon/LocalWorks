import { Document, Schema, model } from "mongoose";

// Cached AI verdict on whether a worker skill covers a job skill (see services/jobMatching.ts),
// so each pair is only sent to Gemini once per prompt version.
export interface ISkillSimilarity extends Document {
  jobSkill: string,     // skillKey() of the job's required skill
  workerSkill: string,  // skillKey() of the worker's skill
  level: "equivalent" | "related" | "none",
  version: number,
  aiModel: string
}

const SkillSimilaritySchema: Schema = new Schema({
  jobSkill: { type: String, required: [true, "Job skill is required"] },
  workerSkill: { type: String, required: [true, "Worker skill is required"] },
  level: { type: String, enum: ["equivalent", "related", "none"], required: [true, "Level is required"] },
  version: { type: Number, required: [true, "Prompt version is required"] },
  aiModel: { type: String }
}, { timestamps: true })

SkillSimilaritySchema.index({ jobSkill: 1, workerSkill: 1, version: 1 }, { unique: true })

export default model<ISkillSimilarity>("SkillSimilarity", SkillSimilaritySchema)
