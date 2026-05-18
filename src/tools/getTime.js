export const definition = {
  name: "get_time",
  description: "Get the current server date and time in ISO format",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

export async function handler(_args) {
  return {
    content: [
      {
        type: "text",
        text: new Date().toISOString(),
      },
    ],
  };
}
