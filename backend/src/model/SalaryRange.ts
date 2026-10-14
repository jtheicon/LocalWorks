import { Document, Schema, ObjectId, model } from "mongoose"

export interface ISalaryRange extends Document {
  name: string,
  hourlyRate: Number,
  user: ObjectId
}

const SalaryRangeSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, "Salary Range is Required"],
    unique: [true, "Salary Range must be unique"]
  },
  hourlyRate: {
    type: Number,
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    required: true
  }
}, { timestamps: true })

export default model<ISalaryRange>("Salary Range", SalaryRangeSchema)