import express, { Request, Response, Router } from "express";
import { pool } from "../config/database";

const router = Router();

const EXTERNAL_SHIPPER_EMAIL = "external-shipper@livestockway.local";
const EXTERNAL_HAULER_EMAIL = "external-hauler@livestockway.local";

function requireExternalApiKey(req: Request, res: Response, next: () => void) {
  const expected = process.env.EXTERNAL_INGEST_API_KEY;
  if (!expected) {
    return res.status(500).json({ error: "External ingest API key is not configured." });
  }
  const provided = req.header("x-api-key");
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: "Invalid API key." });
  }
  return next();
}

router.use(express.json({ limit: "1mb" }));
router.use(requireExternalApiKey);

function parseNumeric(value?: string) {
  if (!value) return null;
  const numeric = Number(String(value).replace(/[^0-9.]/g, ""));
  if (Number.isNaN(numeric)) return null;
  return numeric;
}

function parseWeightToKg(value?: string) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  const numeric = parseNumeric(value);
  if (numeric === null) return null;
  if (normalized.includes("lb")) {
    return Number((numeric * 0.453592).toFixed(2));
  }
  return numeric;
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function buildNotes(fields: Array<[string, string | undefined | null]>, extra?: string | null) {
  const lines = fields
    .map(([label, value]) => (value ? `${label}: ${value}` : null))
    .filter(Boolean) as string[];
  if (extra) {
    lines.push(extra);
  }
  return lines.length ? lines.join("\n") : null;
}

async function getExternalShipperId() {
  const result = await pool.query(
    `
      SELECT s.id
      FROM shippers s
      JOIN app_users u ON u.id = s.user_id
      WHERE u.email = $1
      LIMIT 1
    `,
    [EXTERNAL_SHIPPER_EMAIL]
  );
  return result.rows[0]?.id ? Number(result.rows[0].id) : null;
}

async function getExternalHaulerId() {
  const result = await pool.query(
    `
      SELECT h.id
      FROM haulers h
      JOIN app_users u ON u.id = h.user_id
      WHERE u.email = $1
      LIMIT 1
    `,
    [EXTERNAL_HAULER_EMAIL]
  );
  return result.rows[0]?.id ? Number(result.rows[0].id) : null;
}

function normalizeValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

router.post("/loads", async (req: Request, res: Response) => {
  try {
    const payload = req.body && typeof req.body === "object" ? req.body : null;
    if (!payload) {
      return res.status(400).json({ error: "JSON body is required." });
    }
    const shipperId = await getExternalShipperId();
    if (!shipperId) {
      return res.status(500).json({ error: "External shipper is not configured." });
    }

    const origin = normalizeValue((payload as any).origin);
    if (!origin) {
      return res.status(400).json({ error: "origin is required." });
    }
    const destination = normalizeValue((payload as any).destination) || "TBD";
    const species = normalizeValue((payload as any).type_of_livestock) || "Livestock";
    const title = `${species} load`;
    const pickupStart =
      parseDate((payload as any).date_from_date_of_post) ||
      parseDate((payload as any).date_from) ||
      parseDate((payload as any).date);
    const pickupEnd = parseDate((payload as any).date_to);
    const animalCount = parseNumeric(normalizeValue((payload as any).no_of_loads));
    const weightKg = parseWeightToKg(normalizeValue((payload as any).estimated_weight));
    const ratePerMile = parseNumeric(normalizeValue((payload as any).rate_per_mile));
    const notes = normalizeValue((payload as any).comments) || null;
    const contactEmail = normalizeValue((payload as any).email) || null;
    const contactPhone = normalizeValue((payload as any).contact_no) || null;
    const postLink = normalizeValue((payload as any).post_link) || null;

    const result = await pool.query(
      `
        INSERT INTO loads (
          shipper_id,
          title,
          species,
          animal_count,
          estimated_weight_kg,
          pickup_location_text,
          dropoff_location_text,
          pickup_window_start,
          pickup_window_end,
          price_offer_amount,
          price_currency,
          visibility,
          status,
          notes,
          external_contact_email,
          external_contact_phone,
          post_link,
          is_external
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'USD','public','posted',$11,$12,$13,$14,TRUE
        )
        RETURNING id
      `,
      [
        shipperId,
        title,
        species,
        animalCount,
        weightKg,
        origin,
        destination,
        pickupStart,
        pickupEnd,
        ratePerMile,
        notes,
        contactEmail,
        contactPhone,
        postLink,
      ]
    );

    return res.status(201).json({ id: result.rows[0]?.id ?? null });
  } catch (error) {
    console.error("External load ingest failed:", error);
    return res.status(500).json({ error: "Failed to ingest external loads." });
  }
});

router.post("/trucks", async (req: Request, res: Response) => {
  try {
    const payload = req.body && typeof req.body === "object" ? req.body : null;
    if (!payload) {
      return res.status(400).json({ error: "JSON body is required." });
    }
    const haulerId = await getExternalHaulerId();
    if (!haulerId) {
      return res.status(500).json({ error: "External hauler is not configured." });
    }

    const origin = normalizeValue((payload as any).origin);
    if (!origin) {
      return res.status(400).json({ error: "origin is required." });
    }
    const destination =
      normalizeValue((payload as any).destination_if_destination_is_menmtion_its_a_route) ||
      normalizeValue((payload as any).destination) ||
      null;
    const availableFrom =
      parseDate((payload as any).date_from_date_of_post) ||
      parseDate((payload as any).date_from) ||
      new Date().toISOString();
    const availableUntil = parseDate((payload as any).date_to);
    const notes = normalizeValue((payload as any).comments) || null;
    const contactEmail = normalizeValue((payload as any).email) || null;
    const contactPhone = normalizeValue((payload as any).contact_no) || null;
    const postLink = normalizeValue((payload as any).post_link) || null;

    const result = await pool.query(
      `
        INSERT INTO truck_availability (
          hauler_id,
          truck_id,
          origin_location_text,
          destination_location_text,
          available_from,
          available_until,
          allow_shared,
          notes,
          external_contact_email,
          external_contact_phone,
          post_link,
          is_active,
          is_external
        )
        VALUES ($1, NULL, $2, $3, $4, $5, TRUE, $6, $7, $8, $9, TRUE, TRUE)
        RETURNING id
      `,
      [
        haulerId,
        origin,
        destination,
        availableFrom,
        availableUntil,
        notes,
        contactEmail,
        contactPhone,
        postLink,
      ]
    );

    return res.status(201).json({ id: result.rows[0]?.id ?? null });
  } catch (error) {
    console.error("External truck ingest failed:", error);
    return res.status(500).json({ error: "Failed to ingest external trucks." });
  }
});

export default router;
