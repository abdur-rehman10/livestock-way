import test from "node:test";
import assert from "node:assert/strict";
import { resolvePaymentModeSelection } from "../utils/paymentMode";

test("defaults to ESCROW when no input provided", () => {
  const result = resolvePaymentModeSelection({}, "SHIPPER");
  assert.equal(result.paymentMode, "ESCROW");
  assert.equal(result.directDisclaimerAt, null);
  assert.equal(result.directDisclaimerVersion, null);
});

test("rejects invalid payment_mode values", () => {
  assert.throws(() => resolvePaymentModeSelection({ payment_mode: "INVALID" }, "SHIPPER"), {
    message: /Invalid payment_mode/,
  });
});

test("rejects DIRECT without acceptance", () => {
  assert.throws(
    () =>
      resolvePaymentModeSelection(
        { payment_mode: "DIRECT", direct_payment_disclaimer_version: "v1" },
        "SHIPPER"
      ),
    { message: /direct_payment_disclaimer_accepted/ }
  );
});

test("rejects DIRECT without version", () => {
  assert.throws(
    () =>
      resolvePaymentModeSelection(
        { payment_mode: "DIRECT", direct_payment_disclaimer_accepted: true },
        "SHIPPER"
      ),
    { message: /direct_payment_disclaimer_version/ }
  );
});

test("prevents hauler from overriding payment mode", () => {
  assert.throws(
    () =>
      resolvePaymentModeSelection(
        { payment_mode: "DIRECT", direct_payment_disclaimer_accepted: true, direct_payment_disclaimer_version: "v1" },
        "HAULER"
      ),
    { message: /Only shippers/ }
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
  assert.ok(!Number.isNaN(Date.parse(result.directDisclaimerAt)));
});
