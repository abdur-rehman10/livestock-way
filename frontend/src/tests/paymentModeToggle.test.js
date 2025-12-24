import assert from "node:assert/strict";
import { canProceedDirect } from "../utils/paymentModeLogic.js";

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test("cannot proceed direct without acceptance", () => {
  assert.equal(canProceedDirect(false), false);
});

test("can proceed direct once accepted", () => {
  assert.equal(canProceedDirect(true), true);
});
