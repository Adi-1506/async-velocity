import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    res.status(404);
    message = 'Resource not found';
  } else if (err.code === 11000) {
    res.status(409);
    message = 'Duplicate field value entered';
  }

  res.status(res.statusCode === 200 ? 500 : res.statusCode).json({
    error: {
      message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    },
  });
};
