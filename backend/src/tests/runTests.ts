import assert from "node:assert/strict";
import { resolvePaymentModeSelection } from "../utils/paymentMode";
import { assertDisputesEnabled, assertEscrowEnabled } from "../utils/escrowGuard";
import {
  mapLoadRow,
  mapOfferRow,
  mapTripRow,
  mapTripDirectPaymentRow,
} from "../services/marketplaceService";
import { assertLoadboardAccess } from "../routes/loadboardRoutes";
import { resolveDirectPaymentReceipt } from "../utils/directPaymentReceipt";
import { validateCompanyPricingInput } from "../utils/pricing";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test("defaults to ESCROW when no input provided", () => {
  const result = resolvePaymentModeSelection({}, "SHIPPER");
  assert.equal(result.paymentMode, "ESCROW");
  assert.equal(result.directDisclaimerAt, null);
  assert.equal(result.directDisclaimerVersion, null);
});

test("rejects invalid payment_mode values", () => {
  assert.throws(() => resolvePaymentModeSelection({ payment_mode: "INVALID" }, "SHIPPER"));
});

test("rejects DIRECT without acceptance", () => {
  assert.throws(() =>
    resolvePaymentModeSelection(
      { payment_mode: "DIRECT", direct_payment_disclaimer_version: "v1" },
      "SHIPPER"
    )
  );
});

test("rejects DIRECT without version", () => {
  assert.throws(() =>
    resolvePaymentModeSelection(
      { payment_mode: "DIRECT", direct_payment_disclaimer_accepted: true },
      "SHIPPER"
    )
  );
});

test("prevents hauler from overriding payment mode", () => {
  assert.throws(() =>
    resolvePaymentModeSelection(
      {
        payment_mode: "DIRECT",
        direct_payment_disclaimer_accepted: true,
        direct_payment_disclaimer_version: "v1",
      },
      "HAULER"
    )
  );
});

test("accepts DIRECT when disclaimer acknowledged", () => {
  const result = resolvePaymentModeSelection(
    {
      payment_mode: "DIRECT",
      direct_payment_disclaimer_version: "v1",
      direct_payment_disclaimer_accepted: true,
    },
    "SHIPPER"
  );
  assert.equal(result.paymentMode, "DIRECT");
  assert.equal(result.directDisclaimerVersion, "v1");
  assert.ok(result.directDisclaimerAt);
});

test("assertEscrowEnabled blocks direct trips", () => {
  assert.throws(() =>
    assertEscrowEnabled({
      trip: { payment_mode: "DIRECT" } as any,
      payment: { is_escrow: false } as any,
    })
  );
});

test("assertEscrowEnabled allows escrow trips", () => {
  assert.doesNotThrow(() =>
    assertEscrowEnabled({
      trip: { payment_mode: "ESCROW" } as any,
      payment: { is_escrow: true } as any,
    })
  );
});

test("assertDisputesEnabled blocks direct trips", () => {
  assert.throws(() => assertDisputesEnabled({ payment_mode: "DIRECT" } as any));
});

test("assertDisputesEnabled allows escrow trips", () => {
  assert.doesNotThrow(() => assertDisputesEnabled({ payment_mode: "ESCROW" } as any));
});

test("load DTO mapping carries payment_mode", () => {
  const load = mapLoadRow({
    id: "1",
    shipper_id: "10",
    shipper_user_id: "100",
    status: "posted",
    currency: "USD",
    asking_amount: "5000",
    awarded_offer_id: null as any,
    payment_mode: "DIRECT",
    direct_payment_disclaimer_accepted_at: "2024-01-01T00:00:00Z",
    direct_payment_disclaimer_version: "v1",
  } as any);
  assert.equal(load.payment_mode, "DIRECT");
  assert.equal(load.direct_payment_disclaimer_version, "v1");
});

test("offer DTO includes load payment_mode from join", () => {
  const offer = mapOfferRow({
    id: "o1",
    load_id: "1",
    hauler_id: "2",
    created_by_user_id: "3",
    offered_amount: "1000",
    currency: "USD",
    message: null,
    status: "PENDING",
    expires_at: null,
    accepted_at: null,
    rejected_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    load_payment_mode: "DIRECT",
    load_direct_payment_disclaimer_version: "v2",
    load_direct_payment_disclaimer_accepted_at: "2024-01-02T00:00:00Z",
  });
  assert.equal(offer.payment_mode, "DIRECT");
  assert.equal(offer.direct_payment_disclaimer_version, "v2");
});

test("trip DTO exposes payment_mode even when trip row is missing it", () => {
  const trip = mapTripRow({
    id: "t1",
    load_id: "l1",
    hauler_id: "h1",
    driver_id: null,
    truck_id: null,
    status: "PENDING_ESCROW",
    payment_mode: null,
    load_payment_mode: "DIRECT",
    direct_payment_disclaimer_accepted_at: null,
    direct_payment_disclaimer_version: null,
    load_direct_payment_disclaimer_accepted_at: "2024-01-03T00:00:00Z",
    load_direct_payment_disclaimer_version: "v3",
    actual_start_time: null,
    actual_end_time: null,
    delivered_confirmed_at: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  } as any);
  assert.equal(trip.payment_mode, "DIRECT");
  assert.equal(trip.direct_payment_disclaimer_version, "v3");
});

test("maps direct payment row", () => {
  const record = mapTripDirectPaymentRow({
    id: 10,
    trip_id: 5,
    received_amount: "1200.50",
    received_payment_method: "BANK_TRANSFER",
    received_reference: "wire-123",
    received_at: "2024-01-05T00:00:00Z",
    created_at: "2024-01-05T00:00:00Z",
    updated_at: "2024-01-05T00:00:00Z",
  });
  assert.equal(record.trip_id, "5");
  assert.equal(record.received_payment_method, "BANK_TRANSFER");
  assert.equal(record.received_amount, "1200.50");
});

test("loadboard access blocks shipper role", () => {
  assert.throws(
    () => assertLoadboardAccess({ user_type: "shipper" }),
    (err: any) => err?.status === 403 && /Shippers cannot access loadboard/i.test(err.message)
  );
  assert.doesNotThrow(() => assertLoadboardAccess({ user_type: "hauler" }));
  assert.doesNotThrow(() => assertLoadboardAccess({ user_type: "super-admin" }));
});

test("direct trip completion requires receipt fields", () => {
  assert.throws(
    () => resolveDirectPaymentReceipt("DIRECT", {}),
    { message: /received_amount and received_payment_method are required/i }
  );
});

test("pricing validation rejects non-admin", () => {
  assert.throws(() =>
    validateCompanyPricingInput("hauler", [
      { name: "Starter", min_vehicles: 1, max_vehicles: 5, monthly_price: 50 },
    ])
  );
});

test("pricing validation rejects more than 4 tiers", () => {
  assert.throws(() =>
    validateCompanyPricingInput("super-admin", [
      { name: "T1", min_vehicles: 1, max_vehicles: 2, monthly_price: 10 },
      { name: "T2", min_vehicles: 3, max_vehicles: 4, monthly_price: 20 },
      { name: "T3", min_vehicles: 5, max_vehicles: 6, monthly_price: 30 },
      { name: "T4", min_vehicles: 7, max_vehicles: 8, monthly_price: 40 },
      { name: "T5", min_vehicles: 9, max_vehicles: 10, monthly_price: 50 },
    ])
  );
});

test("pricing validation rejects overlapping ranges", () => {
  assert.throws(() =>
    validateCompanyPricingInput("super-admin", [
      { name: "Tier A", min_vehicles: 1, max_vehicles: 5, monthly_price: 50 },
      { name: "Tier B", min_vehicles: 5, max_vehicles: 10, monthly_price: 80 },
    ])
  );
});

test("pricing validation rejects enterprise without link", () => {
  assert.throws(() =>
    validateCompanyPricingInput("super-admin", [
      { name: "Enterprise", is_enterprise: true },
    ])
  );
});

test("pricing validation accepts valid tiers", () => {
  const tiers = validateCompanyPricingInput("super-admin", [
    { name: "Starter", min_vehicles: 1, max_vehicles: 5, monthly_price: 50, sort_order: 1 },
    { name: "Growth", min_vehicles: 6, max_vehicles: 15, monthly_price: 120, sort_order: 2 },
    { name: "Enterprise", is_enterprise: true, sales_form_link: "https://example.com/sales" },
  ]);
  assert.equal(tiers.length, 3);
  assert.equal(tiers[0]?.sort_order, 1);
  assert.equal(tiers[2]?.is_enterprise, true);
});

test("direct trip completion succeeds with receipt", () => {
  const receipt = resolveDirectPaymentReceipt("DIRECT", {
    received_amount: 100,
    received_payment_method: "cash",
    received_reference: "ref-1",
    received_at: "2024-01-01T00:00:00Z",
  });
  assert.equal(receipt?.paymentMethod, "CASH");
  assert.equal(receipt?.receivedAmount, 100);
  assert.equal(receipt?.reference, "ref-1");
});

test("escrow trip ignores receipt fields", () => {
  assert.throws(
    () =>
      resolveDirectPaymentReceipt("ESCROW", {
        received_amount: 50,
        received_payment_method: "CASH",
      }),
    { message: /not applicable for escrow/i }
  );
  const receipt = resolveDirectPaymentReceipt("ESCROW", {});
  assert.equal(receipt, null);
});

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}
