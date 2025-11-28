import { Request, Response, NextFunction } from "express";
import { logAuditEvent } from "../services/auditLogService";

type ResourceResolver = (req: Request, res: Response) => string | undefined;

export function auditRequest(
  action: string,
  resolveResource?: ResourceResolver
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      const success = res.statusCode >= 200 && res.statusCode < 400;
      if (!success) {
        return;
      }
      const userId =
        req.user?.id !== undefined && req.user?.id !== null
          ? String(req.user.id)
          : null;
      const userRole = req.user?.user_type ?? null;
      const resource = resolveResource?.(req, res) ?? req.originalUrl;
      logAuditEvent({
        action,
        resource,
        userId,
        userRole,
        metadata: {
          method: req.method,
          status: res.statusCode,
          durationMs: Date.now() - startedAt,
        },
        ipAddress: req.ip || null,
      }).catch((err) => {
        console.error("Failed to write audit log", err);
      });
    });
    next();
  };
}
