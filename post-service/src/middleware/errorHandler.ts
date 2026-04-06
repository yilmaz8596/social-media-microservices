import { tryCatch } from "../utils/tryCatch";
import logger from "../utils/logger";

export const errorHandler = tryCatch(async (err: any, req: any, res: any) => {
  logger.error("Unhandled error: %o", err);
  res.status(err.status || 500).json({
    success: false,
    message: "Internal server error",
    error: err.message || "An unexpected error occurred",
  });
});
