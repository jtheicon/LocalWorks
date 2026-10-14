import { Document, Schema, model } from "mongoose";

export interface ICategory extends Document {
  name: string
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: [true, "Category is required"], unique: [true, "Category is already exists"] }
}, { timestamps: true })

const Category = model<ICategory>("Categorie", CategorySchema)

export default Category