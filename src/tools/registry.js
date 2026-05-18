import { logger } from "../utils/logger.js";
import { ToolNotFoundError } from "../utils/errors.js";

import { definition as helloDef, handler as helloHandler } from "./helloWorld.js";
import { definition as timeDef, handler as timeHandler } from "./getTime.js";
import { definition as searchDef, handler as searchHandler } from "./searchData.js";

const tools = [
  { definition: helloDef, handler: helloHandler },
  { definition: timeDef, handler: timeHandler },
  { definition: searchDef, handler: searchHandler },
];

const handlerMap = new Map(tools.map((t) => [t.definition.name, t.handler]));

export function listToolDefinitions() {
  return tools.map((t) => t.definition);
}

export async function executeTool(name, args) {
  const handler = handlerMap.get(name);
  if (!handler) {
    throw new ToolNotFoundError(name);
  }

  logger.info(`Executing tool: ${name}`, args);
  const result = await handler(args);
  logger.info(`Tool completed: ${name}`);
  return result;
}

export function registerTool(definition, handler) {
  if (handlerMap.has(definition.name)) {
    throw new Error(`Tool "${definition.name}" is already registered`);
  }
  tools.push({ definition, handler });
  handlerMap.set(definition.name, handler);
  logger.info(`Tool registered: ${definition.name}`);
}
