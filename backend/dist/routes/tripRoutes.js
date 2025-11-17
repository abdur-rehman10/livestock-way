"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
function getQueryValue(value) {
    if (typeof value === "string")
        return value;
    if (Array.isArray(value)) {
        const first = value[0];
        return typeof first === "string" ? first : undefined;
    }
    return undefined;
}
function mapStatusToEnum(value) {
    if (!value)
        return null;
    const normalized = value.toLowerCase();
    switch (normalized) {
        case "planned":
            return "planned";
        case "assigned":
            return "assigned";
        case "en_route":
            return "en_route";
        case "in_progress":
            return "en_route";
        case "completed":
            return "completed";
        case "cancelled":
        case "canceled":
            return "cancelled";
        default:
            return null;
    }
}
function buildRestStopPlan(plannedDistanceKm) {
    if (!plannedDistanceKm || Number.isNaN(Number(plannedDistanceKm))) {
        return {
            total_distance_km: null,
            stops: [],
        };
    }
    const distance = Number(plannedDistanceKm);
    const stopIntervalKm = 400;
    const stops = [];
    let covered = stopIntervalKm;
    let stopIndex = 1;
    while (covered < distance) {
        stops.push({
            stop_number: stopIndex,
            at_distance_km: covered,
            notes: "Mandatory animal welfare rest stop (static rule).",
        });
        covered += stopIntervalKm;
        stopIndex += 1;
    }
    return {
        total_distance_km: distance,
        stops,
    };
}
router.post("/", async (req, res) => {
    try {
        const { load_id, hauler_id, truck_id, driver_id, planned_departure_at, planned_arrival_at, planned_distance_km, } = req.body;
        if (!load_id ||
            !hauler_id ||
            !truck_id ||
            !driver_id ||
            !planned_departure_at) {
            return res.status(400).json({
                message: "load_id, hauler_id, truck_id, driver_id and planned_departure_at are required",
            });
        }
        const [loadCheck, haulerCheck, truckCheck, driverCheck] = await Promise.all([
            database_1.pool.query("SELECT id FROM loads WHERE id = $1", [load_id]),
            database_1.pool.query("SELECT id FROM haulers WHERE id = $1", [hauler_id]),
            database_1.pool.query("SELECT id FROM trucks WHERE id = $1", [truck_id]),
            database_1.pool.query("SELECT id FROM drivers WHERE id = $1", [driver_id]),
        ]);
        if (loadCheck.rowCount === 0) {
            return res.status(400).json({ message: "Invalid load_id" });
        }
        if (haulerCheck.rowCount === 0) {
            return res.status(400).json({ message: "Invalid hauler_id" });
        }
        if (truckCheck.rowCount === 0) {
            return res.status(400).json({ message: "Invalid truck_id" });
        }
        if (driverCheck.rowCount === 0) {
            return res.status(400).json({ message: "Invalid driver_id" });
        }
        const restStopPlan = buildRestStopPlan(planned_distance_km);
        const insertQuery = `
      INSERT INTO trips (
        load_id,
        hauler_id,
        truck_id,
        driver_id,
        status,
        planned_start_time,
        planned_end_time,
        route_distance_km,
        rest_stop_plan_json,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,
        'planned',
        $5,$6,$7,$8::jsonb,
        NOW(),NOW()
      )
      RETURNING
        id,
        load_id,
        hauler_id,
        truck_id,
        driver_id,
        status,
        planned_start_time,
        planned_end_time,
        route_distance_km,
        rest_stop_plan_json,
        created_at,
        updated_at
    `;
        const values = [
            load_id,
            hauler_id,
            truck_id,
            driver_id,
            planned_departure_at,
            planned_arrival_at || null,
            planned_distance_km || null,
            JSON.stringify(restStopPlan),
        ];
        const result = await database_1.pool.query(insertQuery, values);
        return res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error("Error in POST /api/trips:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
router.get("/", async (req, res) => {
    try {
        const { status, hauler_id, driver_id, truck_id, load_id } = req.query;
        const conditions = [];
        const params = [];
        const statusValue = mapStatusToEnum(getQueryValue(status));
        if (statusValue) {
            params.push(statusValue);
            conditions.push(`status = $${params.length}::trip_status_enum`);
        }
        const pushCondition = (value, clauseBuilder) => {
            const normalized = getQueryValue(value);
            if (!normalized)
                return;
            params.push(normalized);
            conditions.push(clauseBuilder(params.length));
        };
        pushCondition(hauler_id, (i) => `hauler_id = $${i}`);
        pushCondition(driver_id, (i) => `driver_id = $${i}`);
        pushCondition(truck_id, (i) => `truck_id = $${i}`);
        pushCondition(load_id, (i) => `load_id = $${i}`);
        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const query = `
      SELECT
        id,
        load_id,
        hauler_id,
        truck_id,
        driver_id,
        status,
        planned_start_time,
        planned_end_time,
        route_distance_km,
        rest_stop_plan_json,
        created_at,
        updated_at
      FROM trips
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 200
    `;
        const result = await database_1.pool.query(query, params);
        return res.json(result.rows);
    }
    catch (err) {
        console.error("Error in GET /api/trips:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid trip id" });
        }
        const query = `
      SELECT
        id,
        load_id,
        hauler_id,
        truck_id,
        driver_id,
        status,
        planned_start_time,
        planned_end_time,
        route_distance_km,
        rest_stop_plan_json,
        created_at,
        updated_at
      FROM trips
      WHERE id = $1
    `;
        const result = await database_1.pool.query(query, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Trip not found" });
        }
        return res.json(result.rows[0]);
    }
    catch (err) {
        console.error("Error in GET /api/trips/:id:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
router.patch("/:id/status", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid trip id" });
        }
        if (!status) {
            return res.status(400).json({ message: "status is required" });
        }
        const normalizedStatus = mapStatusToEnum(String(status));
        if (!normalizedStatus) {
            return res.status(400).json({ message: "Invalid status value" });
        }
        const query = `
      UPDATE trips
      SET status = $1::trip_status_enum, updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        load_id,
        hauler_id,
        truck_id,
        driver_id,
        status,
        planned_start_time,
        planned_end_time,
        route_distance_km,
        rest_stop_plan_json,
        created_at,
        updated_at
    `;
        const result = await database_1.pool.query(query, [normalizedStatus, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Trip not found" });
        }
        return res.json(result.rows[0]);
    }
    catch (err) {
        console.error("Error in PATCH /api/trips/:id/status:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = router;
//# sourceMappingURL=tripRoutes.js.map