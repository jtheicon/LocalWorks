import { Document, Schema, model } from "mongoose";

export interface ISkill extends Document {
  title: string
}

const SkillSchema: Schema = new Schema({
  title: { type: String, required: [true, "Skill title is required"] }
}, { timestamps: true })

export default model<ISkill>("Skill", SkillSchema)