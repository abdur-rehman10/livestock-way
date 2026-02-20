import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/database";
import { logAuditEvent } from "../services/auditLogService";
import authRequired from "../middlewares/auth";
import { resolveSignupPlanSelection } from "../utils/signupPlan";
import {
  generateCode,
  codeExpiry,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../services/emailService";

const router = Router();

interface RegisterRequestBody {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  user_type: string;
  account_mode: "INDIVIDUAL" | "COMPANY";
  company_name?: string;
  individual_plan_code?: "FREE" | "PAID";
  signup_plan_selected_at?: string;
  onboarding_completed?: boolean;
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

function normalizeIndividualPlanCode(
  code?: string | null
): "FREE" | "PAID" | null {
  const normalized = (code ?? "").toString().trim().toUpperCase();
  if (normalized === "FREE" || normalized === "PAID") return normalized;
  return null;
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
    individual_plan_code,
    signup_plan_selected_at,
    onboarding_completed,
  } = req.body as RegisterRequestBody;

  const normalizedType = normalizeUserType(user_type);
  const planSelection = resolveSignupPlanSelection({
    userType: normalizedType,
    accountMode: account_mode,
    planCode: individual_plan_code ?? null,
  });
  const onboardingCompleted =
    planSelection.planCode !== null
      ? planSelection.onboardingCompleted
      : Boolean(onboarding_completed);

  try {
    const existing = await pool.query(
      "SELECT id FROM app_users WHERE email = $1",
      [email]
    );
    if ((existing.rowCount ?? 0) > 0) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const companyValue =
      account_mode === "COMPANY" ? company_name ?? null : null;

    const verificationCode = generateCode();
    const verificationExp = codeExpiry(15);

    const user = await pool.query(
      `INSERT INTO app_users (
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
          onboarding_completed,
          email_verified,
          verification_code,
          verification_code_exp
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id, full_name, email, user_type, company_name, account_status, account_mode, individual_plan_code, signup_plan_selected_at, onboarding_completed, email_verified`,
      [
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
        false,
        verificationCode,
        verificationExp.toISOString(),
      ]
    );

    const token = signToken({
      id: user.rows[0].id,
      user_type: user.rows[0].user_type,
      account_status: user.rows[0].account_status,
      account_mode: user.rows[0].account_mode ?? "COMPANY",
    });

    // Send verification email (fire-and-forget so registration isn't blocked)
    sendVerificationEmail(email, verificationCode, full_name).catch((err) =>
      console.error("Failed to send verification email:", err.message)
    );

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
      message: "Registration successful. Please verify your email.",
      requiresVerification: true,
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
        individual_plan_code: user.individual_plan_code ?? null,
        signup_plan_selected_at: user.signup_plan_selected_at ?? null,
        onboarding_completed: Boolean(user.onboarding_completed),
        profile_photo_url: user.profile_photo_url ?? null,
      },
    });
  } catch (err: any) {
    console.error("login error:", err);
    res.status(500).json({ message: err?.message || "Login failed" });
  }
});

// ------------------ VERIFY EMAIL ------------------
router.post("/verify-email", async (req, res) => {
  const { email, code } = req.body as { email: string; code: string };

  if (!email || !code) {
    return res.status(400).json({ message: "Email and code are required" });
  }

  try {
    const result = await pool.query(
      "SELECT id, full_name, verification_code, verification_code_exp, email_verified FROM app_users WHERE email = $1",
      [email]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.json({ message: "Email is already verified", verified: true });
    }

    if (!user.verification_code || user.verification_code !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    if (new Date(user.verification_code_exp) < new Date()) {
      return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
    }

    await pool.query(
      `UPDATE app_users
       SET email_verified = TRUE,
           account_status = 'active',
           verification_code = NULL,
           verification_code_exp = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    await logAuditEvent({
      action: "email_verified",
      eventType: "auth:verify",
      userId: user.id,
      resource: "app_users",
      metadata: { method: "email_code" },
      ipAddress: req.ip || null,
    });

    // Send welcome email
    sendWelcomeEmail(email, user.full_name || "there").catch((err) =>
      console.error("Failed to send welcome email:", err.message)
    );

    res.json({ message: "Email verified successfully", verified: true });
  } catch (err: any) {
    console.error("verify-email error:", err);
    res.status(500).json({ message: err?.message || "Verification failed" });
  }
});

// ------------------ RESEND VERIFICATION ------------------
router.post("/resend-verification", async (req, res) => {
  const { email } = req.body as { email: string };

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const result = await pool.query(
      "SELECT id, full_name, email_verified FROM app_users WHERE email = $1",
      [email]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.json({ message: "Email is already verified" });
    }

    const newCode = generateCode();
    const newExp = codeExpiry(15);

    await pool.query(
      `UPDATE app_users
       SET verification_code = $1,
           verification_code_exp = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [newCode, newExp.toISOString(), user.id]
    );

    await sendVerificationEmail(email, newCode, user.full_name);

    res.json({ message: "Verification code resent" });
  } catch (err: any) {
    console.error("resend-verification error:", err);
    res.status(500).json({ message: err?.message || "Failed to resend code" });
  }
});

// ------------------ FORGOT PASSWORD ------------------
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body as { email: string };

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const result = await pool.query(
      "SELECT id, full_name FROM app_users WHERE email = $1",
      [email]
    );

    // Always return success to avoid revealing if an email exists
    if ((result.rowCount ?? 0) === 0) {
      return res.json({ message: "If an account with that email exists, a reset code has been sent." });
    }

    const user = result.rows[0];
    const resetCode = generateCode();
    const resetExp = codeExpiry(15);

    await pool.query(
      `UPDATE app_users
       SET reset_code = $1,
           reset_code_exp = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [resetCode, resetExp.toISOString(), user.id]
    );

    await sendPasswordResetEmail(email, resetCode, user.full_name);

    await logAuditEvent({
      action: "password_reset_requested",
      eventType: "auth:reset",
      userId: user.id,
      resource: "app_users",
      metadata: { method: "email" },
      ipAddress: req.ip || null,
    });

    res.json({ message: "If an account with that email exists, a reset code has been sent." });
  } catch (err: any) {
    console.error("forgot-password error:", err);
    res.status(500).json({ message: err?.message || "Failed to process request" });
  }
});

// ------------------ RESET PASSWORD ------------------
router.post("/reset-password", async (req, res) => {
  const { email, code, new_password } = req.body as {
    email: string;
    code: string;
    new_password: string;
  };

  if (!email || !code || !new_password) {
    return res.status(400).json({ message: "Email, code, and new password are required" });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const result = await pool.query(
      "SELECT id, reset_code, reset_code_exp FROM app_users WHERE email = $1",
      [email]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];

    if (!user.reset_code || user.reset_code !== code) {
      return res.status(400).json({ message: "Invalid reset code" });
    }

    if (new Date(user.reset_code_exp) < new Date()) {
      return res.status(400).json({ message: "Reset code has expired. Please request a new one." });
    }

    const hashed = await bcrypt.hash(new_password, 10);

    await pool.query(
      `UPDATE app_users
       SET password_hash = $1,
           reset_code = NULL,
           reset_code_exp = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [hashed, user.id]
    );

    await logAuditEvent({
      action: "password_reset_completed",
      eventType: "auth:reset_complete",
      userId: user.id,
      resource: "app_users",
      metadata: { method: "email_code" },
      ipAddress: req.ip || null,
    });

    res.json({ message: "Password reset successful. You can now sign in with your new password." });
  } catch (err: any) {
    console.error("reset-password error:", err);
    res.status(500).json({ message: err?.message || "Failed to reset password" });
  }
});

// ------------------ CHANGE PASSWORD (authenticated) ------------------
router.post("/change-password", authRequired, async (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { current_password, new_password } = req.body as {
    current_password: string;
    new_password: string;
  };

  if (!current_password || !new_password) {
    return res.status(400).json({ message: "Current password and new password are required" });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters" });
  }

  try {
    const result = await pool.query(
      "SELECT id, password_hash FROM app_users WHERE id = $1",
      [userId]
    );
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query(
      "UPDATE app_users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [hashed, userId]
    );

    await logAuditEvent({
      action: "password_changed",
      eventType: "auth:password_change",
      userId: user.id,
      resource: "app_users",
      metadata: { method: "settings" },
      ipAddress: req.ip || null,
    });

    res.json({ message: "Password changed successfully" });
  } catch (err: any) {
    console.error("change-password error:", err);
    res.status(500).json({ message: err?.message || "Failed to change password" });
  }
});

router.post("/onboarding-complete", authRequired, async (req, res) => {
  try {
    const userId = (req as any)?.user?.id ? Number((req as any).user.id) : null;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    await pool.query(
      `UPDATE app_users SET onboarding_completed = TRUE, updated_at = NOW() WHERE id = $1`,
      [userId]
    );
    return res.json({ success: true });
  } catch (err: any) {
    console.error("onboarding complete error:", err);
    return res.status(500).json({ message: err?.message || "Failed to update onboarding status" });
  }
});

export default router;
