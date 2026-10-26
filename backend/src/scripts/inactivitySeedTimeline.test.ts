import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildInactivitySeedTimeline,
  inboxIdleMonthsForMode,
} from "./inactivitySeedTimeline";
import { DEACTIVATION_MONTHS } from "../services/inactivityPolicy";

test("3-month seed: idle is exactly 3 calendar months before ref", () => {
  const ref = new Date(2026, 9, 26, 15, 0, 0);
  const tl = buildInactivitySeedTimeline(ref, 3);
  assert.equal(tl.calendarMonthsIdle, 3);
  assert.equal(tl.inactivityWarningStage, 0);
  assert.equal(tl.lastInactivityNotificationAt, null);
  assert.equal(tl.emailDueAt.getMonth(), 9);
  assert.equal(tl.emailDueAt.getDate(), 26);
  assert.equal(tl.lastActiveAt.getMonth(), 6);
  assert.equal(tl.lastActiveAt.getDate(), 26);
});

test("4-month seed: stage 3 notice on idle+3, 4-mo email due on ref day", () => {
  const ref = new Date(2026, 9, 26, 15, 0, 0);
  const tl = buildInactivitySeedTimeline(ref, 4);
  assert.equal(tl.calendarMonthsIdle, 4);
  assert.equal(tl.inactivityWarningStage, 3);
  assert.equal(tl.lastActiveAt.getMonth(), 5);
  assert.equal(tl.emailDueAt.getMonth(), 9);
  assert.equal(tl.emailDueAt.getDate(), 26);
});

test("6-month seed: stage 5 prior, deletion due on ref day", () => {
  const ref = new Date(2026, 9, 26, 15, 0, 0);
  const tl = buildInactivitySeedTimeline(ref, DEACTIVATION_MONTHS);
  assert.equal(tl.calendarMonthsIdle, DEACTIVATION_MONTHS);
  assert.equal(tl.inactivityWarningStage, 5);
  assert.equal(tl.emailDueAt.getMonth(), 9);
});

test("inbox sync mode matches npm scripts", () => {
  assert.equal(inboxIdleMonthsForMode("warning-3"), 3);
  assert.equal(inboxIdleMonthsForMode("warning-4"), 4);
  assert.equal(inboxIdleMonthsForMode("warning-5"), 5);
  assert.equal(inboxIdleMonthsForMode("deletion"), DEACTIVATION_MONTHS);
});
