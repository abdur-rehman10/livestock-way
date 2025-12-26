import test from "node:test";
import assert from "node:assert/strict";
import { resolvePaymentModeSelection } from "../utils/paymentMode";
import { assertEscrowEnabled } from "../utils/escrowGuard";

test("assertEscrowEnabled allows escrow trips", () => {
  assert.doesNotThrow(() =>
    assertEscrowEnabled({
      trip: { payment_mode: "ESCROW" } as any,
      payment: { is_escrow: true } as any,
    })
  );
});

test("assertEscrowEnabled blocks direct trips", () => {
  assert.throws(
    () =>
      assertEscrowEnabled({
        trip: { payment_mode: "DIRECT" } as any,
        payment: { is_escrow: false } as any,
      }),
    { message: /Escrow is disabled/ }
  );
});

test("resolvePaymentModeSelection produces DIRECT selection for accepted disclaimer", () => {
  const sel = resolvePaymentModeSelection(
    {
      payment_mode: "DIRECT",
      direct_payment_disclaimer_accepted: true,
      direct_payment_disclaimer_version: "v1",
    },
    "SHIPPER"
  );
  assert.equal(sel.paymentMode, "DIRECT");
  assert.equal(sel.directDisclaimerVersion, "v1");
  assert.ok(sel.directDisclaimerAt);
});
