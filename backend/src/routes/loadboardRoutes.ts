import { Router, Request, Response } from "express";
import { pool } from "../config/database";

const router = Router();

type LoadboardType = "all" | "loads" | "trucks";

function normalizeType(value: unknown): LoadboardType {
  const str = getQueryString(value) || undefined;
  switch ((str || "all").toLowerCase()) {
    case "loads":
      return "loads";
    case "trucks":
      return "trucks";
    default:
      return "all";
  }
}

function getQueryString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }
  return undefined;
}

function parseTruckNotes(raw: string | null): { species_supported?: string | null } {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as { species_supported?: string | null };
    }
  } catch {
    // fall back to plain string
  }
  return { species_supported: raw };
}

router.get("/", async (req: Request, res: Response) => {
  const listType = normalizeType(req.query.type);
  const speciesFilter = getQueryString(req.query.species);

  try {
    let loads: any[] = [];
    let trucks: any[] = [];

    if (listType === "all" || listType === "loads") {
      const loadQuery = `
        SELECT
          id,
          title,
          species,
          pickup_location_text AS pickup_location,
          dropoff_location_text AS delivery_location,
          pickup_window_start AS pickup_date,
          pickup_window_end AS pickup_date_to,
          estimated_weight_kg AS total_weight_kg,
          price_offer_amount AS budget_amount,
          status,
          created_at
        FROM loads
        WHERE status = 'posted' AND is_deleted = FALSE
        ORDER BY created_at DESC
        LIMIT 100`;
      const loadResult = await pool.query(loadQuery);
      loads = loadResult.rows;
    }

    if (listType === "all" || listType === "trucks") {
      const truckQuery = `
        SELECT
          id,
          hauler_id,
          plate_number,
          truck_type,
          capacity_weight_kg,
          status,
          notes,
          created_at
        FROM trucks
        WHERE status = 'active'
        ORDER BY created_at DESC
        LIMIT 100`;
      const truckResult = await pool.query(truckQuery);
      trucks = truckResult.rows.map((row) => {
        const meta = parseTruckNotes(row.notes ?? null);
        return {
          id: row.id,
          hauler_id: row.hauler_id,
          plate_number: row.plate_number,
          truck_type: row.truck_type,
          capacity_weight_kg: row.capacity_weight_kg,
          species_supported: meta.species_supported ?? null,
          status: row.status,
          created_at: row.created_at,
        };
      });
    }

    if (speciesFilter) {
      const filterUpper = speciesFilter.toUpperCase();
      loads = loads.filter((load) =>
        load.species ? load.species.toUpperCase().includes(filterUpper) : false
      );
      trucks = trucks.filter((truck) =>
        truck.species_supported
          ? truck.species_supported.toUpperCase().includes(filterUpper)
          : false
      );
    }

    res.json({
      type: listType,
      filters: {
        species: speciesFilter || null,
      },
      loads,
      trucks,
    });
  } catch (err) {
    console.error("Error in /api/loadboard:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
