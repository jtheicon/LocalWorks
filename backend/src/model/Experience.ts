import { Document, Schema, ObjectId, model } from "mongoose";

export interface IExperience extends Document {
  title: string,
  noOfYears: Number,
  user: ObjectId
}

const ExperienceSchema: Schema = new Schema({
  title: { type: String, required: [true, "Experience title is required" ]},
  noOfYears: { type: Number },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "User ID is required"] }
}, { timestamps: true })

export default model<IExperience>("Experience", ExperienceSchema)