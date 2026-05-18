import { AuthError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export function authMiddleware(req, res, next) {
  // Public endpoints: health check, SSE stream (EventSource can't send headers)
  if (req.path === "/health" || (req.path === "/sse" && req.method === "GET")) return next();

  const apiKey = req.headers["x-api-key"] || req.query.api_key;
  const expected = process.env.API_KEY;

  if (!expected) {
    logger.warn("API_KEY not configured — auth disabled");
    return next();
  }

  if (!apiKey) {
    return next(new AuthError("Missing x-api-key header"));
  }

  if (apiKey !== expected) {
    return next(new AuthError("Invalid API key"));
  }

  next();
}
