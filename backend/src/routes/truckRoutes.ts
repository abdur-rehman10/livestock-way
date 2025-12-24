import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import authRequired from "../middlewares/auth";
import { requireRoles } from "../middlewares/rbac";
import { auditRequest } from "../middlewares/auditLogger";
import { ensureHaulerProfile } from "../utils/profileHelpers";

type AuthenticatedRequest = Request & {
  user?: {
    id?: string | number;
    user_type?: string;
  };
};

type AuthedRequest = Request & {
  user?: { id?: string | number; user_type?: string | null };
};

const router = Router();
router.use(authRequired);

const TRUCK_TYPE_VALUES = new Set([
  "cattle_trailer",
  "horse_trailer",
  "sheep_trailer",
  "pig_trailer",
  "mixed_livestock",
  "other",
]);

type TruckNotesMeta = {
  truck_name?: string | null;
  species_supported?: string | null;
  notes?: string | null;
};

async function getHaulerMeta(haulerId: number) {
  const { rows } = await pool.query(
    `
      SELECT
        hauler_type,
        (SELECT COUNT(*) FROM trucks t WHERE t.hauler_id = h.id AND t.status <> 'inactive')::int AS truck_count,
        (SELECT COUNT(*) FROM drivers d WHERE d.hauler_id = h.id)::int AS driver_count
      FROM haulers h
      WHERE h.id = $1
      LIMIT 1
    `,
    [haulerId]
  );
  return rows[0] ?? null;
}

function normalizeTruckType(value: string) {
  if (!value) return "other";
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return TRUCK_TYPE_VALUES.has(normalized) ? normalized : "other";
}

function serializeTruckNotes(meta: TruckNotesMeta) {
  if (!meta.truck_name && !meta.species_supported) {
    return meta.notes ?? null;
  }
  return JSON.stringify(meta);
}

function parseTruckNotes(raw: string | null): TruckNotesMeta {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as TruckNotesMeta;
    }
  } catch {
    // not JSON, fall back below
  }
  return { notes: raw };
}

function mapTruckRow(row: any) {
  const meta = parseTruckNotes(row.notes ?? row.description ?? null);
  return {
    id: row.id,
    hauler_id: row.hauler_id,
    plate_number: row.plate_number,
    truck_type: row.truck_type,
    capacity: row.capacity,
    status: row.status,
    notes: meta.notes ?? null,
    truck_name: meta.truck_name ?? null,
    species_supported: meta.species_supported ?? null,
    created_at: row.created_at,
  };
}

// CREATE TRUCK
router.post(
  "/",
  requireRoles(["hauler"], { allowSuperAdminOverride: false }),
  auditRequest("truck:create"),
  async (req: AuthedRequest, res: Response) => {
  try {
    const {
      truck_name,
      plate_number,
      capacity_lbs,
      capacity,
      equipment_type,
      truck_type,
      species_supported,
      notes,
      description,
    } = req.body;

    if (!truck_name || !plate_number) {
      return res
        .status(400)
        .json({ message: "truck_name and plate_number are required" });
    }

    const userId = req.user?.id ? Number(req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const haulerId = await ensureHaulerProfile(userId);
    const haulerMeta = await getHaulerMeta(haulerId);
    const haulerType = (haulerMeta?.hauler_type ?? "company").toString().toLowerCase();
    if (haulerType === "individual" && Number(haulerMeta?.truck_count ?? 0) >= 1) {
      return res.status(400).json({ message: "Individual haulers can only register one truck." });
    }
    const normalizedType = normalizeTruckType(equipment_type || truck_type);

    const capacityInput =
      capacity_lbs ?? capacity ?? req.body.capacity_weight_kg ?? null;
    const capacityNumber =
      capacityInput !== null && capacityInput !== undefined
        ? Number(capacityInput) * (capacity_lbs ? 0.453592 : 1)
        : null;

    if (capacityNumber !== null && Number.isNaN(capacityNumber)) {
      return res.status(400).json({ message: "Capacity must be numeric" });
    }

    const notesPayload: TruckNotesMeta = {
      truck_name,
      species_supported: species_supported ?? null,
      notes: notes ?? description ?? null,
    };

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
        notes,
        created_at`,
      [haulerId, plate_number, normalizedType, capacityNumber, serializeTruckNotes(notesPayload)]
    );

    const truck = mapTruckRow(result.rows[0]);
    res.status(201).json({ message: "Truck created", truck });
  } catch (err) {
    console.error("POST /trucks error:", err);
    res.status(500).json({ message: "Failed to create truck" });
  }
  }
);

// GET ALL TRUCKS
router.get("/", requireRoles(["hauler"]), async (req: AuthedRequest, res: Response) => {
  try {
    const userRole = req.user?.user_type ?? "";
    const isHauler = userRole === "hauler";
    const isAdmin = userRole === "super-admin";
    let haulerId: number | null = null;
    if (isHauler) {
      haulerId = await ensureHaulerProfile(Number(req.user?.id));
    } else if (isAdmin && req.query?.hauler_id) {
      haulerId = Number(
        Array.isArray(req.query.hauler_id)
          ? req.query.hauler_id[0]
          : req.query.hauler_id
      );
    }
    if (!haulerId) {
      return res.status(403).json({ message: "Only haulers can view trucks" });
    }

    const result = await pool.query(
      `SELECT
        id,
        hauler_id,
        plate_number,
        truck_type,
        capacity_weight_kg AS capacity,
        status,
        notes,
        created_at
      FROM trucks
      WHERE hauler_id = $1 AND status <> 'inactive'
      ORDER BY created_at DESC`,
      [haulerId]
    );
    const trucks = result.rows.map(mapTruckRow);
    res.json({ items: trucks });
  } catch (err) {
    console.error("GET /trucks error:", err);
    res.status(500).json({ message: "Failed to fetch trucks" });
  }
});

// GET truck detail
router.get("/:id", requireRoles(["hauler"]), async (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid truck id" });
  }

  try {
    const result = await pool.query(
      `SELECT
        id,
        hauler_id,
        plate_number,
        truck_type,
        capacity_weight_kg AS capacity,
        status,
        notes,
        created_at
      FROM trucks
      WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Truck not found" });
    }

    const truck = result.rows[0];
    const userRole = req.user?.user_type ?? "";
    if (
      userRole !== "super-admin" &&
      Number(truck.hauler_id) !== (await ensureHaulerProfile(Number(req.user?.id)))
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json(mapTruckRow(truck));
  } catch (err) {
    console.error("GET /trucks/:id error:", err);
    res.status(500).json({ message: "Failed to fetch truck" });
  }
});

router.delete(
  "/:id",
  requireRoles(["hauler"], { allowSuperAdminOverride: false }),
  auditRequest("truck:delete", (req) => `truck:${req.params.id}`),
  async (req: AuthedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid truck id" });
    }
    const haulerId = await ensureHaulerProfile(Number(req.user?.id));
    const result = await pool.query(
      `
        UPDATE trucks
        SET status = 'inactive', updated_at = NOW()
        WHERE id = $1 AND hauler_id = $2
        RETURNING *
      `,
      [id, haulerId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Truck not found" });
    }
    res.json(mapTruckRow(result.rows[0]));
  } catch (err) {
    console.error("DELETE /trucks/:id error:", err);
    res.status(500).json({ message: "Failed to deactivate truck" });
  }
  }
);

export default router;
