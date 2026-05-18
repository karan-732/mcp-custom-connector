# MCP Custom Connector Server

Production-ready [Model Context Protocol](https://modelcontextprotocol.io) server for Claude custom connectors. Built with Node.js, Express, and the official `@modelcontextprotocol/sdk`.

## Features

- Streamable HTTP transport (single endpoint, no SSE setup needed)
- Tool discovery (`tools/list`) and execution (`tools/call`)
- API-key authentication middleware
- Rate limiting via `express-rate-limit`
- Zod schema validation
- Structured JSON logging
- CORS enabled for cross-origin clients
- Docker & Railway ready
- Extensible tool registry

## Project Structure

```
.
├── server.js                 # Entry point — Express + MCP setup
├── package.json
├── Dockerfile
├── railway.json
├── .env.example
├── README.md
└── src/
    ├── tools/
    │   ├── helloWorld.js     # hello_world tool
    │   ├── getTime.js        # get_time tool
    │   ├── searchData.js     # search_data tool
    │   └── registry.js       # Tool registry (list + execute)
    ├── routes/
    │   ├── mcp.js            # /mcp endpoint (Streamable HTTP transport)
    │   └── health.js         # /health endpoint
    ├── middleware/
    │   ├── auth.js           # API key check
    │   ├── rateLimit.js      # Rate limiter
    │   └── validation.js     # Zod validation helper
    └── utils/
        ├── logger.js         # Structured JSON logger
        └── errors.js         # Custom error classes + handler
```

## Available Tools

| Tool          | Description                    | Parameters            |
|---------------|--------------------------------|-----------------------|
| `hello_world` | Greet a person by name         | `name` (string, req)  |
| `get_time`    | Get current server time        | none                  |
| `search_data` | Search a mock document dataset | `query` (string, req) |

## Getting Started

### 1. Clone & Install

```bash
git clone <repo-url> mcp-server
cd mcp-server
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set a strong `API_KEY`:

```env
PORT=3000
NODE_ENV=development
API_KEY=sk-your-secret-api-key-here
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Start the Server

```bash
npm start
```

Output:

```json
{"timestamp":"...","level":"info","message":"MCP server listening on port 3000"}
```

### 4. Test the Health Endpoint

```bash
curl http://localhost:3000/health
```

Response:

```json
{"status":"ok","uptime":0.123,"timestamp":"...","version":"1.0.0"}
```

## Connecting from Claude Custom Connectors

### Prerequisites

- Your MCP server must be publicly accessible (see **Deploy to Railway** below)
- You need the server URL and API key

### Claude Desktop (Anthropic Custom Connectors)

1. Open Claude Desktop → Settings → Developer → Edit Config
2. Open (or create) `claude_desktop_config.json`
3. Add an MCP server entry:

```json
{
  "mcpServers": {
    "my-connector": {
      "type": "sse",
      "url": "https://your-app.up.railway.app/mcp"
    }
  }
}
```

4. Restart Claude Desktop
5. Your tools (`hello_world`, `get_time`, `search_data`) will appear in the interface

### Custom Connectors UI

If using the in-app **Custom Connectors** UI (Settings → Connectors → Add custom connector):

- **Name:** `My MCP Server`
- **Remote MCP server URL:** `https://your-app.up.railway.app/mcp`
- **Advanced → Headers:** empty (no auth configured by default)

### Programmatic (MCP Client)

If you are building a custom MCP client:

```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(
  new URL("https://your-app.up.railway.app/mcp")
);

const client = new Client(
  { name: "my-client", version: "1.0.0" },
  { capabilities: {} }
);

await client.connect(transport);

// List tools
const { tools } = await client.listTools();
console.log(tools);

// Call a tool
const result = await client.callTool({
  name: "hello_world",
  arguments: { name: "Alice" },
});
console.log(result);
```

## Example MCP Requests

The server uses the **Streamable HTTP** transport — just POST JSON-RPC messages to the `/mcp` endpoint.

### List Tools

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### Call hello_world

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": { "name": "hello_world", "arguments": { "name": "Alice" } }
  }'
```

### Call get_time

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": { "name": "get_time", "arguments": {} }
  }'
```

### Call search_data

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": { "name": "search_data", "arguments": { "query": "mcp" } }
  }'
```

## Deploy to Railway

### Option A — One-Click Deploy (via GitHub)

1. Push this repo to GitHub
2. Go to [Railway](https://railway.app) → New Project → Deploy from GitHub repo
3. Add the environment variables (from `.env.example`)
4. Railway auto-detects the `Dockerfile` and `railway.json`
5. Deploy — you get a `*.up.railway.app` URL

### Option B — Railway CLI

```bash
npm i -g @railway/cli
railway login
railway init
railway up
railway domain
```

### Required Environment Variables on Railway

| Variable                  | Description                    |
|---------------------------|--------------------------------|
| `PORT`                    | Internal port (Railway sets it)|
| `NODE_ENV`                | `production`                   |
| `RATE_LIMIT_WINDOW_MS`    | Rate limit window (ms)         |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window        |

> **Note:** Auth is disabled by default. To enable, set `API_KEY` and update `src/middleware/auth.js`.

## Adding a New Tool

Tools are self-contained modules in `src/tools/`. Each exports `definition` and `handler`.

### 1. Create the tool file

```javascript
// src/tools/echo.js
export const definition = {
  name: "echo",
  description: "Echo back a message",
  inputSchema: {
    type: "object",
    properties: {
      message: { type: "string", description: "Message to echo" },
    },
    required: ["message"],
  },
};

export async function handler(args) {
  return {
    content: [{ type: "text", text: `Echo: ${args.message}` }],
  };
}
```

### 2. Register in the registry

Edit `src/tools/registry.js`:

```javascript
import { definition as echoDef, handler as echoHandler } from "./echo.js";

// Add to the tools array:
const tools = [
  { definition: helloDef, handler: helloHandler },
  { definition: timeDef, handler: timeHandler },
  { definition: searchDef, handler: searchHandler },
  { definition: echoDef, handler: echoHandler },    // <-- new
];
```

The tool is now discoverable and executable — no other changes needed.

## Adding a New Endpoint

If you need a custom REST endpoint alongside MCP:

1. Create a route file in `src/routes/`
2. Export a `Router`
3. Import and mount in `server.js`

## Docker

### Build

```bash
docker build -t mcp-server .
```

### Run

```bash
docker run -p 3000:3000 --env-file .env mcp-server
```

## License

MIT
