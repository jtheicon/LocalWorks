import { Document, Schema, Types, model, ObjectId } from "mongoose";

export interface IResponse extends Document {
  job: Types.ObjectId,
  application: Types.ObjectId,
  jobCreated: Date,
  createdAt: Date
}

const ResponseSchema = new Schema({
  job: {
    type: Schema.Types.ObjectId,
    required: true
  },

  application: {
    type: Schema.Types.ObjectId,
    required: true
  },

  jobCreated: {
    type: Date,
    required: true
  }
}, { timestamps: true })

export const ResponseModel = model<IResponse>(
  "Response", ResponseSchema
)