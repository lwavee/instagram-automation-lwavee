import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Ensure we don't log passwords or sensitive tokens
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "An unexpected internal server error occurred.";

  if (process.env.NODE_ENV !== "production") {
    console.error("🔴 Server Error:", err);
  } else {
    console.error(`🔴 Server Error: [Status ${statusCode}] ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: statusCode === 500 && process.env.NODE_ENV === "production"
        ? "An internal server error occurred. Please try again later."
        : message,
      ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
    },
  });
}

