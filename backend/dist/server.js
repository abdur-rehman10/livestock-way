"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const loadRoutes_1 = __importDefault(require("./routes/loadRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/", (_req, res) => {
    res.send("LivestockWay backend is up");
});
// Health route
app.get("/health", (_req, res) => {
    res
        .status(200)
        .json({ status: "OK", message: "LivestockWay backend is running 🚀" });
});
// DB test route
app.get("/db-test", async (_req, res) => {
    try {
        await (0, database_1.testDbConnection)();
        const result = await database_1.pool.query("SELECT NOW() AS now");
        res
            .status(200)
            .json({ status: "OK", message: "Database reachable", time: result.rows[0].now });
    }
    catch (err) {
        console.error("Database test failed:", err);
        res.status(500).json({ status: "ERROR", message: "Database connection failed" });
    }
});
app.use("/api/loads", loadRoutes_1.default);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map