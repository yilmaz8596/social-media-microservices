import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import Redis from "ioredis";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { RateLimiterRedis } from "rate-limiter-flexible";
import logger from "./config/logger";
import proxy from "express-http-proxy";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL!);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10, // Number of points
  duration: 1, // Per second(s)
});

const apiRateLimiter = rateLimit({
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

app.use(apiRateLimiter);

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip!)
    .then(() => next())
    .catch(() => {
      logger.warn("Rate limit exceeded for IP: %s", req.ip);
      res.status(429).json({ success: false, error: "Too many requests" });
    });
});

app.use((req, res, next) => {
  logger.info("Incoming request: %s %s", req.method, req.url);
  logger.debug("Request body: %o", req.body);
  next();
});

const proxyOptions = {
  proxyReqPathResolver: (req: express.Request) => {
    return req.originalUrl.replace(/^\/v1/, "/api"); // Remove /v1 prefix before forwarding
  },
  proxyErrorHandler: (err: Error, res: express.Response) => {
    logger.error("Proxy error: %s", err.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  },
};

app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL!, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      // Add authentication headers or other custom logic here if needed
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      // You can modify the response from the identity service here if needed
      logger.info(
        "Received response from identity service for %s %s",
        userReq.method,
        userReq.url,
      );
      return proxyResData;
    },
  }),
);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API Gateway is running on port ${PORT}`);
  logger.info(`Identity Service URL: ${process.env.IDENTITY_SERVICE_URL}`);
  logger.info(`Redis URL: ${process.env.REDIS_URL}`);
});
