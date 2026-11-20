import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Ensure we don't log passwords or sensitive tokens
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode >= 500 ? "An internal server error occurred." : (err.publicMessage ||
    (statusCode === 413 ? "Request is too large." : "The request could not be processed."));
  if (statusCode >= 500) console.error(`API request failed (HTTP ${statusCode}).`);

  res.status(statusCode).json({
    success: false,
    error: {
      message,
    },
  });
}

