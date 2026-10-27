import assert from "node:assert/strict";
import test from "node:test";
import { shouldScheduleAccountCleanup } from "./inactivityMonitor";

test("shouldScheduleAccountCleanup is off when ACCOUNT_CLEANUP=off", () => {
  const env = { ...process.env, ACCOUNT_CLEANUP: "off", NODE_ENV: "production" };
  const prev = process.env;
  process.env = env as NodeJS.ProcessEnv;
  assert.equal(shouldScheduleAccountCleanup(), false);
  process.env = prev;
});

test("shouldScheduleAccountCleanup defaults off outside production", () => {
  const env = { ...process.env, NODE_ENV: "development" };
  delete (env as Record<string, string | undefined>).ACCOUNT_CLEANUP;
  const prev = process.env;
  process.env = env as NodeJS.ProcessEnv;
  assert.equal(shouldScheduleAccountCleanup(), false);
  process.env = prev;
});

test("shouldScheduleAccountCleanup allows dev when ACCOUNT_CLEANUP=on", () => {
  const env = { ...process.env, NODE_ENV: "development", ACCOUNT_CLEANUP: "on" };
  const prev = process.env;
  process.env = env as NodeJS.ProcessEnv;
  assert.equal(shouldScheduleAccountCleanup(), true);
  process.env = prev;
});

test("shouldScheduleAccountCleanup on in production by default", () => {
  const env = { ...process.env, NODE_ENV: "production" };
  delete (env as Record<string, string | undefined>).ACCOUNT_CLEANUP;
  const prev = process.env;
  process.env = env as NodeJS.ProcessEnv;
  assert.equal(shouldScheduleAccountCleanup(), true);
  process.env = prev;
});
