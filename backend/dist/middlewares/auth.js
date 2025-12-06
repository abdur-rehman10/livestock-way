"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRequired = authRequired;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authRequired(req, res, next) {
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
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const normalizedRole = decoded.user_type
            ? decoded.user_type.toLowerCase().replace(/_/g, "-")
            : null;
        req.user = {
            ...decoded,
            user_type: normalizedRole,
        };
        return next();
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
}
exports.default = authRequired;
//# sourceMappingURL=auth.js.map