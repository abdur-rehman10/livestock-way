import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { pool } from "../config/database";

dotenv.config();

const DEFAULT_EMAIL = "admin@livestockway.com";
const DEFAULT_PASSWORD = "Hello.123$";
const DEFAULT_NAME = "Super Admin";

async function ensureSuperAdmin() {
  const email = (process.env.SUPER_ADMIN_EMAIL || DEFAULT_EMAIL).trim();
  const password = process.env.SUPER_ADMIN_PASSWORD || DEFAULT_PASSWORD;

  if (!email || !password) {
    throw new Error("Super admin email or password is missing");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const existing = await pool.query<{
    id: number;
    user_type: string | null;
    full_name: string | null;
  }>(
    `
      SELECT id, user_type, full_name
      FROM app_users
      WHERE lower(email) = lower($1)
      LIMIT 1
    `,
    [email]
  );

  if (existing.rowCount && existing.rows[0]) {
    const user = existing.rows[0];
    await pool.query(
      `
        UPDATE app_users
        SET
          password_hash = $1,
          user_type = 'super_admin',
          account_status = 'active',
          full_name = COALESCE(full_name, $2)
        WHERE id = $3
      `,
      [hashedPassword, user.full_name || DEFAULT_NAME, user.id]
    );
    console.log(
      `Super admin updated (id=${user.id}) with email ${email} and active status`
    );
    return;
  }

  const insert = await pool.query<{ id: number }>(
    `
      INSERT INTO app_users (full_name, email, password_hash, user_type, account_status)
      VALUES ($1, $2, $3, 'super_admin', 'active')
      RETURNING id
    `,
    [DEFAULT_NAME, email, hashedPassword]
  );

  console.log(
    `Super admin created with email ${email} (id=${insert.rows[0]?.id ?? "unknown"})`
  );
}

async function run() {
  try {
    await ensureSuperAdmin();
  } catch (error) {
    console.error("Failed to create super admin:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
