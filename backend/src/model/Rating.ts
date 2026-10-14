import { Document, Schema, model } from "mongoose";

export interface IRating extends Document {
  rating: Number,
  worker: string,
  description: string
}

const RatingSchema: Schema = new Schema({
  rating: { type: Number },
  worker: { type: Schema.Types.ObjectId, ref: 'Worker', required: [true, "Worker is required"] },
  description: { type: String, required: [true, "Description is required"] }
})

export default model<IRating>("Rating", RatingSchema)