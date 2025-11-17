"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
const TOKEN_TTL = "7d";
function signToken(payload) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}
function normalizeUserType(userType) {
    return userType?.toLowerCase();
}
// ------------------ REGISTER ------------------
router.post("/register", async (req, res) => {
    const { full_name, email, password, phone, user_type, account_mode, company_name, } = req.body;
    const normalizedType = normalizeUserType(user_type);
    try {
        const hashed = await bcrypt_1.default.hash(password, 10);
        const companyValue = account_mode === "COMPANY" ? company_name ?? null : null;
        const user = await database_1.pool.query(`INSERT INTO app_users (
          full_name,
          email,
          password_hash,
          phone_number,
          user_type,
          account_status,
          company_name
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id, full_name, email, user_type, company_name, account_status`, [
            full_name,
            email,
            hashed,
            phone ?? null,
            normalizedType,
            "pending",
            companyValue,
        ]);
        const token = signToken({
            id: user.rows[0].id,
            user_type: user.rows[0].user_type,
            account_status: user.rows[0].account_status,
        });
        res.json({
            message: "Registration successful",
            user: user.rows[0],
            token,
        });
    }
    catch (err) {
        console.error("register error:", err);
        res.status(500).json({ message: err?.message || "Registration failed" });
    }
});
// ------------------ LOGIN ------------------
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await database_1.pool.query("SELECT * FROM app_users WHERE email=$1", [email]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const user = result.rows[0];
        const match = await bcrypt_1.default.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ message: "Invalid password" });
        }
        const token = signToken({
            id: user.id,
            user_type: user.user_type,
            account_status: user.account_status,
        });
        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                user_type: user.user_type,
                company_name: user.company_name,
                account_status: user.account_status,
            },
        });
    }
    catch (err) {
        console.error("login error:", err);
        res.status(500).json({ message: err?.message || "Login failed" });
    }
});
exports.default = router;
//# sourceMappingURL=authRoutes.js.map