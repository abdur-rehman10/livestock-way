import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/database";
import { logAuditEvent } from "../services/auditLogService";

const router = Router();

interface RegisterRequestBody {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  user_type: string;
  account_mode: "INDIVIDUAL" | "COMPANY";
  company_name?: string;
}

interface LoginRequestBody {
  email: string;
  password: string;
}

const TOKEN_TTL = "7d";

function signToken(payload: Record<string, unknown>) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function normalizeUserType(userType: string) {
  return userType?.toLowerCase();
}

// ------------------ REGISTER ------------------
router.post("/register", async (req, res) => {
  const {
    full_name,
    email,
    password,
    phone,
    user_type,
    account_mode,
    company_name,
  } = req.body as RegisterRequestBody;

  const normalizedType = normalizeUserType(user_type);

  try {
    const hashed = await bcrypt.hash(password, 10);

    const companyValue =
      account_mode === "COMPANY" ? company_name ?? null : null;

    const user = await pool.query(
      `INSERT INTO app_users (
          full_name,
          email,
          password_hash,
          phone_number,
          user_type,
          account_status,
          company_name,
          account_mode
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id, full_name, email, user_type, company_name, account_status, account_mode`,
      [
        full_name,
        email,
        hashed,
        phone ?? null,
        normalizedType,
        "pending",
        companyValue,
        account_mode ?? "COMPANY",
      ]
    );

    const token = signToken({
      id: user.rows[0].id,
      user_type: user.rows[0].user_type,
      account_status: user.rows[0].account_status,
      account_mode: user.rows[0].account_mode ?? "COMPANY",
    });

    await logAuditEvent({
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
  } catch (err: any) {
    console.error("register error:", err);
    res.status(500).json({ message: err?.message || "Registration failed" });
  }
});

// ------------------ LOGIN ------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body as LoginRequestBody;

  try {
    const result = await pool.query(
      "SELECT * FROM app_users WHERE email=$1",
      [email]
    );

    if (result.rowCount === 0) {
      await logAuditEvent({
        action: "login_failed",
        eventType: "auth:failed",
        resource: "auth",
        metadata: { reason: "user_not_found", email },
        ipAddress: req.ip || null,
      });
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      await logAuditEvent({
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

    await logAuditEvent({
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
      },
    });
  } catch (err: any) {
    console.error("login error:", err);
    res.status(500).json({ message: err?.message || "Login failed" });
  }
});

export default router;
