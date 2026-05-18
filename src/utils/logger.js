const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.NODE_ENV === "production" ? "info" : "debug"] ?? LOG_LEVELS.info;

function formatTimestamp() {
  return new Date().toISOString();
}

function log(level, message, data) {
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;
  const entry = { timestamp: formatTimestamp(), level, message };
  if (data !== undefined) entry.data = typeof data === "object" ? data : { value: data };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg, data) => log("debug", msg, data),
  info: (msg, data) => log("info", msg, data),
  warn: (msg, data) => log("warn", msg, data),
  error: (msg, data) => log("error", msg, data),
};
