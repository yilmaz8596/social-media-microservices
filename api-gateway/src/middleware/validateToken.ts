import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

export const validateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = decoded;
    next();
  } catch (error) {
    logger.error("Error validating token: %s", error);
    res.status(401).json({ success: false, error: "Unauthorized" });
  }
};
