import { Request, Response, NextFunction } from "express";

export type UserRole =
  | "shipper"
  | "hauler"
  | "stakeholder"
  | "driver"
  | "super-admin";

interface RequireRoleOptions {
  allowSuperAdminOverride?: boolean;
}

export function normalizeRole(role?: string | null) {
  if (!role) return undefined;
  return role.toLowerCase().replace(/_/g, "-");
}

export function requireRoles(
  roles: UserRole[] = [],
  options: RequireRoleOptions = {}
) {
  const allowSuperAdmin =
    options.allowSuperAdminOverride !== undefined
      ? options.allowSuperAdminOverride
      : true;
  const roleSet = new Set(roles);

  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = normalizeRole(req.user?.user_type);
    if (!userRole) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (roleSet.size === 0 || roleSet.has(userRole as UserRole)) {
      return next();
    }

    if (allowSuperAdmin && userRole === "super-admin") {
      return next();
    }

    return res.status(403).json({ message: "Forbidden" });
  };
}

export function requireAnyRole(options?: RequireRoleOptions) {
  return requireRoles([], options);
}
