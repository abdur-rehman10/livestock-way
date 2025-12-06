"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRequest = auditRequest;
const auditLogService_1 = require("../services/auditLogService");
function auditRequest(action, resolveResource) {
    return (req, res, next) => {
        const startedAt = Date.now();
        res.on("finish", () => {
            const success = res.statusCode >= 200 && res.statusCode < 400;
            if (!success) {
                return;
            }
            const userId = req.user?.id !== undefined && req.user?.id !== null
                ? String(req.user.id)
                : null;
            const userRole = req.user?.user_type ?? null;
            const resource = resolveResource?.(req, res) ?? req.originalUrl;
            (0, auditLogService_1.logAuditEvent)({
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
//# sourceMappingURL=auditLogger.js.map