"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("./config/database");
const loadRoutes_1 = __importDefault(require("./routes/loadRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const supportRoutes_1 = __importDefault(require("./routes/supportRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const truckRoutes_1 = __importDefault(require("./routes/truckRoutes"));
const loadboardRoutes_1 = __importDefault(require("./routes/loadboardRoutes"));
const driverRoutes_1 = __importDefault(require("./routes/driverRoutes"));
const tripRoutes_1 = __importDefault(require("./routes/tripRoutes"));
const marketplaceRoutes_1 = __importDefault(require("./routes/marketplaceRoutes"));
const serviceRoutes_1 = __importDefault(require("./routes/serviceRoutes"));
const kycRoutes_1 = __importDefault(require("./routes/kycRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const socket_1 = require("./socket");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "..", "uploads")));
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
        await (0, database_1.testDbConnection)();
        const result = await database_1.pool.query("SELECT NOW() AS now");
        res.status(200).json({
            status: "ok",
            dbTime: result.rows[0].now,
            db: process.env.DB_NAME || process.env.DATABASE_URL,
        });
    }
    catch (err) {
        console.error("DB health check failed:", err);
        res
            .status(500)
            .json({ status: "error", message: "DB connection failed" });
    }
});
app.use("/api/loads", loadRoutes_1.default);
app.use("/api/uploads", uploadRoutes_1.default);
app.use("/api/payments", paymentRoutes_1.default);
app.use("/api/support", supportRoutes_1.default);
app.use("/api/auth", authRoutes_1.default);
app.use("/api/trucks", truckRoutes_1.default);
app.use("/api/loadboard", loadboardRoutes_1.default);
app.use("/api/drivers", driverRoutes_1.default);
app.use("/api/trips", tripRoutes_1.default);
app.use("/api/marketplace", marketplaceRoutes_1.default);
app.use("/api/services", serviceRoutes_1.default);
app.use("/api/kyc", kycRoutes_1.default);
app.use("/api/admin", adminRoutes_1.default);
async function bootstrapSuperAdmin() {
    const email = process.env.SUPER_ADMIN_EMAIL || "admin@test.com";
    const password = process.env.SUPER_ADMIN_PASSWORD || "Test12345!";
    const allowBootstrap = (process.env.SUPER_ADMIN_BOOTSTRAP || "false").toLowerCase() === "true";
    if (!allowBootstrap) {
        return;
    }
    try {
        const existing = await database_1.pool.query(`SELECT id FROM app_users WHERE lower(email) = lower($1) AND user_type = 'super_admin' LIMIT 1`, [email]);
        if (existing.rowCount && existing.rows[0]?.id) {
            console.log("Super admin already exists; bootstrap skipped.");
            return;
        }
        const hashed = await bcrypt_1.default.hash(password, 10);
        const insert = await database_1.pool.query(`
        INSERT INTO app_users (full_name, email, password_hash, user_type, account_status)
        VALUES ($1, $2, $3, 'super_admin', 'active')
        RETURNING id
      `, ["Super Admin", email, hashed]);
        console.log(`Super admin bootstrapped with email ${email}. (User ID: ${insert.rows[0]?.id ?? "unknown"})`);
    }
    catch (err) {
        console.error("Failed to bootstrap super admin:", err);
    }
}
bootstrapSuperAdmin();
async function bootstrapPricingConfigs() {
    try {
        const exists = await database_1.pool
            .query(`SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'pricing_configs'
        ) AS exists`)
            .then((r) => r.rows[0]?.exists);
        if (!exists) {
            console.warn("pricing_configs table missing; run migrations before bootstrapping pricing.");
            return;
        }
        const individual = await database_1.pool.query(`SELECT id FROM pricing_configs WHERE target_user_type = 'HAULER_INDIVIDUAL' AND is_active = TRUE LIMIT 1`);
        if (!individual.rowCount) {
            await database_1.pool.query(`
          INSERT INTO pricing_configs (target_user_type, monthly_price, is_active)
          VALUES ('HAULER_INDIVIDUAL', 70, TRUE)
          ON CONFLICT DO NOTHING
        `);
        }
        const company = await database_1.pool.query(`SELECT id FROM pricing_configs WHERE target_user_type = 'HAULER_COMPANY' AND is_active = TRUE LIMIT 1`);
        if (!company.rowCount) {
            await database_1.pool.query(`
          INSERT INTO pricing_configs (target_user_type, is_active)
          VALUES ('HAULER_COMPANY', TRUE)
          ON CONFLICT DO NOTHING
        `);
        }
    }
    catch (err) {
        console.error("Failed to bootstrap pricing configs:", err);
    }
}
bootstrapPricingConfigs();
const PORT = Number(process.env.PORT) || 4000;
const server = http_1.default.createServer(app);
(0, socket_1.initSocket)(server);
server.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
//# sourceMappingURL=server.js.map