import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testDbConnection, pool } from "./config/database";
import loadRoutes from "./routes/loadRoutes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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
    await testDbConnection();
    const result = await pool.query("SELECT NOW() AS now");
    res
      .status(200)
      .json({ status: "OK", message: "Database reachable", time: result.rows[0].now });
  } catch (err) {
    console.error("Database test failed:", err);
    res.status(500).json({ status: "ERROR", message: "Database connection failed" });
  }
});

app.use("/api/loads", loadRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
