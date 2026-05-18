const MOCK_DATASET = [
  { id: 1, title: "Introduction to MCP Protocol", category: "tech" },
  { id: 2, title: "Building Claude Connectors", category: "tech" },
  { id: 3, title: "Node.js Best Practices", category: "engineering" },
  { id: 4, title: "TypeScript Handbook", category: "engineering" },
  { id: 5, title: "MCP Server Deployment Guide", category: "devops" },
  { id: 6, title: "Express Middleware Deep Dive", category: "engineering" },
  { id: 7, title: "Docker for Node.js Apps", category: "devops" },
  { id: 8, title: "Authentication Patterns", category: "security" },
];

export const definition = {
  name: "search_data",
  description: "Search through a dataset of documents by query string",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search term to filter documents",
      },
    },
    required: ["query"],
  },
};

export async function handler(args) {
  const query = args.query.toLowerCase();
  const results = MOCK_DATASET.filter(
    (doc) =>
      doc.title.toLowerCase().includes(query) ||
      doc.category.toLowerCase().includes(query)
  );

  if (results.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No results found for query "${args.query}".`,
        },
      ],
    };
  }

  const formatted = results
    .map((r) => `[${r.id}] ${r.title} (${r.category})`)
    .join("\n");

  return {
    content: [
      {
        type: "text",
        text: `Found ${results.length} result(s) for "${args.query}":\n${formatted}`,
      },
    ],
  };
}
