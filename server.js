import "dotenv/config";
import express from "express";
import cors from "cors";
import { rateLimiter } from "./src/middleware/rateLimit.js";
import { authMiddleware } from "./src/middleware/auth.js";
import { errorHandler } from "./src/utils/errors.js";
import { logger } from "./src/utils/logger.js";
import healthRouter from "./src/routes/health.js";
import mcpRouter from "./src/routes/mcp.js";

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// ── Global middleware ─────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(rateLimiter);
app.use(authMiddleware);

// ── Routes ────────────────────────────────────────────
app.use(healthRouter);
app.use(mcpRouter);

// ── Error handler (must be last) ──────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`MCP server listening on port ${PORT}`);
  logger.info(`Health: http://localhost:${PORT}/health`);
  logger.info(`MCP:    http://localhost:${PORT}/mcp`);
});
