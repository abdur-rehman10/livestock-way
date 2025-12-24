import assert from "node:assert/strict";
import { resolvePaymentModeSelection } from "../utils/paymentMode";
import { assertDisputesEnabled, assertEscrowEnabled } from "../utils/escrowGuard";

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

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}
