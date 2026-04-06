import mongoose from "mongoose";
import logger from "../utils/logger";
import dotenv from "dotenv";

dotenv.config();

export const connectDb = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    logger.info("Connected to MongoDB successfully");
  } catch (error) {
    logger.error("Error connecting to MongoDB: %s", error);
    throw error;
  }
};
