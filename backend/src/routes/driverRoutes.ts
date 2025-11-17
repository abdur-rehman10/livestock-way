import { Router, Request, Response } from "express";
import { pool } from "../config/database";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      hauler_id,
      first_name,
      last_name,
      phone,
      email,
      license_number,
    } = req.body;

    if (!hauler_id || !first_name || !last_name || !phone || !license_number) {
      return res.status(400).json({
        message:
          "hauler_id, first_name, last_name, phone and license_number are required",
      });
    }

    const haulerCheck = await pool.query(
      "SELECT id FROM haulers WHERE id = $1 LIMIT 1",
      [hauler_id]
    );

    if (haulerCheck.rowCount === 0) {
      return res.status(400).json({ message: "Invalid hauler_id" });
    }

    const fullName = `${first_name} ${last_name}`.trim();

    const insertQuery = `
      INSERT INTO drivers (
        hauler_id,
        full_name,
        phone_number,
        license_number,
        status,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,'active',NOW(),NOW())
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

    const values = [hauler_id, fullName, phone, license_number];
    const result = await pool.query(insertQuery, values);

    const driver = {
      ...result.rows[0],
      email: email || null,
    };

    return res.status(201).json(driver);
  } catch (err) {
    console.error("Error in POST /api/drivers:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const { hauler_id, status } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (hauler_id) {
      const value = Array.isArray(hauler_id) ? hauler_id[0] : hauler_id;
      params.push(value);
      conditions.push(`hauler_id = $${params.length}`);
    }

    if (status) {
      const value = Array.isArray(status) ? status[0] : status;
      params.push(value?.toString().toLowerCase());
      conditions.push(`LOWER(status) = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

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
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 200
    `;

    const result = await pool.query(query, params);
    const drivers = result.rows.map((row) => ({ ...row, email: null }));
    return res.json(drivers);
  } catch (err) {
    console.error("Error in GET /api/drivers:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid driver id" });
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

    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    return res.json({ ...result.rows[0], email: null });
  } catch (err) {
    console.error("Error in GET /api/drivers/:id:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id/status", async (req: Request, res: Response) => {
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

    const result = await pool.query(query, [normalizedStatus, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    return res.json({ ...result.rows[0], email: null });
  } catch (err) {
    console.error("Error in PATCH /api/drivers/:id/status:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
