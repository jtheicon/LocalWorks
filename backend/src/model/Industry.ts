import { Document, Schema, model } from "mongoose";

export interface IIndustry extends Document {
  title: string
}

const IndustrySchema: Schema = new Schema({
  title: { type: String, required: [true, "Industry is required"] },
  notAccepted: { type: Boolean, default: true }
}, { timestamps: true })

export default model<IIndustry>("Industry", IndustrySchema)