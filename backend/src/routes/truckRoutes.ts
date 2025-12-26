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
    height_m: row.height_m ?? null,
    width_m: row.width_m ?? null,
    length_m: row.length_m ?? null,
    axle_count: row.axle_count ?? null,
    max_gross_weight_kg: row.max_gross_weight_kg ?? null,
    max_axle_weight_kg: row.max_axle_weight_kg ?? null,
    hazmat_permitted: row.hazmat_permitted ?? false,
    status: row.status,
    notes: meta.notes ?? null,
    truck_name: meta.truck_name ?? null,
    species_supported: meta.species_supported ?? null,
    is_external: row.is_external ?? false,
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
      height_m,
      width_m,
      length_m,
      axle_count,
      max_gross_weight_kg,
      max_axle_weight_kg,
      hazmat_permitted,
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

    const heightValue = height_m !== undefined && height_m !== null ? Number(height_m) : null;
    if (heightValue !== null && Number.isNaN(heightValue)) {
      return res.status(400).json({ message: "Height must be numeric" });
    }

    const widthValue = width_m !== undefined && width_m !== null ? Number(width_m) : null;
    if (widthValue !== null && Number.isNaN(widthValue)) {
      return res.status(400).json({ message: "Width must be numeric" });
    }

    const lengthValue = length_m !== undefined && length_m !== null ? Number(length_m) : null;
    if (lengthValue !== null && Number.isNaN(lengthValue)) {
      return res.status(400).json({ message: "Length must be numeric" });
    }

    const axleValue = axle_count !== undefined && axle_count !== null ? Number(axle_count) : null;
    if (axleValue !== null && (Number.isNaN(axleValue) || !Number.isInteger(axleValue))) {
      return res.status(400).json({ message: "Axle count must be an integer" });
    }

    const maxGrossValue =
      max_gross_weight_kg !== undefined && max_gross_weight_kg !== null
        ? Number(max_gross_weight_kg)
        : null;
    if (maxGrossValue !== null && Number.isNaN(maxGrossValue)) {
      return res.status(400).json({ message: "Max gross weight must be numeric" });
    }

    const maxAxleValue =
      max_axle_weight_kg !== undefined && max_axle_weight_kg !== null
        ? Number(max_axle_weight_kg)
        : null;
    if (maxAxleValue !== null && Number.isNaN(maxAxleValue)) {
      return res.status(400).json({ message: "Max axle weight must be numeric" });
    }

    const notesPayload: TruckNotesMeta = {
      truck_name,
      species_supported: species_supported ?? null,
      notes: notes ?? description ?? null,
    };

    // Check for existing plate for this hauler
    const existing = await pool.query(
      `SELECT * FROM trucks WHERE hauler_id = $1 AND plate_number = $2 LIMIT 1`,
      [haulerId, plate_number]
    );

    if (existing.rowCount && existing.rows[0]?.status === "inactive") {
      const reactivate = await pool.query(
        `
          UPDATE trucks
          SET truck_type = $2,
              capacity_weight_kg = $3,
              height_m = $4,
              width_m = $5,
              length_m = $6,
              axle_count = $7,
              max_gross_weight_kg = $8,
              max_axle_weight_kg = $9,
              hazmat_permitted = $10,
              status = 'active',
              notes = $11,
              updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            hauler_id,
            plate_number,
            truck_type,
            capacity_weight_kg AS capacity,
            height_m,
            width_m,
            length_m,
            axle_count,
            max_gross_weight_kg,
            max_axle_weight_kg,
            hazmat_permitted,
            status,
            notes,
            created_at
        `,
        [
          existing.rows[0].id,
          normalizedType,
          capacityNumber,
          heightValue,
          widthValue,
          lengthValue,
          axleValue,
          maxGrossValue,
          maxAxleValue,
          Boolean(hazmat_permitted),
          serializeTruckNotes(notesPayload),
        ]
      );
      const truck = mapTruckRow(reactivate.rows[0]);
      return res.status(200).json({ message: "Truck reactivated", truck });
    }

    if (existing.rowCount && existing.rows[0]) {
      return res.status(400).json({ message: "A truck with this plate already exists for this hauler" });
    }

    const result = await pool.query(
      `INSERT INTO trucks (
        hauler_id,
        plate_number,
        truck_type,
        capacity_weight_kg,
        height_m,
        width_m,
        length_m,
        axle_count,
        max_gross_weight_kg,
        max_axle_weight_kg,
        hazmat_permitted,
        status,
        notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',$12)
      RETURNING
        id,
        hauler_id,
        plate_number,
        truck_type,
        capacity_weight_kg AS capacity,
        height_m,
        width_m,
        length_m,
        axle_count,
        max_gross_weight_kg,
        max_axle_weight_kg,
        hazmat_permitted,
        status,
        notes,
        is_external,
        created_at`,
      [
        haulerId,
        plate_number,
        normalizedType,
        capacityNumber,
        heightValue,
        widthValue,
        lengthValue,
        axleValue,
        maxGrossValue,
        maxAxleValue,
        Boolean(hazmat_permitted),
        serializeTruckNotes(notesPayload),
      ]
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
        height_m,
        width_m,
        length_m,
        axle_count,
        max_gross_weight_kg,
        max_axle_weight_kg,
        hazmat_permitted,
        status,
        notes,
        is_external,
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
        height_m,
        width_m,
        length_m,
        axle_count,
        max_gross_weight_kg,
        max_axle_weight_kg,
        hazmat_permitted,
        status,
        notes,
        is_external,
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

    // Prevent delete if truck has active trips or active availability.
    const activeTripStatuses = [
      "pending_escrow",
      "ready_to_start",
      "in_progress",
      "delivered_awaiting_confirmation",
      "disputed",
      "planned",
      "assigned",
      "en_route",
    ];
    const tripBlock = await pool.query(
      `
        SELECT 1
        FROM trips
        WHERE truck_id = $1
          AND lower(status::text) = ANY($2)
        LIMIT 1
      `,
      [id, activeTripStatuses]
    );
    if (tripBlock.rowCount && tripBlock.rowCount > 0) {
      return res.status(400).json({ message: "Truck is assigned to an active trip and cannot be deleted." });
    }
    const availabilityBlock = await pool.query(
      `
        SELECT 1
        FROM truck_availability
        WHERE truck_id = $1
          AND is_active = TRUE
        LIMIT 1
      `,
      [id]
    );
    if (availabilityBlock.rowCount && availabilityBlock.rowCount > 0) {
      return res.status(400).json({ message: "Truck has an active listing and cannot be deleted." });
    }

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

router.patch(
  "/:id",
  requireRoles(["hauler"], { allowSuperAdminOverride: false }),
  auditRequest("truck:update", (req) => `truck:${req.params.id}`),
  async (req: AuthedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid truck id" });
    }
    const haulerId = await ensureHaulerProfile(Number(req.user?.id));

    const {
      plate_number,
      truck_type,
      capacity_weight_kg,
      height_m,
      width_m,
      length_m,
      axle_count,
      max_gross_weight_kg,
      max_axle_weight_kg,
      hazmat_permitted,
      truck_name,
      species_supported,
      notes,
    } = req.body ?? {};

    const parsed = {
      capacity: capacity_weight_kg !== undefined && capacity_weight_kg !== null
        ? Number(capacity_weight_kg)
        : null,
      height: height_m !== undefined && height_m !== null ? Number(height_m) : null,
      width: width_m !== undefined && width_m !== null ? Number(width_m) : null,
      length: length_m !== undefined && length_m !== null ? Number(length_m) : null,
      axles: axle_count !== undefined && axle_count !== null ? Number(axle_count) : null,
      maxGross: max_gross_weight_kg !== undefined && max_gross_weight_kg !== null
        ? Number(max_gross_weight_kg)
        : null,
      maxAxle: max_axle_weight_kg !== undefined && max_axle_weight_kg !== null
        ? Number(max_axle_weight_kg)
        : null,
    };
    for (const [label, value] of Object.entries(parsed)) {
      if (value !== null && Number.isNaN(value)) {
        return res.status(400).json({ message: `${label} must be numeric` });
      }
    }

    const notesPayload: TruckNotesMeta = {
      truck_name: truck_name ?? null,
      species_supported: species_supported ?? null,
      notes: notes ?? null,
    };

    const result = await pool.query(
      `
        UPDATE trucks
        SET
          plate_number = COALESCE($1, plate_number),
          truck_type = COALESCE($2, truck_type),
          capacity_weight_kg = COALESCE($3, capacity_weight_kg),
          height_m = COALESCE($4, height_m),
          width_m = COALESCE($5, width_m),
          length_m = COALESCE($6, length_m),
          axle_count = COALESCE($7, axle_count),
          max_gross_weight_kg = COALESCE($8, max_gross_weight_kg),
          max_axle_weight_kg = COALESCE($9, max_axle_weight_kg),
          hazmat_permitted = COALESCE($10, hazmat_permitted),
          notes = COALESCE($11, notes),
          updated_at = NOW()
        WHERE id = $12 AND hauler_id = $13
        RETURNING *
      `,
      [
        plate_number ?? null,
        truck_type ?? null,
        parsed.capacity,
        parsed.height,
        parsed.width,
        parsed.length,
        parsed.axles,
        parsed.maxGross,
        parsed.maxAxle,
        hazmat_permitted !== undefined ? Boolean(hazmat_permitted) : null,
        serializeTruckNotes(notesPayload),
        id,
        haulerId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Truck not found" });
    }
    res.json(mapTruckRow(result.rows[0]));
  } catch (err) {
    console.error("PATCH /trucks/:id error:", err);
    res.status(500).json({ message: "Failed to update truck" });
  }
  }
);

export default router;
