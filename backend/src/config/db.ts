import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string)
    console.log("Successfully Connected to MongoDB!")
  } catch (error) {
    console.error("Failed to connect to MongoDB!")
    process.exit(1)
  }
}

export default connectDB