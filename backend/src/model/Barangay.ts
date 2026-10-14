import { Document, Schema, ObjectId, model } from "mongoose";

export interface IBarangay extends Document {
  user: ObjectId,
  name: string
}

const BarangaySchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, required: [true, "User ID is Required"] },
  name: { type: String, required: [true, "Barangay Name is required"] }
}, { timestamps: true })

export default model<IBarangay>("Barangay", BarangaySchema)