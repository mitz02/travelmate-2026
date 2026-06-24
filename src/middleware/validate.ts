import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidateSource = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: ValidateSource = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source];
    const result = schema.safeParse(data);
    if (result.success) {
      if (source === 'body') req.body = result.data;
      else if (source === 'query') req.query = result.data as typeof req.query;
      else req.params = result.data as typeof req.params;
      next();
      return;
    }
    const err = result.error as ZodError;
    res.status(400).json({
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
  };
}
