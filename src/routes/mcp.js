import { Router } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { listToolDefinitions, executeTool } from "../tools/registry.js";
import { logger } from "../utils/logger.js";

const router = Router();

// ── MCP Server instance ───────────────────────────────
const mcpServer = new Server(
  { name: "mcp-custom-connector", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ── Tool listing handler ──────────────────────────────
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info("Client requested tool list");
  return { tools: listToolDefinitions() };
});

// ── Tool execution handler ────────────────────────────
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.info(`Tool called: ${name}`, args);
  return executeTool(name, args ?? {});
});

// ── Session tracking ──────────────────────────────────
const sessions = new Map();

// ── SSE endpoint — clients connect here first ─────────
router.get("/sse", async (req, res) => {
  try {
    const transport = new SSEServerTransport("/messages", res);
    sessions.set(transport.sessionId, transport);
    logger.info(`SSE session opened: ${transport.sessionId}`);

    res.on("close", () => {
      sessions.delete(transport.sessionId);
      logger.info(`SSE session closed: ${transport.sessionId}`);
    });

    await mcpServer.connect(transport);
  } catch (err) {
    logger.error("SSE connection error", err.message);
    if (!res.headersSent) res.status(500).end();
  }
});

// ── Message endpoint — clients POST JSON-RPC here ─────
router.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(404).json({
      jsonrpc: "2.0",
      error: { code: 404, message: "Session not found" },
      id: null,
    });
  }

  try {
    const transport = sessions.get(sessionId);
    await transport.handlePostMessage(req, res);
  } catch (err) {
    logger.error("Message handling error", err.message);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: 500, message: "Internal server error" },
        id: null,
      });
    }
  }
});

export default router;
