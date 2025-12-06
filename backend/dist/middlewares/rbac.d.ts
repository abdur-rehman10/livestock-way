import { Request, Response, NextFunction } from "express";
export type UserRole = "shipper" | "hauler" | "stakeholder" | "driver" | "super-admin";
interface RequireRoleOptions {
    allowSuperAdminOverride?: boolean;
}
export declare function normalizeRole(role?: string | null): string | undefined;
export declare function requireRoles(roles?: UserRole[], options?: RequireRoleOptions): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare function requireAnyRole(options?: RequireRoleOptions): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export {};
//# sourceMappingURL=rbac.d.ts.map