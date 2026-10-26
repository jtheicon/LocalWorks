import { test } from "node:test";
import assert from "node:assert/strict";
import { accountLifecycleEmail } from "./inactivityEmails";

test("account lifecycle emails use a configured override", () => {
  assert.equal(accountLifecycleEmail("demo@localworks-inactivity.test", "worker@example.com"), "worker@example.com");
});

test("account lifecycle emails fall back to the registered email", () => {
  assert.equal(accountLifecycleEmail("worker@example.com"), "worker@example.com");
  assert.equal(accountLifecycleEmail("worker@example.com", "  "), "worker@example.com");
});
