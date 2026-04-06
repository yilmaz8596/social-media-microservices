import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

export const tryCatch = (fn: Function) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };
};
