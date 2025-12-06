"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRole = normalizeRole;
exports.requireRoles = requireRoles;
exports.requireAnyRole = requireAnyRole;
function normalizeRole(role) {
    if (!role)
        return undefined;
    return role.toLowerCase().replace(/_/g, "-");
}
function requireRoles(roles = [], options = {}) {
    const allowSuperAdmin = options.allowSuperAdminOverride !== undefined
        ? options.allowSuperAdminOverride
        : true;
    const roleSet = new Set(roles);
    return (req, res, next) => {
        const userRole = normalizeRole(req.user?.user_type);
        if (!userRole) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (roleSet.size === 0 || roleSet.has(userRole)) {
            return next();
        }
        if (allowSuperAdmin && userRole === "super-admin") {
            return next();
        }
        return res.status(403).json({ message: "Forbidden" });
    };
}
function requireAnyRole(options) {
    return requireRoles([], options);
}
//# sourceMappingURL=rbac.js.map