import { test } from "node:test";
import assert from "node:assert/strict";
import { isOperationalAccountStatus } from "./inactivityPolicy";

test("operational statuses include active and verified", () => {
  assert.equal(isOperationalAccountStatus("active"), true);
  assert.equal(isOperationalAccountStatus("verified"), true);
  assert.equal(isOperationalAccountStatus("pending"), false);
  assert.equal(isOperationalAccountStatus("not_active"), false);
});
