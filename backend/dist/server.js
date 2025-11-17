"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./config/database");
const loadRoutes_1 = __importDefault(require("./routes/loadRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const supportRoutes_1 = __importDefault(require("./routes/supportRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const truckRoutes_1 = __importDefault(require("./routes/truckRoutes"));
const loadboardRoutes_1 = __importDefault(require("./routes/loadboardRoutes"));
const driverRoutes_1 = __importDefault(require("./routes/driverRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
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
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map