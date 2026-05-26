import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      res.status(400).json({
        code: 400,
        msg: firstError.message,
        data: null,
      });
      return;
    }

    next();
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const firstError = result.error.issues[0];
      res.status(400).json({
        code: 400,
        msg: firstError.message,
        data: null,
      });
      return;
    }

    next();
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const firstError = result.error.issues[0];
      res.status(400).json({
        code: 400,
        msg: firstError.message,
        data: null,
      });
      return;
    }

    next();
  };
};
