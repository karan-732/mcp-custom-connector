import { Router } from "express";
import { listToolDefinitions, executeTool } from "../tools/registry.js";
import { logger } from "../utils/logger.js";

const router = Router();

// ── Direct JSON-RPC handler (no SSE/StreamableHTTP) ──
router.post("/mcp", jsonBodyParser(), async (req, res) => {
  const msg = req.body;

  if (!msg || msg.jsonrpc !== "2.0" || !msg.method) {
    return res.json({
      jsonrpc: "2.0",
      error: { code: -32700, message: "Parse error" },
      id: msg?.id ?? null,
    });
  }

  const { id, method, params } = msg;

  try {
    switch (method) {
      case "tools/list": {
        logger.info("tools/list called");
        return res.json({
          jsonrpc: "2.0",
          id,
          result: { tools: listToolDefinitions() },
        });
      }

      case "tools/call": {
        const { name, arguments: args } = params || {};
        logger.info(`tools/call: ${name}`, args);
        const result = await executeTool(name, args ?? {});
        return res.json({ jsonrpc: "2.0", id, result });
      }

      case "initialize": {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "mcp-custom-connector", version: "1.0.0" },
          },
        });
      }

      case "notifications/initialized": {
        return res.json({ jsonrpc: "2.0", id, result: null });
      }

      case "ping": {
        return res.json({ jsonrpc: "2.0", id, result: {} });
      }

      default:
        return res.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        });
    }
  } catch (err) {
    logger.error(`MCP error: ${method}`, err.message);
    return res.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: err.message },
    });
  }
});

function jsonBodyParser() {
  return (req, res, next) => {
    let data = [];
    req.on("data", (c) => data.push(c));
    req.on("end", () => {
      try {
        req.body = JSON.parse(Buffer.concat(data).toString());
      } catch {
        req.body = {};
      }
      next();
    });
  };
}

export default router;
