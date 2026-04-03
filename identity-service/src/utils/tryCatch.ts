import { NextFunction, Request, Response } from "express";
import logger from "./logger";

export const tryCatch = async (fn: Function): Promise<void> => {
  try {
    return await fn((req: Request, res: Response, next: NextFunction) => {
      logger.error("Error in tryCatch wrapper");
      next();
    });
  } catch (error) {
    logger.error(error);
    throw error;
  }
};
