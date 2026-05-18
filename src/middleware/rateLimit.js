import rateLimit from "express-rate-limit";

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
const max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100;

export const rateLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    jsonrpc: "2.0",
    error: { code: 429, message: "Too many requests — rate limit exceeded" },
    id: null,
  },
});
