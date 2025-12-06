"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("../config/database");
dotenv_1.default.config();
const DEFAULT_EMAIL = "admin@livestockway.com";
const DEFAULT_PASSWORD = "Hello.123$";
const DEFAULT_NAME = "Super Admin";
async function ensureSuperAdmin() {
    const email = (process.env.SUPER_ADMIN_EMAIL || DEFAULT_EMAIL).trim();
    const password = process.env.SUPER_ADMIN_PASSWORD || DEFAULT_PASSWORD;
    if (!email || !password) {
        throw new Error("Super admin email or password is missing");
    }
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    const existing = await database_1.pool.query(`
      SELECT id, user_type, full_name
      FROM app_users
      WHERE lower(email) = lower($1)
      LIMIT 1
    `, [email]);
    if (existing.rowCount && existing.rows[0]) {
        const user = existing.rows[0];
        await database_1.pool.query(`
        UPDATE app_users
        SET
          password_hash = $1,
          user_type = 'super_admin',
          account_status = 'active',
          full_name = COALESCE(full_name, $2)
        WHERE id = $3
      `, [hashedPassword, user.full_name || DEFAULT_NAME, user.id]);
        console.log(`Super admin updated (id=${user.id}) with email ${email} and active status`);
        return;
    }
    const insert = await database_1.pool.query(`
      INSERT INTO app_users (full_name, email, password_hash, user_type, account_status)
      VALUES ($1, $2, $3, 'super_admin', 'active')
      RETURNING id
    `, [DEFAULT_NAME, email, hashedPassword]);
    console.log(`Super admin created with email ${email} (id=${insert.rows[0]?.id ?? "unknown"})`);
}
async function run() {
    try {
        await ensureSuperAdmin();
    }
    catch (error) {
        console.error("Failed to create super admin:", error);
        process.exitCode = 1;
    }
    finally {
        await database_1.pool.end();
    }
}
run();
//# sourceMappingURL=createSuperAdmin.js.map