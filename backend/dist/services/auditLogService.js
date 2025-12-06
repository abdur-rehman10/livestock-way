"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = logAuditEvent;
const database_1 = require("../config/database");
async function logAuditEvent({ userId, userRole, action, eventType, resource, metadata, ipAddress, }) {
    try {
        await database_1.pool.query(`
        INSERT INTO audit_logs (
          user_id,
          user_role,
          action,
          event_type,
          resource,
          metadata,
          ip_address
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [
            userId !== undefined && userId !== null ? Number(userId) : null,
            userRole ?? null,
            action,
            eventType ?? action,
            resource ?? null,
            metadata ? JSON.stringify(metadata) : null,
            ipAddress ?? null,
        ]);
    }
    catch (error) {
        console.error("audit log insert error", error);
    }
}
//# sourceMappingURL=auditLogService.js.map