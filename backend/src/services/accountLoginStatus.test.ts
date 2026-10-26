import { test } from "node:test";
import assert from "node:assert/strict";
import { accountLoginFailure } from "./accountLoginStatus";

test("deleted accounts cannot sign in", () => {
  assert.equal(accountLoginFailure("deleted", "inactivity")?.code, "ACCOUNT_DELETED");
});

test("active and verified accounts can proceed to password-based login", () => {
  assert.equal(accountLoginFailure("active"), null);
  assert.equal(accountLoginFailure("verified"), null);
});

test("pending, deactivated, and unknown account states fail closed", () => {
  assert.equal(accountLoginFailure("pending")?.message.includes("being verified"), true);
  assert.equal(accountLoginFailure("not_active", "admin")?.code, "ACCOUNT_DEACTIVATED");
  assert.equal(accountLoginFailure("unexpected-status")?.code, "ACCOUNT_UNAVAILABLE");
});
