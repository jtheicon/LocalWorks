import { Document, model, Schema, Types } from "mongoose";

export interface ICompany extends Document {
  name: string;
  industry: Types.ObjectId;
  location: string;
  description: string;
  website: string;
  owner: string;
  photo: string;
}

const CompanySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    industry: {
      type: Types.ObjectId,
      ref: "Industry",
      required: true,
    },
    location: {
      type: String,
      default: "No Location Specified"
    },
    description: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
    owner: {
      type: String,
      default: ""
    },
    photo: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default model<ICompany>("Company", CompanySchema);