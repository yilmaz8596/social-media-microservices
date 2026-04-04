import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import { connectDb } from "./config/connectDb";
import logger from "./config/logger";
import { RateLimiterRedis } from "rate-limiter-flexible";
import rateLimit from "express-rate-limit";
import Redis from "ioredis";
import RedisStore from "rate-limit-redis";

dotenv.config();

const app = express();

connectDb().catch((error) => {
  logger.error("Failed to connect to the database: %s", error);
  process.exit(1);
});

const redisClient: Redis = new Redis(process.env.REDIS_URL!);

const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info("Incoming request: %s %s", req.method, req.url);
  logger.debug("Request body: %o", req.body);
  next();
});

// Ddos protection using rate limiter
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: parseInt(process.env.RATE_LIMIT_POINTS!, 10),
  duration: 1, // Per second(s)
});

app.use((req, res, next) => {
  rateLimiter
    .consume((req as any).ip)
    .then(() => {
      next();
    })
    .catch(() => {
      logger.warn("Rate limit exceeded for IP: %s", (req as any).ip);
      res.status(429).json({ success: false, error: "Too many requests" });
    });
});

// Ip based rate limiting
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 50, // limit each IP to 50 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn("Sensitive endpoint rate limit exceeded for IP: %s", req.ip);
    res.status(429).json({ success: false, error: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args: string[]) =>
      redisClient.call(...(args as [string, ...string[]])) as Promise<any>,
  }),
});

// Routes
app.use("/api/auth/register", sensitiveEndpointsLimiter);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Identity Service is running");
});

app.use(errorHandler);

app.listen(PORT, async () => {
  logger.info(`Identity Service is running on port ${PORT}`);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at: %o, reason: %o", promise, reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception: %s", error);
  process.exit(1);
});
