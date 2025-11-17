import { Pool, PoolConfig } from "pg";
import dotenv from "dotenv";

dotenv.config();

const {
  DATABASE_URL,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
} = process.env;

const poolConfig: PoolConfig = {};

if (DATABASE_URL) {
  poolConfig.connectionString = DATABASE_URL;
} else {
  if (!DB_NAME || !DB_USER) {
    throw new Error(
      "Database credentials are missing. Provide DATABASE_URL or DB_* env vars."
    );
  }

  poolConfig.host = DB_HOST || "localhost";
  poolConfig.port = DB_PORT ? Number(DB_PORT) : 5432;
  poolConfig.database = DB_NAME;
  poolConfig.user = DB_USER;
  poolConfig.password = DB_PASSWORD;
}

export const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
  process.exit(-1);
});

// Simple helper to test the connection
export async function testDbConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT NOW()");
    console.log("📦 DB connected. Time:", result.rows[0].now);
  } finally {
    client.release();
  }
}
