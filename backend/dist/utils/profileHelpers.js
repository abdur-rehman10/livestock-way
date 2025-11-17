"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureShipperProfile = ensureShipperProfile;
exports.ensureHaulerProfile = ensureHaulerProfile;
const database_1 = require("../config/database");
async function getUserName(userId) {
    const result = await database_1.pool.query("SELECT full_name FROM app_users WHERE id = $1", [userId]);
    return result.rows[0]?.full_name || null;
}
async function ensureShipperProfile(userId) {
    const existing = await database_1.pool.query("SELECT id FROM shippers WHERE user_id = $1 LIMIT 1", [userId]);
    if (existing.rowCount) {
        return existing.rows[0].id;
    }
    const fallbackName = (await getUserName(userId)) || "LivestockWay Shipper";
    const registrationId = `SHIP-${Date.now()}`;
    const inserted = await database_1.pool.query(`INSERT INTO shippers (user_id, farm_name, registration_id)
     VALUES ($1, $2, $3)
     RETURNING id`, [userId, fallbackName, registrationId]);
    return inserted.rows[0].id;
}
async function ensureHaulerProfile(userId) {
    const existing = await database_1.pool.query("SELECT id FROM haulers WHERE user_id = $1 LIMIT 1", [userId]);
    if (existing.rowCount) {
        return existing.rows[0].id;
    }
    const fallbackName = (await getUserName(userId)) || "LivestockWay Hauler";
    const dotNumber = `DOT-${Date.now()}`;
    const inserted = await database_1.pool.query(`INSERT INTO haulers (user_id, legal_name, dot_number)
     VALUES ($1, $2, $3)
     RETURNING id`, [userId, fallbackName, dotNumber]);
    return inserted.rows[0].id;
}
//# sourceMappingURL=profileHelpers.js.map