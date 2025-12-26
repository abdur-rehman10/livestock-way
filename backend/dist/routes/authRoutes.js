"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const auditLogService_1 = require("../services/auditLogService");
const auth_1 = __importDefault(require("../middlewares/auth"));
const signupPlan_1 = require("../utils/signupPlan");
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
function normalizeIndividualPlanCode(code) {
    const normalized = (code ?? "").toString().trim().toUpperCase();
    if (normalized === "FREE" || normalized === "PAID")
        return normalized;
    return null;
}
// ------------------ REGISTER ------------------
router.post("/register", async (req, res) => {
    const { full_name, email, password, phone, user_type, account_mode, company_name, individual_plan_code, signup_plan_selected_at, onboarding_completed, } = req.body;
    const normalizedType = normalizeUserType(user_type);
    const planSelection = (0, signupPlan_1.resolveSignupPlanSelection)({
        userType: normalizedType,
        accountMode: account_mode,
        planCode: individual_plan_code ?? null,
    });
    const onboardingCompleted = planSelection.planCode !== null
        ? planSelection.onboardingCompleted
        : Boolean(onboarding_completed);
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
          company_name,
          account_mode,
          individual_plan_code,
          signup_plan_selected_at,
          onboarding_completed
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING id, full_name, email, user_type, company_name, account_status, account_mode, individual_plan_code, signup_plan_selected_at, onboarding_completed`, [
            full_name,
            email,
            hashed,
            phone ?? null,
            normalizedType,
            "pending",
            companyValue,
            account_mode ?? "COMPANY",
            planSelection.planCode,
            planSelection.selectedAt ? planSelection.selectedAt.toISOString() : null,
            onboardingCompleted,
        ]);
        const token = signToken({
            id: user.rows[0].id,
            user_type: user.rows[0].user_type,
            account_status: user.rows[0].account_status,
            account_mode: user.rows[0].account_mode ?? "COMPANY",
        });
        await (0, auditLogService_1.logAuditEvent)({
            action: "user_registered",
            eventType: "user:register",
            userId: user.rows[0].id,
            userRole: user.rows[0].user_type ?? null,
            resource: "app_users",
            metadata: { account_mode, company_name: companyValue ?? undefined },
            ipAddress: req.ip || null,
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
            await (0, auditLogService_1.logAuditEvent)({
                action: "login_failed",
                eventType: "auth:failed",
                resource: "auth",
                metadata: { reason: "user_not_found", email },
                ipAddress: req.ip || null,
            });
            return res.status(404).json({ message: "User not found" });
        }
        const user = result.rows[0];
        const match = await bcrypt_1.default.compare(password, user.password_hash);
        if (!match) {
            await (0, auditLogService_1.logAuditEvent)({
                action: "login_failed",
                eventType: "auth:failed",
                userId: user.id,
                userRole: user.user_type ?? null,
                resource: "auth",
                metadata: { reason: "invalid_password" },
                ipAddress: req.ip || null,
            });
            return res.status(401).json({ message: "Invalid password" });
        }
        const token = signToken({
            id: user.id,
            user_type: user.user_type,
            account_status: user.account_status,
            account_mode: user.account_mode ?? "COMPANY",
        });
        await (0, auditLogService_1.logAuditEvent)({
            action: "login_success",
            eventType: "auth:success",
            userId: user.id,
            userRole: user.user_type ?? null,
            resource: "auth",
            metadata: { method: "password" },
            ipAddress: req.ip || null,
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
                account_mode: user.account_mode ?? "COMPANY",
                individual_plan_code: user.individual_plan_code ?? null,
                signup_plan_selected_at: user.signup_plan_selected_at ?? null,
                onboarding_completed: Boolean(user.onboarding_completed),
            },
        });
    }
    catch (err) {
        console.error("login error:", err);
        res.status(500).json({ message: err?.message || "Login failed" });
    }
});
router.post("/onboarding-complete", auth_1.default, async (req, res) => {
    try {
        const userId = req?.user?.id ? Number(req.user.id) : null;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        await database_1.pool.query(`UPDATE app_users SET onboarding_completed = TRUE, updated_at = NOW() WHERE id = $1`, [userId]);
        return res.json({ success: true });
    }
    catch (err) {
        console.error("onboarding complete error:", err);
        return res.status(500).json({ message: err?.message || "Failed to update onboarding status" });
    }
});
exports.default = router;
//# sourceMappingURL=authRoutes.js.map