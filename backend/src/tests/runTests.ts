import assert from "node:assert/strict";
import { resolvePaymentModeSelection } from "../utils/paymentMode";
import { assertDisputesEnabled, assertEscrowEnabled } from "../utils/escrowGuard";
import {
  mapLoadRow,
  mapOfferRow,
  mapTripRow,
  mapTripDirectPaymentRow,
  HaulerSubscriptionStatus,
  assertFreeTripEligibility,
  shouldConsumeFreeTrip,
} from "../services/marketplaceService";
import { assertLoadboardAccess } from "../routes/loadboardRoutes";
import { resolveDirectPaymentReceipt } from "../utils/directPaymentReceipt";
import {
  validateCompanyPricingInput,
  validateIndividualPackageUpdateInput,
} from "../utils/pricing";
import { buildIndividualPackagesResponse } from "../routes/pricingRoutes";
import { resolveSignupPlanSelection } from "../utils/signupPlan";
import {
  mapHaulerSubscriptionResponse,
  assertHaulerUser,
  assertIndividualHaulerType,
  assertPricingConfigPresent,
  computeNextPeriodEnd,
  computeChargeAndPeriod,
  resolveBillingCycle,
  isSubscriptionActive,
} from "../routes/haulerRoutes";
import { computePayingStatus, isSuperAdminUser } from "../routes/adminRoutes";
import { assertOfferSubscriptionEligibility as assertOfferSubscriptionEligibilityRoute } from "../routes/marketplaceRoutes";

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

test("individual package validation rejects non-admin", () => {
  assert.throws(() =>
    validateIndividualPackageUpdateInput("hauler", "FREE", {
      name: "Free",
      features: {
        feature_list: ["a"],
        trip_tracking_limit: 1,
        documents_validation_limit: 1,
        outside_trips_limit: 3,
      },
    })
  );
});

test("individual package validation accepts FREE with required limits", () => {
  const result = validateIndividualPackageUpdateInput("super-admin", "FREE", {
    name: "Free",
    description: "desc",
    features: {
      feature_list: ["Track up to 1 trip", "Validate 1 set of documents", "Up to 3 outside trips"],
      trip_tracking_limit: 1,
      documents_validation_limit: 1,
      outside_trips_limit: 3,
    },
  });
  assert.equal(result.code, "FREE");
  assert.equal(result.name, "Free");
});

test("individual package validation rejects unknown code", () => {
  assert.throws(() =>
    validateIndividualPackageUpdateInput("super-admin", "BASIC", {
      name: "Basic",
      features: { feature_list: ["x"] },
    })
  );
});

test("individual package validation rejects missing FREE limits", () => {
  assert.throws(() =>
    validateIndividualPackageUpdateInput("super-admin", "FREE", {
      name: "Free",
      features: {
        feature_list: ["x"],
        trip_tracking_limit: 0,
        documents_validation_limit: 1,
        outside_trips_limit: 3,
      },
    })
  );
});

test("individual packages response computes yearly price and returns both packages", () => {
  const mockPackages = [
    {
      id: 1,
      code: "FREE",
      name: "Free",
      description: "free tier",
      features: { feature_list: ["a"] },
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: 2,
      code: "PAID",
      name: "Paid",
      description: "paid tier",
      features: { feature_list: ["b"] },
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ];
  const result = buildIndividualPackagesResponse(mockPackages as any, 70);
  assert.equal(result.packages.length, 2);
  assert.equal(result.paid_monthly_price, 70);
  assert.equal(result.paid_yearly_price, 700);
});

test("individual signup without plan is rejected", () => {
  assert.throws(
    () =>
      resolveSignupPlanSelection({
        userType: "hauler",
        accountMode: "INDIVIDUAL",
        planCode: null,
      }),
    (err: any) =>
      err?.status === 400 &&
      /individual_plan_code is required/i.test(err.message)
  );
});

test("FREE signup marks onboarding completed", () => {
  const result = resolveSignupPlanSelection({
    userType: "hauler",
    accountMode: "INDIVIDUAL",
    planCode: "FREE",
  });
  assert.equal(result.planCode, "FREE");
  assert.equal(result.onboardingCompleted, true);
  assert.ok(result.selectedAt instanceof Date);
});

test("PAID signup leaves onboarding incomplete", () => {
  const result = resolveSignupPlanSelection({
    userType: "hauler",
    accountMode: "INDIVIDUAL",
    planCode: "PAID",
  });
  assert.equal(result.planCode, "PAID");
  assert.equal(result.onboardingCompleted, false);
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

test("maps individual hauler subscription response", () => {
  const payload = mapHaulerSubscriptionResponse(
    {
      hauler_type: "individual",
      free_trip_used: true,
      free_trip_used_at: "2024-02-01T00:00:00Z",
      subscription_status: "active",
      subscription_current_period_end: "2024-03-01T00:00:00Z",
      billing_cycle: "YEARLY",
    },
    70
  );
  assert.equal(payload.hauler_type, "INDIVIDUAL");
  assert.equal(payload.free_trip_used, true);
  assert.equal(payload.subscription_status, "ACTIVE" as HaulerSubscriptionStatus);
  assert.equal(payload.subscription_current_period_end, "2024-03-01T00:00:00Z");
  assert.equal(payload.current_individual_monthly_price, 70);
  assert.equal(payload.monthly_price, 70);
  assert.equal(payload.yearly_price, 700);
  assert.ok(payload.yearly_note?.includes("2 months free"));
  assert.equal(payload.billing_cycle, "YEARLY");
  assert.equal(payload.note, undefined);
});

test("company hauler subscription response includes note", () => {
  const payload = mapHaulerSubscriptionResponse(
    {
      hauler_type: "company",
      free_trip_used: false,
      subscription_status: "none",
      subscription_current_period_end: null,
    },
    null
  );
  assert.equal(payload.hauler_type, "COMPANY");
  assert.equal(payload.subscription_status, "NONE" as HaulerSubscriptionStatus);
  assert.ok(payload.note?.includes("Company subscription plan"));
});

test("assertHaulerUser blocks non-hauler roles", () => {
  assert.throws(() => assertHaulerUser({ user_type: "shipper" }));
  assert.doesNotThrow(() => assertHaulerUser({ user_type: "hauler" }));
});

test("individual subscription guard allows individuals and blocks companies", () => {
  assert.doesNotThrow(() => assertIndividualHaulerType("INDIVIDUAL"));
  assert.throws(
    () => assertIndividualHaulerType("COMPANY"),
    (err: any) => err?.status === 400 && /Only individual haulers/i.test(err.message)
  );
});

test("missing pricing config throws clear error", () => {
  assert.throws(
    () => assertPricingConfigPresent(null),
    (err: any) => err?.status === 400 && /pricing configuration is missing/i.test(err.message)
  );
});

test("computeNextPeriodEnd adds roughly 30 days", () => {
  const base = new Date("2024-01-01T00:00:00Z");
  const next = computeNextPeriodEnd(base);
  assert.equal(next.toISOString().startsWith("2024-01-31"), true);
});

test("computeNextPeriodEnd yearly adds 12 months", () => {
  const base = new Date("2024-01-01T00:00:00Z");
  const next = computeNextPeriodEnd(base, "YEARLY");
  assert.equal(next.toISOString().startsWith("2025-01-01"), true);
});

test("computeChargeAndPeriod monthly", () => {
  const base = new Date("2024-01-01T00:00:00Z");
  const { chargedAmount, periodEnd } = computeChargeAndPeriod({ monthlyPrice: 50, billingCycle: "MONTHLY", startDate: base });
  assert.equal(chargedAmount, 50);
  assert.equal(periodEnd.toISOString().startsWith("2024-01-31"), true);
});

test("computeChargeAndPeriod yearly gives 10x charge and 12 months", () => {
  const base = new Date("2024-01-01T00:00:00Z");
  const { chargedAmount, periodEnd } = computeChargeAndPeriod({ monthlyPrice: 50, billingCycle: "YEARLY", startDate: base });
  assert.equal(chargedAmount, 500);
  assert.equal(periodEnd.toISOString().startsWith("2025-01-01"), true);
});

test("isSubscriptionActive detects active with future period", () => {
  const future = new Date();
  future.setDate(future.getDate() + 10);
  assert.equal(isSubscriptionActive("ACTIVE", future.toISOString()), true);
  assert.equal(isSubscriptionActive("ACTIVE", null), true);
  assert.equal(isSubscriptionActive("NONE", future.toISOString()), false);
});

test("computePayingStatus aligns with active subscriptions", () => {
  const future = new Date();
  future.setDate(future.getDate() + 5);
  assert.equal(computePayingStatus("ACTIVE", future.toISOString()), "PAID");
  assert.equal(computePayingStatus("ACTIVE", null), "PAID");
  const past = new Date();
  past.setDate(past.getDate() - 1);
  assert.equal(computePayingStatus("ACTIVE", past.toISOString()), "UNPAID");
  assert.equal(computePayingStatus("NONE", future.toISOString()), "UNPAID");
});

test("isSuperAdminUser identifies super admin roles", () => {
  assert.equal(isSuperAdminUser({ user_type: "super-admin" }), true);
  assert.equal(isSuperAdminUser({ user_type: "SUPERADMIN" }), true);
  assert.equal(isSuperAdminUser({ user_type: "hauler" }), false);
});

test("individual offer eligibility passes when free trip not used", () => {
  assert.doesNotThrow(() =>
    assertOfferSubscriptionEligibilityRoute({
      hauler_type: "INDIVIDUAL",
      free_trip_used: false,
      subscription_status: "NONE",
    })
  );
});

test("individual offer eligibility blocks when free trip used without subscription", () => {
  assert.throws(
    () =>
      assertOfferSubscriptionEligibilityRoute({
        hauler_type: "INDIVIDUAL",
        free_trip_used: true,
        subscription_status: "NONE",
        individual_plan_code: "FREE",
      }),
    (err: any) => err?.code === "SUBSCRIPTION_REQUIRED" && err?.status === 402
  );
});

test("individual offer eligibility allows when subscribed", () => {
  assert.doesNotThrow(() =>
    assertOfferSubscriptionEligibilityRoute({
      hauler_type: "INDIVIDUAL",
      free_trip_used: true,
      subscription_status: "ACTIVE",
      individual_plan_code: "FREE",
    })
  );
});

test("paid plan blocks offers when not active", () => {
  assert.throws(
    () =>
      assertOfferSubscriptionEligibilityRoute({
        hauler_type: "INDIVIDUAL",
        free_trip_used: false,
        subscription_status: "NONE",
        individual_plan_code: "PAID",
      }),
    (err: any) => err?.code === "PAYMENT_REQUIRED" && err?.status === 402
  );
});

test("paid plan allows offers when subscription active", () => {
  assert.doesNotThrow(() =>
    assertOfferSubscriptionEligibilityRoute({
      hauler_type: "INDIVIDUAL",
      free_trip_used: true,
      subscription_status: "ACTIVE",
      individual_plan_code: "PAID",
    })
  );
});

test("free trip eligibility allows first trip when no active trips and not used", () => {
  assert.doesNotThrow(() =>
    assertFreeTripEligibility({
      haulerType: "INDIVIDUAL",
      subscriptionStatus: "NONE",
      freeTripUsed: false,
      hasActiveTrip: false,
    })
  );
});

test("free trip eligibility blocks when active trip exists even if free_trip_used is false", () => {
  assert.throws(
    () =>
      assertFreeTripEligibility({
        haulerType: "INDIVIDUAL",
        subscriptionStatus: "NONE",
        freeTripUsed: false,
        hasActiveTrip: true,
      }),
    (err: any) => err?.code === "SUBSCRIPTION_REQUIRED" && err?.status === 402
  );
});

test("free trip eligibility blocks when free_trip_used is true and unsubscribed", () => {
  assert.throws(
    () =>
      assertFreeTripEligibility({
        haulerType: "INDIVIDUAL",
        subscriptionStatus: "NONE",
        freeTripUsed: true,
        hasActiveTrip: false,
      }),
    (err: any) => err?.code === "SUBSCRIPTION_REQUIRED" && err?.status === 402
  );
});

test("shouldConsumeFreeTrip returns true for first unsubscribed individual completion", () => {
  assert.equal(
    shouldConsumeFreeTrip({
      haulerType: "INDIVIDUAL",
      subscriptionStatus: "NONE",
      freeTripUsed: false,
    }),
    true
  );
});

test("shouldConsumeFreeTrip returns false when already used", () => {
  assert.equal(
    shouldConsumeFreeTrip({
      haulerType: "INDIVIDUAL",
      subscriptionStatus: "NONE",
      freeTripUsed: true,
    }),
    false
  );
});

test("shouldConsumeFreeTrip returns false for subscribed individual", () => {
  assert.equal(
    shouldConsumeFreeTrip({
      haulerType: "INDIVIDUAL",
      subscriptionStatus: "ACTIVE",
      freeTripUsed: false,
    }),
    false
  );
});

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}
