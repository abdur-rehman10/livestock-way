import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  id: string;
  user_type?: string | null;
  company_id?: string | null;
  iat?: number;
  exp?: number;
}

export function authRequired(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : undefined;

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not set in environment variables");
    return res.status(500).json({ message: "Server misconfiguration" });
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    const normalizedRole = decoded.user_type
      ? decoded.user_type.toLowerCase().replace(/_/g, "-")
      : null;
    (req as Request & { user?: JwtPayload }).user = {
      ...decoded,
      user_type: normalizedRole,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export default authRequired;
