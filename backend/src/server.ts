import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcrypt";
import { testDbConnection, pool } from "./config/database";
import loadRoutes from "./routes/loadRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import supportRoutes from "./routes/supportRoutes";
import authRoutes from "./routes/authRoutes";
import truckRoutes from "./routes/truckRoutes";
import loadboardRoutes from "./routes/loadboardRoutes";
import driverRoutes from "./routes/driverRoutes";
import tripRoutes from "./routes/tripRoutes";
import marketplaceRoutes from "./routes/marketplaceRoutes";
import serviceRoutes from "./routes/serviceRoutes";
import kycRoutes from "./routes/kycRoutes";
import adminRoutes from "./routes/adminRoutes";
import { initSocket } from "./socket";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"))
);

app.get("/", (_req, res) => {
  res.send("LivestockWay backend is up");
});

// Health route
app.get("/health", (_req, res) => {
  res
    .status(200)
    .json({ status: "OK", message: "LivestockWay backend is running 🚀" });
});

// DB health route
app.get("/health/db", async (_req, res) => {
  try {
    await testDbConnection();
    const result = await pool.query("SELECT NOW() AS now");
    res.status(200).json({
      status: "ok",
      dbTime: result.rows[0].now,
      db: process.env.DB_NAME || process.env.DATABASE_URL,
    });
  } catch (err) {
    console.error("DB health check failed:", err);
    res
      .status(500)
      .json({ status: "error", message: "DB connection failed" });
  }
});

app.use("/api/loads", loadRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/trucks", truckRoutes);
app.use("/api/loadboard", loadboardRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/admin", adminRoutes);

async function bootstrapSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@test.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "Test12345!";
  const allowBootstrap = (process.env.SUPER_ADMIN_BOOTSTRAP || "false").toLowerCase() === "true";
  if (!allowBootstrap) {
    return;
  }
  try {
    const existing = await pool.query(
      `SELECT id FROM app_users WHERE lower(email) = lower($1) AND user_type = 'super_admin' LIMIT 1`,
      [email]
    );
    if (existing.rowCount && existing.rows[0]?.id) {
      console.log("Super admin already exists; bootstrap skipped.");
      return;
    }
    const hashed = await bcrypt.hash(password, 10);
    const insert = await pool.query(
      `
        INSERT INTO app_users (full_name, email, password_hash, user_type, account_status)
        VALUES ($1, $2, $3, 'super_admin', 'active')
        RETURNING id
      `,
      ["Super Admin", email, hashed]
    );
    console.log(
      `Super admin bootstrapped with email ${email}. (User ID: ${insert.rows[0]?.id ?? "unknown"})`
    );
  } catch (err) {
    console.error("Failed to bootstrap super admin:", err);
  }
}

bootstrapSuperAdmin();

const PORT = Number(process.env.PORT) || 4000;
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});

export { app };
