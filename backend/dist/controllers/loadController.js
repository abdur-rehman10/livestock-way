"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoads = getLoads;
exports.createLoad = createLoad;
exports.assignLoad = assignLoad;
const database_1 = require("../config/database");
// GET /api/loads
async function getLoads(req, res) {
    try {
        const createdBy = req.query.created_by;
        const assignedTo = req.query.assigned_to;
        let query = `
      SELECT
        id,
        title,
        species,
        quantity,
        pickup_location,
        dropoff_location,
        pickup_date,
        offer_price,
        status,
        created_by,
        created_at,
        assigned_to,
        assigned_at,
        started_at,
        completed_at,
        epod_url
      FROM loads
    `;
        const clauses = [];
        const values = [];
        if (createdBy) {
            clauses.push(`created_by = $${values.length + 1}`);
            values.push(createdBy);
        }
        if (assignedTo) {
            clauses.push(`assigned_to = $${values.length + 1}`);
            values.push(assignedTo);
        }
        if (clauses.length) {
            query += ` WHERE ${clauses.join(" AND ")}`;
        }
        else {
            query += ` WHERE status = 'open'`;
        }
        query += ` ORDER BY pickup_date ASC`;
        console.debug("GET_LOADS SQL:", query, "VALUES:", values);
        const result = await database_1.pool.query(query, values);
        return res.status(200).json({
            status: "OK",
            data: result.rows,
        });
    }
    catch (error) {
        console.error("Error fetching loads:", error);
        return res.status(500).json({
            status: "ERROR",
            message: "Failed to fetch loads",
        });
    }
}
// POST /api/loads
async function createLoad(req, res) {
    try {
        const { title, species, quantity, pickup_location, dropoff_location, pickup_date, offer_price, created_by, } = req.body;
        if (!title ||
            !species ||
            !quantity ||
            !pickup_location ||
            !dropoff_location ||
            !pickup_date) {
            return res
                .status(400)
                .json({ status: "ERROR", message: "Missing required fields" });
        }
        const insertQuery = `
      INSERT INTO loads (
        title,
        species,
        quantity,
        pickup_location,
        dropoff_location,
        pickup_date,
        offer_price,
        status,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8)
      RETURNING
        id,
        title,
        species,
        quantity,
        pickup_location,
        dropoff_location,
        pickup_date,
        offer_price,
        status,
        created_by,
        created_at
    `;
        const values = [
            title,
            species,
            quantity,
            pickup_location,
            dropoff_location,
            pickup_date,
            offer_price ?? null,
            created_by ?? null,
        ];
        const result = await database_1.pool.query(insertQuery, values);
        return res.status(201).json({
            status: "OK",
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error("Error creating load:", error);
        return res
            .status(500)
            .json({ status: "ERROR", message: "Failed to create load" });
    }
}
// POST /api/loads/:id/assign
async function assignLoad(req, res) {
    try {
        const { id } = req.params;
        const { assigned_to } = req.body;
        console.debug("ASSIGN_LOAD: id=", id, "assigned_to=", assigned_to);
        if (!id) {
            return res.status(400).json({
                status: "ERROR",
                message: "Load ID is required",
            });
        }
        if (!assigned_to) {
            return res.status(400).json({
                status: "ERROR",
                message: "assigned_to is required",
            });
        }
        const updateQuery = `
      UPDATE loads
      SET
        assigned_to = $1,
        assigned_at = NOW(),
        status = 'assigned'
      WHERE id = $2 AND status = 'open'
      RETURNING
        id,
        title,
        species,
        quantity,
        pickup_location,
        dropoff_location,
        pickup_date,
        offer_price,
        status,
        created_by,
        created_at,
        assigned_to,
        assigned_at
    `;
        const values = [assigned_to, id];
        const result = await database_1.pool.query(updateQuery, values);
        console.debug("ASSIGN_LOAD result rows:", result.rows.length);
        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "ERROR",
                message: "Load not found or not open",
            });
        }
        return res.status(200).json({
            status: "OK",
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error("Error assigning load:", error);
        return res.status(500).json({
            status: "ERROR",
            message: "Failed to assign load",
        });
    }
}
//# sourceMappingURL=loadController.js.map