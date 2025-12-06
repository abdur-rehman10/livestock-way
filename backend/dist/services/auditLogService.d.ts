interface AuditLogInput {
    userId?: string | number | null;
    userRole?: string | null;
    action: string;
    eventType?: string | null;
    resource?: string | null;
    metadata?: Record<string, unknown> | null;
    ipAddress?: string | null;
}
export declare function logAuditEvent({ userId, userRole, action, eventType, resource, metadata, ipAddress, }: AuditLogInput): Promise<void>;
export {};
//# sourceMappingURL=auditLogService.d.ts.map