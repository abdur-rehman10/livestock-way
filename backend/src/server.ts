import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { testDbConnection, pool } from "./config/database";
import loadRoutes from "./routes/loadRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import supportRoutes from "./routes/supportRoutes";
import authRoutes from "./routes/authRoutes";

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

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
