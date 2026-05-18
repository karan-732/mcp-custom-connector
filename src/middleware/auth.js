import { AuthError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export function authMiddleware(req, res, next) {
  // Health endpoint is public
  if (req.path === "/health") return next();

  const apiKey = req.headers["x-api-key"];
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
