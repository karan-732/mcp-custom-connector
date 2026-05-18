export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class AuthError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "AUTH_ERROR");
    this.name = "AuthError";
  }
}

export class ToolNotFoundError extends AppError {
  constructor(toolName) {
    super(`Tool "${toolName}" not found`, 404, "TOOL_NOT_FOUND");
    this.name = "ToolNotFoundError";
  }
}

export function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  const body = {
    jsonrpc: "2.0",
    error: { code: status, message: err.message || "Internal Server Error" },
    id: req.body?.id ?? null,
  };
  res.status(status).json(body);
}
