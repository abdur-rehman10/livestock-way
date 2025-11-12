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
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in .env");
}
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
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