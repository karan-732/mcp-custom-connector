import { Router } from "express";
import { randomUUID } from "node:crypto";
import { listToolDefinitions, executeTool } from "../tools/registry.js";
import { logger } from "../utils/logger.js";

const router = Router();

// ── Session tracking for SSE connections ─────────────
const sessions = new Map();

// ── Handle MCP methods ───────────────────────────────
async function handleMcpMessage(msg) {
  if (!msg || msg.jsonrpc !== "2.0" || !msg.method) {
    return { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: msg?.id ?? null };
  }

  const { id, method, params } = msg;

  try {
    switch (method) {
      case "tools/list":
        logger.info("tools/list called");
        return { jsonrpc: "2.0", id, result: { tools: listToolDefinitions() } };

      case "tools/call": {
        const { name, arguments: args } = params || {};
        logger.info(`tools/call: ${name}`, args);
        const result = await executeTool(name, args ?? {});
        return { jsonrpc: "2.0", id, result };
      }

      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "mcp-custom-connector", version: "1.0.0" },
          },
        };

      case "notifications/initialized":
        return { jsonrpc: "2.0", id, result: null };

      case "ping":
        return { jsonrpc: "2.0", id, result: {} };

      default:
        return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
    }
  } catch (err) {
    logger.error(`MCP error: ${method}`, err.message);
    return { jsonrpc: "2.0", id, error: { code: -32603, message: err.message } };
  }
}

// ── SSE endpoint — for EventSource clients ───────────
router.get("/mcp", async (req, res) => {
  const sessionId = randomUUID();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Tell the client where to POST messages
  res.write(`event: endpoint\ndata: /mcp?sessionId=${sessionId}\n\n`);

  // Store session
  sessions.set(sessionId, res);
  logger.info(`SSE session started: ${sessionId}`);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sessions.delete(sessionId);
    logger.info(`SSE session closed: ${sessionId}`);
  });
});

// ── JSON-RPC endpoint — for POST messages ────────────
router.post("/mcp", rawBodyParser(), async (req, res) => {
  const sessionId = req.query.sessionId;
  const sseSession = sessionId ? sessions.get(sessionId) : null;

  // Parse body
  const raw = req.rawBody?.toString() || "{}";
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return res.json({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null });
  }

  const response = await handleMcpMessage(msg);

  // If there's an active SSE session, send response through SSE stream
  if (sseSession) {
    sseSession.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
    return res.status(202).end("Accepted");
  }

  // Otherwise, return JSON directly
  res.json(response);
});

// ── Raw body parser (doesn't consume the body for transport) ──
function rawBodyParser() {
  return (req, res, next) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      req.rawBody = Buffer.concat(chunks);
      next();
    });
  };
}

export default router;
