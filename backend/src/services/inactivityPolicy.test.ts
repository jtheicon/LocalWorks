import { test } from "node:test";
import assert from "node:assert/strict";
import {
  wholeMonthsSince,
  computeLifecycle,
  computeAdminLifecycle,
  adminActivityReference,
  subtractCalendarMonths,
  setInactivityClock,
  resetInactivityClock,
  nextInactivityMilestone,
  DEACTIVATION_MONTHS,
} from "./inactivityPolicy";

test("wholeMonthsSince uses calendar months", () => {
  setInactivityClock(() => new Date("2026-04-15T12:00:00Z"));
  const activity = new Date("2026-01-20T12:00:00Z");
  assert.equal(wholeMonthsSince(activity), 2);
  resetInactivityClock();
});

test("wholeMonthsSince across month length boundaries", () => {
  setInactivityClock(() => new Date("2026-03-31T12:00:00Z"));
  const activity = new Date("2025-09-30T12:00:00Z");
  assert.equal(wholeMonthsSince(activity), 6);
  resetInactivityClock();
});

test("computeLifecycle inactive from month 3", () => {
  setInactivityClock(() => new Date("2026-07-01T00:00:00Z"));
  const last = subtractCalendarMonths(new Date("2026-07-01T00:00:00Z"), 3);
  assert.equal(computeLifecycle({ status: "active", lastActiveAt: last }), "inactive");
  resetInactivityClock();
});

test("computeLifecycle active when recently used", () => {
  setInactivityClock(() => new Date("2026-07-01T00:00:00Z"));
  const last = subtractCalendarMonths(new Date("2026-07-01T00:00:00Z"), 1);
  assert.equal(computeLifecycle({ status: "active", lastActiveAt: last }), "active");
  resetInactivityClock();
});

test("computeLifecycle deactivated status", () => {
  assert.equal(computeLifecycle({ status: "not_active", lastActiveAt: new Date() }), "deactivated");
});

test("next milestone at three months with no prior warnings", () => {
  setInactivityClock(() => new Date("2026-07-01T00:00:00Z"));
  const last = subtractCalendarMonths(new Date("2026-07-01T00:00:00Z"), 3);
  assert.equal(
    nextInactivityMilestone({ status: "active", lastActiveAt: last, inactivityWarningStage: 0 }),
    3,
  );
  resetInactivityClock();
});

test("legacy users without lastActiveAt are not automated", () => {
  assert.equal(
    nextInactivityMilestone({ status: "active", lastActiveAt: null, inactivityWarningStage: 0 }),
    null,
  );
});

test("verified accounts follow the same inactivity lifecycle as active", () => {
  setInactivityClock(() => new Date("2026-07-01T00:00:00Z"));
  const last = subtractCalendarMonths(new Date("2026-07-01T00:00:00Z"), 4);
  assert.equal(computeLifecycle({ status: "verified", lastActiveAt: last }), "inactive");
  resetInactivityClock();
});

test("admin lifecycle uses older updatedAt when lastActiveAt was pinged without profile change", () => {
  setInactivityClock(() => new Date("2026-10-22T12:00:00Z"));
  const updatedAt = subtractCalendarMonths(new Date("2026-10-22T12:00:00Z"), 8);
  const lastActiveAt = new Date("2026-10-22T10:00:00Z");
  assert.equal(
    computeAdminLifecycle({ status: "active", lastActiveAt, updatedAt }),
    "inactive",
  );
  resetInactivityClock();
});

test("automation uses profile idle when login ping is newer", () => {
  setInactivityClock(() => new Date("2026-10-22T12:00:00Z"));
  const updatedAt = subtractCalendarMonths(new Date("2026-10-22T12:00:00Z"), 8);
  const lastActiveAt = new Date("2026-10-22T10:00:00Z");
  const user = { status: "active", lastActiveAt, updatedAt };
  assert.equal(computeLifecycle(user), "inactive");
  assert.equal(
    nextInactivityMilestone({ ...user, inactivityWarningStage: 0 }),
    DEACTIVATION_MONTHS,
  );
  assert.equal(
    nextInactivityMilestone({ ...user, inactivityWarningStage: 5 }),
    DEACTIVATION_MONTHS,
  );
  resetInactivityClock();
});

test("deactivation milestone at six months", () => {
  setInactivityClock(() => new Date("2026-07-01T00:00:00Z"));
  const last = subtractCalendarMonths(new Date("2026-07-01T00:00:00Z"), DEACTIVATION_MONTHS);
  assert.equal(
    nextInactivityMilestone({ status: "active", lastActiveAt: last, inactivityWarningStage: 5 }),
    DEACTIVATION_MONTHS,
  );
  resetInactivityClock();
});
