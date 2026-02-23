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
import haulerRoutes from "./routes/haulerRoutes";
import pricingRoutes from "./routes/pricingRoutes";
import externalIngestRoutes from "./routes/externalIngestRoutes";
import jobRoutes from "./routes/jobRoutes";
import jobMessagesRoutes from "./routes/jobMessagesRoutes";
import buyAndSellRoutes from "./routes/buyAndSellRoutes";
import buySellMessagesRoutes from "./routes/buySellMessagesRoutes";
import resourcesRoutes from "./routes/resourcesRoutes";
import resourcesMessagesRoutes from "./routes/resourcesMessagesRoutes";
import loadOfferMessagesRoutes from "./routes/loadOfferMessagesRoutes";
import truckBookingMessagesRoutes from "./routes/truckBookingMessagesRoutes";
import blogRoutes from "./routes/blogRoutes";
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
app.use("/api/hauler", haulerRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/external", externalIngestRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/job-messages", jobMessagesRoutes);
app.use("/api/buy-and-sell", buyAndSellRoutes);
app.use("/api/buy-sell-messages", buySellMessagesRoutes);
app.use("/api/resources", resourcesRoutes);
app.use("/api/resources-messages", resourcesMessagesRoutes);
app.use("/api/load-offer-messages", loadOfferMessagesRoutes);
app.use("/api/truck-booking-messages", truckBookingMessagesRoutes);
app.use("/api/blogs", blogRoutes);

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

async function bootstrapPricingConfigs() {
  try {
    const exists = await pool
      .query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'pricing_configs'
        ) AS exists`
      )
      .then((r) => r.rows[0]?.exists);
    if (!exists) {
      console.warn("pricing_configs table missing; run migrations before bootstrapping pricing.");
      return;
    }

    const individual = await pool.query(
      `SELECT id FROM pricing_configs WHERE target_user_type = 'HAULER_INDIVIDUAL' AND is_active = TRUE LIMIT 1`
    );
    if (!individual.rowCount) {
      await pool.query(
        `
          INSERT INTO pricing_configs (target_user_type, monthly_price, is_active)
          VALUES ('HAULER_INDIVIDUAL', 70, TRUE)
          ON CONFLICT DO NOTHING
        `
      );
    }

    const company = await pool.query(
      `SELECT id FROM pricing_configs WHERE target_user_type = 'HAULER_COMPANY' AND is_active = TRUE LIMIT 1`
    );
    if (!company.rowCount) {
      await pool.query(
        `
          INSERT INTO pricing_configs (target_user_type, is_active)
          VALUES ('HAULER_COMPANY', TRUE)
          ON CONFLICT DO NOTHING
        `
      );
    }
  } catch (err) {
    console.error("Failed to bootstrap pricing configs:", err);
  }
}

bootstrapPricingConfigs();

const PORT = Number(process.env.PORT) || 4000;
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});

export { app };
