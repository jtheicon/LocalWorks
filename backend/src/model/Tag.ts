import { Document, Schema, ObjectId, model } from "mongoose";

export interface ITag extends Document {
  title: string
}

const TagSchema: Schema = new Schema({
  title: { type: String, required: [true, "Tag is required"], unique: [true, "Tag already exists"] }
}, { timestamps: true })

export default model<ITag>("Tag", TagSchema)