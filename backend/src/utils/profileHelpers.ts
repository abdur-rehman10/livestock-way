import { pool } from "../config/database";

async function getUserName(userId: number) {
  const result = await pool.query(
    "SELECT full_name FROM app_users WHERE id = $1",
    [userId]
  );
  return result.rows[0]?.full_name || null;
}

export async function ensureShipperProfile(userId: number) {
  const existing = await pool.query(
    "SELECT id FROM shippers WHERE user_id = $1 LIMIT 1",
    [userId]
  );
  if (existing.rowCount) {
    return existing.rows[0].id as number;
  }

  const fallbackName = (await getUserName(userId)) || "LivestockWay Shipper";
  const registrationId = `SHIP-${Date.now()}`;

  // Use ON CONFLICT to handle race conditions safely
  const inserted = await pool.query(
    `INSERT INTO shippers (user_id, farm_name, registration_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       farm_name = COALESCE(shippers.farm_name, EXCLUDED.farm_name),
       registration_id = COALESCE(shippers.registration_id, EXCLUDED.registration_id)
     RETURNING id`,
    [userId, fallbackName, registrationId]
  );

  return inserted.rows[0].id as number;
}

export async function ensureHaulerProfile(userId: number) {
  const hasHaulerType:any = await pool.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'haulers'
        AND column_name = 'hauler_type'
      LIMIT 1
    `
  );
  const haulerTypeAvailable = hasHaulerType? hasHaulerType?.rowCount > 0 :0;
  
  // Check if exists first (for hauler_type update logic)
  const existing = await pool.query(
    haulerTypeAvailable
      ? "SELECT id, hauler_type FROM haulers WHERE user_id = $1 LIMIT 1"
      : "SELECT id FROM haulers WHERE user_id = $1 LIMIT 1",
    [userId]
  );
  if (existing.rowCount) {
    const row = existing.rows[0] as { id: number; hauler_type?: string | null };
    if (haulerTypeAvailable && !row.hauler_type) {
      await pool.query(
        "UPDATE haulers SET hauler_type = 'company' WHERE id = $1",
        [row.id]
      );
    }
    return row.id as number;
  }

  const fallbackName = (await getUserName(userId)) || "LivestockWay Hauler";
  const dotNumber = `DOT-${Date.now()}`;
  const accountModeResult = await pool.query(
    "SELECT account_mode FROM app_users WHERE id = $1",
    [userId]
  );
  const accountMode = (accountModeResult.rows[0]?.account_mode ?? "COMPANY").toString().toLowerCase();
  const haulerType = accountMode === "individual" ? "individual" : "company";
  
  // Use ON CONFLICT to handle race conditions safely
  // If another request creates the profile between our check and insert, this will handle it
  try {
    const inserted = haulerTypeAvailable
      ? await pool.query(
          `INSERT INTO haulers (user_id, legal_name, dot_number, hauler_type)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id) DO UPDATE SET
             legal_name = COALESCE(haulers.legal_name, EXCLUDED.legal_name),
             dot_number = COALESCE(haulers.dot_number, EXCLUDED.dot_number),
             hauler_type = COALESCE(haulers.hauler_type, EXCLUDED.hauler_type)
           RETURNING id`,
          [userId, fallbackName, dotNumber, haulerType]
        )
      : await pool.query(
          `INSERT INTO haulers (user_id, legal_name, dot_number)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id) DO UPDATE SET
             legal_name = COALESCE(haulers.legal_name, EXCLUDED.legal_name),
             dot_number = COALESCE(haulers.dot_number, EXCLUDED.dot_number)
           RETURNING id`,
          [userId, fallbackName, dotNumber]
        );

    return inserted.rows[0].id as number;
  } catch (err: any) {
    // If there's still a conflict (shouldn't happen with ON CONFLICT, but just in case),
    // query for the existing record
    if (err.code === '23505') {
      const existingAfterConflict = await pool.query(
        "SELECT id FROM haulers WHERE user_id = $1 LIMIT 1",
        [userId]
      );
      if (existingAfterConflict.rowCount) {
        return existingAfterConflict.rows[0].id as number;
      }
    }
    throw err;
  }
}

export async function ensureStakeholderProfile(userId: number) {
  const existing = await pool.query(
    "SELECT id FROM stakeholders WHERE user_id = $1 LIMIT 1",
    [userId]
  );
  if (existing.rowCount) {
    return existing.rows[0].id as number;
  }

  const fallbackName = (await getUserName(userId)) || "LivestockWay Service Provider";
  // Use ON CONFLICT to handle race conditions safely
  const inserted = await pool.query(
    `INSERT INTO stakeholders (user_id, service_type, company_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       service_type = COALESCE(stakeholders.service_type, EXCLUDED.service_type),
       company_name = COALESCE(stakeholders.company_name, EXCLUDED.company_name)
     RETURNING id`,
    [userId, "general", fallbackName]
  );

  return inserted.rows[0].id as number;
}
