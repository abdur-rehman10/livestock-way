import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import authRequired from "../middlewares/auth";
import { ensureHaulerProfile } from "../utils/profileHelpers";

type AuthenticatedRequest = Request & {
  user?: {
    id?: string | number;
    user_type?: string;
  };
};

const router = Router();

const TRUCK_TYPE_VALUES = new Set([
  "cattle_trailer",
  "horse_trailer",
  "sheep_trailer",
  "pig_trailer",
  "mixed_livestock",
  "other",
]);

function normalizeTruckType(value: string) {
  if (!value) return "other";
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return TRUCK_TYPE_VALUES.has(normalized) ? normalized : "other";
}

// CREATE TRUCK
router.post("/", authRequired, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plate_number, capacity, truck_type, description } = req.body;

    if (!plate_number || !capacity || !truck_type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const userId = req.user?.id ? Number(req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const haulerId = await ensureHaulerProfile(userId);
    const normalizedType = normalizeTruckType(truck_type);
    const capacityNumber = Number(capacity);
    if (Number.isNaN(capacityNumber)) {
      return res.status(400).json({ message: "Capacity must be a number" });
    }

    const result = await pool.query(
      `INSERT INTO trucks (
        hauler_id,
        plate_number,
        truck_type,
        capacity_weight_kg,
        status,
        notes
      )
      VALUES ($1,$2,$3,$4,'active',$5)
      RETURNING
        id,
        hauler_id,
        plate_number,
        truck_type,
        capacity_weight_kg AS capacity,
        status,
        notes AS description,
        created_at`,
      [haulerId, plate_number, normalizedType, capacityNumber, description ?? null]
    );

    res.json({ message: "Truck posted", truck: result.rows[0] });
  } catch (err) {
    console.error("POST /trucks error:", err);
    res.status(500).json({ message: "Failed to create truck" });
  }
});

// GET ALL TRUCKS
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        id,
        hauler_id,
        plate_number,
        truck_type,
        capacity_weight_kg AS capacity,
        status,
        notes AS description,
        created_at
      FROM trucks
      ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /trucks error:", err);
    res.status(500).json({ message: "Failed to fetch trucks" });
  }
});

export default router;
