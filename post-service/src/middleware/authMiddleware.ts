import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { tryCatch } from "../utils/tryCatch";

export const authMiddleware = tryCatch(
  async (req: Request | any, res: Response, next: NextFunction) => {
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      logger.warn("Unauthorized access attempt without user ID");
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    req.user = { userId };
    logger.info("Authenticated request from user ID: %s", userId);
    next();
  },
);
