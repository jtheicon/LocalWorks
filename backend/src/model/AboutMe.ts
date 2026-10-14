import { Document, Schema, ObjectId, model } from "mongoose";

export interface IAboutMe extends Document {
  description: string,
  user: ObjectId
}

const AboutMeSchema: Schema = new Schema({
  description: { type: String, required: [true, "Description is required"] },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "User ID is required"] }
}, { timestamps: true })

export default model<IAboutMe>("AboutMe", AboutMeSchema)