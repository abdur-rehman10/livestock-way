"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testDbConnection = testDbConnection;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const { DATABASE_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, } = process.env;
const poolConfig = {};
if (DATABASE_URL) {
    poolConfig.connectionString = DATABASE_URL;
}
else {
    if (!DB_NAME || !DB_USER) {
        throw new Error("Database credentials are missing. Provide DATABASE_URL or DB_* env vars.");
    }
    poolConfig.host = DB_HOST || "localhost";
    poolConfig.port = DB_PORT ? Number(DB_PORT) : 5432;
    poolConfig.database = DB_NAME;
    poolConfig.user = DB_USER;
    poolConfig.password = DB_PASSWORD;
}
exports.pool = new pg_1.Pool(poolConfig);
exports.pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client", err);
    process.exit(-1);
});
// Simple helper to test the connection
async function testDbConnection() {
    const client = await exports.pool.connect();
    try {
        const result = await client.query("SELECT NOW()");
        console.log("📦 DB connected. Time:", result.rows[0].now);
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=database.js.map