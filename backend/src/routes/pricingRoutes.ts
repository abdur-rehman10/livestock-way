import { Router } from "express";
import { pool } from "../config/database";

type IndividualPackageRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  features: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function buildIndividualPackagesResponse(
  packages: IndividualPackageRow[],
  monthlyPrice: number | null
) {
  const paid_monthly_price = monthlyPrice;
  const paid_yearly_price =
    monthlyPrice != null ? Number((monthlyPrice * 10).toFixed(2)) : null;
  return {
    packages,
    paid_monthly_price,
    paid_yearly_price,
  };
}

const router = Router();

router.get("/individual-packages", async (_req, res) => {
  try {
    const pkgResult = await pool.query<IndividualPackageRow>(
      `
        SELECT id, code, name, description, features, is_active, created_at, updated_at
        FROM pricing_individual_packages
        ORDER BY code ASC
      `
    );

    const priceResult = await pool.query<{ monthly_price: number | null }>(
      `
        SELECT monthly_price
        FROM pricing_configs
        WHERE target_user_type = 'HAULER_INDIVIDUAL' AND is_active = TRUE
        ORDER BY updated_at DESC
        LIMIT 1
      `
    );
    const monthlyPrice =
      priceResult.rowCount && priceResult.rows[0]?.monthly_price != null
        ? Number(priceResult.rows[0].monthly_price)
        : null;

    return res.json(buildIndividualPackagesResponse(pkgResult.rows, monthlyPrice));
  } catch (error) {
    console.error("pricing individual packages public get error", error);
    return res.status(500).json({ message: "Failed to load pricing packages" });
  }
});

export default router;
