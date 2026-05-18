import { Router } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { listToolDefinitions, executeTool } from "../tools/registry.js";
import { logger } from "../utils/logger.js";

const router = Router();

// ── MCP Server instance ───────────────────────────────
const mcpServer = new McpServer(
  { name: "mcp-custom-connector", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ── Register tools from the registry ──────────────────
function toZodSchema(inputSchema) {
  const props = inputSchema?.properties;
  if (!props || Object.keys(props).length === 0) return {};

  const schema = {};
  const required = new Set(inputSchema.required || []);

  for (const [key, prop] of Object.entries(props)) {
    let field;
    switch (prop.type) {
      case "string": field = z.string(); break;
      case "number": field = z.number(); break;
      case "boolean": field = z.boolean(); break;
      default: field = z.any(); break;
    }
    if (!required.has(key)) field = field.optional();
    schema[key] = field;
  }
  return schema;
}

const toolDefs = listToolDefinitions();
for (const def of toolDefs) {
  const schema = toZodSchema(def.inputSchema);
  mcpServer.tool(
    def.name,
    def.description || "",
    schema,
    async (args) => executeTool(def.name, args)
  );
  logger.info(`Tool registered: ${def.name}`);
}

// ── Single transport instance ─────────────────────────
const transport = new StreamableHTTPServerTransport();
await mcpServer.connect(transport);

// ── Single endpoint — clients POST JSON-RPC here ──────
router.all("/mcp", async (req, res) => {
  try {
    await transport.handleRequest(req, res);
  } catch (err) {
    logger.error("MCP request error", err.message);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal error" },
        id: null,
      });
    }
  }
});

export default router;
