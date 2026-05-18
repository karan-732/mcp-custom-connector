import { ValidationError } from "../utils/errors.js";

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`
      );
      return next(new ValidationError(messages.join("; ")));
    }
    req.validatedBody = result.data;
    next();
  };
}
