import assert from "node:assert/strict";
import { test } from "node:test";
import { bucketAccountHealth } from "./adminAccountBuckets";
import { setInactivityClock, resetInactivityClock, subtractCalendarMonths } from "./inactivityPolicy";

test("account health buckets match user management lifecycle", () => {
  setInactivityClock(() => new Date("2026-10-22T12:00:00Z"));
  const updatedAt = subtractCalendarMonths(new Date("2026-10-22T12:00:00Z"), 8);
  const lastActiveAt = new Date("2026-10-22T10:00:00Z");
  const buckets = bucketAccountHealth([
    { status: "active", lastActiveAt, updatedAt, createdAt: updatedAt },
    { status: "not_active", deactivation: { reason: "inactivity" } },
    { status: "pending" },
  ]);
  assert.equal(buckets.inactivityMonitoring, 1);
  assert.equal(buckets.deactivated, 1);
  assert.equal(buckets.legacyInactivityDeactivated, 1);
  assert.equal(buckets.autoDeactivated, buckets.legacyInactivityDeactivated);
  assert.equal(buckets.pending, 1);
  resetInactivityClock();
});
