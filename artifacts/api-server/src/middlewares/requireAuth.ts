import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth.js";

export interface AuthenticatedRequest extends Request {
  auth?: {
    id: string;
    username: string;
    role: string;
    scopes: string[];
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token" });
    return;
  }

  req.auth = payload;
  next();
}

export function requireScope(scope: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (!req.auth.scopes.includes(scope)) {
      res.status(403).json({ error: "forbidden", message: `Missing required scope: ${scope}` });
      return;
    }
    next();
  };
}
