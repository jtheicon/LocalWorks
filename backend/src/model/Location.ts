import { Document, Schema, model } from "mongoose"

export interface ILocation extends Document {
  name: string
}

const LocationSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, "Location is required"],
    unique: [true, "Location already exists"]
  }
}, { timestamps: true })

export default model<ILocation>("Location", LocationSchema)