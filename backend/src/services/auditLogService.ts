import { pool } from "../config/database";

interface AuditLogInput {
  userId?: string | number | null;
  userRole?: string | null;
  action: string;
  eventType?: string | null;
  resource?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function logAuditEvent({
  userId,
  userRole,
  action,
  eventType,
  resource,
  metadata,
  ipAddress,
}: AuditLogInput) {
  try {
    await pool.query(
      `
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
      `,
      [
        userId !== undefined && userId !== null ? Number(userId) : null,
        userRole ?? null,
        action,
        eventType ?? action,
        resource ?? null,
        metadata ? JSON.stringify(metadata) : null,
        ipAddress ?? null,
      ]
    );
  } catch (error) {
    console.error("audit log insert error", error);
  }
}
