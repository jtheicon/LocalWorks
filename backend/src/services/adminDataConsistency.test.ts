import assert from "node:assert/strict";
import { test } from "node:test";
import { mapUserLifecycleRow } from "../controller/accountLifecycle";
import { bucketAccountHealth } from "./adminAccountBuckets";
import { setInactivityClock, resetInactivityClock, subtractCalendarMonths } from "./inactivityPolicy";

test("lifecycle row and account health bucket agree on monitoring state", () => {
  setInactivityClock(() => new Date("2026-10-22T12:00:00Z"));
  const updatedAt = subtractCalendarMonths(new Date("2026-10-22T12:00:00Z"), 8);
  const lastActiveAt = new Date("2026-10-22T10:00:00Z");
  const doc = {
    _id: "abc",
    name: "Test",
    email: "t@test.com",
    status: "active",
    lastActiveAt,
    updatedAt,
    createdAt: updatedAt,
    inactivityWarningStage: 0,
  };
  const row = mapUserLifecycleRow(doc, "worker");
  const buckets = bucketAccountHealth([doc]);
  assert.equal(row.lifecycle, "inactive");
  assert.equal(row.automatedLifecycle, "inactive");
  assert.equal(row.eligibleForAutoDeactivation, true);
  assert.equal(buckets.inactivityMonitoring, 1);
  assert.equal(buckets.platformActive, 0);
  resetInactivityClock();
});
