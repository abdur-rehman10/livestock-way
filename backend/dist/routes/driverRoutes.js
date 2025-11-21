"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = __importDefault(require("../middlewares/auth"));
const profileHelpers_1 = require("../utils/profileHelpers");
const router = (0, express_1.Router)();
router.use(auth_1.default);
function isHaulerRole(userType) {
    return (userType || "").toUpperCase().includes("HAULER");
}
function isSuperAdminRole(userType) {
    return (userType || "").toUpperCase().includes("SUPER_ADMIN");
}
async function resolveHaulerIdForRequest(req) {
    const userId = req.user?.id ? Number(req.user.id) : null;
    if (!userId)
        return null;
    try {
        const haulerId = await (0, profileHelpers_1.ensureHaulerProfile)(userId);
        return Number(haulerId);
    }
    catch {
        return null;
    }
}
router.post("/", async (req, res) => {
    try {
        const { first_name, last_name, phone, email, license_number, license_expiry, } = req.body;
        if (!first_name || !last_name || !phone || !license_number) {
            return res.status(400).json({
                message: "first_name, last_name, phone and license_number are required",
            });
        }
        const authedReq = req;
        const userType = authedReq.user?.user_type ?? "";
        const isHauler = isHaulerRole(userType);
        const isAdmin = isSuperAdminRole(userType);
        let haulerId = null;
        if (isHauler) {
            haulerId = await resolveHaulerIdForRequest(authedReq);
        }
        else if (isAdmin && req.body?.hauler_id) {
            haulerId = Number(req.body.hauler_id);
        }
        if (!haulerId) {
            return res
                .status(403)
                .json({ message: "Only haulers can create drivers" });
        }
        const haulerCheck = await database_1.pool.query("SELECT id FROM haulers WHERE id = $1 LIMIT 1", [haulerId]);
        if (haulerCheck.rowCount === 0) {
            return res.status(400).json({ message: "Invalid hauler profile" });
        }
        const normalizedPhone = String(phone).trim();
        const fullName = `${first_name} ${last_name}`.trim();
        const insertQuery = `
      INSERT INTO drivers (
        hauler_id,
        full_name,
        phone_number,
        license_number,
        license_expiry,
        status,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,'active',NOW(),NOW())
      RETURNING
        id,
        hauler_id,
        full_name,
        phone_number,
        license_number,
        license_expiry,
        status,
        created_at,
        updated_at
    `;
        const values = [
            haulerId,
            fullName,
            normalizedPhone,
            license_number,
            license_expiry ?? null,
        ];
        const result = await database_1.pool.query(insertQuery, values);
        const driver = {
            ...result.rows[0],
            email: email || null,
        };
        return res.status(201).json(driver);
    }
    catch (err) {
        console.error("Error in POST /api/drivers:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
router.get("/", async (req, res) => {
    try {
        const authedReq = req;
        const userType = authedReq.user?.user_type ?? "";
        const isHauler = isHaulerRole(userType);
        const isAdmin = isSuperAdminRole(userType);
        let haulerId = null;
        if (isHauler) {
            haulerId = await resolveHaulerIdForRequest(authedReq);
        }
        else if (isAdmin && req.query?.hauler_id) {
            haulerId = Number(Array.isArray(req.query.hauler_id)
                ? req.query.hauler_id[0]
                : req.query.hauler_id);
        }
        if (!haulerId) {
            return res.status(403).json({ message: "Only haulers can view drivers" });
        }
        const params = [haulerId];
        let whereClause = `WHERE hauler_id = $1`;
        if (req.query?.status) {
            params.push(String(req.query.status).toLowerCase());
            whereClause += ` AND LOWER(status) = $${params.length}`;
        }
        const query = `
      SELECT
        id,
        hauler_id,
        full_name,
        phone_number,
        license_number,
        license_expiry,
        status,
        created_at,
        updated_at
      FROM drivers
      ${whereClause}
      ORDER BY created_at DESC
    `;
        const result = await database_1.pool.query(query, params);
        const drivers = result.rows.map((row) => ({ ...row, email: null }));
        return res.json({ items: drivers });
    }
    catch (err) {
        console.error("Error in GET /api/drivers:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid driver id" });
        }
        const authedReq = req;
        const userType = authedReq.user?.user_type ?? "";
        const isHauler = isHaulerRole(userType);
        const isAdmin = isSuperAdminRole(userType);
        let haulerId = null;
        if (isHauler) {
            haulerId = await resolveHaulerIdForRequest(authedReq);
        }
        const query = `
      SELECT
        id,
        hauler_id,
        full_name,
        phone_number,
        license_number,
        status,
        created_at,
        updated_at
      FROM drivers
      WHERE id = $1
    `;
        const result = await database_1.pool.query(query, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Driver not found" });
        }
        const driver = result.rows[0];
        if (!isSuperAdminRole(userType) && haulerId !== Number(driver.hauler_id)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        return res.json({ ...driver, email: null });
    }
    catch (err) {
        console.error("Error in GET /api/drivers/:id:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
router.patch("/:id/status", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid driver id" });
        }
        if (!status) {
            return res.status(400).json({ message: "status is required" });
        }
        const normalizedStatus = String(status).toLowerCase();
        const query = `
      UPDATE drivers
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        hauler_id,
        full_name,
        phone_number,
        license_number,
        status,
        created_at,
        updated_at
    `;
        const authedReq = req;
        const userType = authedReq.user?.user_type ?? "";
        const isHauler = isHaulerRole(userType);
        const isAdmin = isSuperAdminRole(userType);
        let haulerId = null;
        if (isHauler) {
            haulerId = await resolveHaulerIdForRequest(authedReq);
        }
        const result = await database_1.pool.query(query, [normalizedStatus, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Driver not found" });
        }
        const driver = result.rows[0];
        if (!isAdmin && haulerId !== Number(driver.hauler_id)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        return res.json({ ...driver, email: null });
    }
    catch (err) {
        console.error("Error in PATCH /api/drivers/:id/status:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid driver id" });
        }
        const authedReq = req;
        const userType = authedReq.user?.user_type ?? "";
        const isHauler = isHaulerRole(userType);
        const isAdmin = isSuperAdminRole(userType);
        let haulerId = null;
        if (isHauler) {
            haulerId = await resolveHaulerIdForRequest(authedReq);
        }
        const result = await database_1.pool.query(`
        UPDATE drivers
        SET status = 'inactive', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Driver not found" });
        }
        const driver = result.rows[0];
        if (!isAdmin && haulerId !== Number(driver.hauler_id)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        return res.json({ ...driver, email: null });
    }
    catch (err) {
        console.error("Error in DELETE /api/drivers/:id:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = router;
//# sourceMappingURL=driverRoutes.js.map