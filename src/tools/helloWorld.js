export const definition = {
  name: "hello_world",
  description: "Greet a person by name",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "The name of the person to greet",
      },
    },
    required: ["name"],
  },
};

export async function handler(args) {
  const name = args.name;
  return {
    content: [
      {
        type: "text",
        text: `Hello, ${name}! Welcome to the MCP server.`,
      },
    ],
  };
}
