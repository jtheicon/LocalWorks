import { Schema, ObjectId, model } from "mongoose";

export interface IProof extends Document {
  document: string,
  worker: ObjectId
}

const ProofSchema: Schema = new Schema({
  document: { type: String, default: "" },
  worker: { type: Schema.Types.ObjectId, required: [true, "Worker ID is required"] }
})

export default model<IProof>("Proof", ProofSchema)