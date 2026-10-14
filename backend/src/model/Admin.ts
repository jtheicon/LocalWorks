import { Document, Schema, model } from "mongoose";

export interface IAdmin extends Document {
  name: string,
  email: string,
  password: string,
  role: string,
  avatar: string
}

const AdminSchema: Schema = new Schema({
  name: { type: String, required: [true, "Name is required"], unique: [true, "Name already exists"] },
  email: { type: String, required: [true, "Email is required"], unique: [true, "Email must be unique"] },
  password: { type: String, required: [true, "Password is required"] },
  role: { type: String, enum: ["admin"], default: "admin" },
  avatar: { type: String, required: [true, "Avatar must be a string"], default: "default.jpg" }
})

export default model<IAdmin>("Admin", AdminSchema)