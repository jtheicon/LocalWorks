import assert from "node:assert/strict";
import test from "node:test";
import {
  readLifecycleInbox,
  readLifecycleAccountEmail,
  requireLifecycleInbox,
  resolveLifecycleSeedTargets,
} from "./lifecycleInboxEnv";

test("readLifecycleInbox trims and rejects empty", () => {
  const prev = process.env.INACTIVITY_LIFECYCLE_INBOX;
  process.env.INACTIVITY_LIFECYCLE_INBOX = "  user@example.com  ";
  assert.equal(readLifecycleInbox(), "user@example.com");
  process.env.INACTIVITY_LIFECYCLE_INBOX = "   ";
  assert.equal(readLifecycleInbox(), null);
  if (prev === undefined) delete process.env.INACTIVITY_LIFECYCLE_INBOX;
  else process.env.INACTIVITY_LIFECYCLE_INBOX = prev;
});

test("requireLifecycleInbox throws when unset", () => {
  const prev = process.env.INACTIVITY_LIFECYCLE_INBOX;
  delete process.env.INACTIVITY_LIFECYCLE_INBOX;
  assert.throws(() => requireLifecycleInbox("for tests"), /INACTIVITY_LIFECYCLE_INBOX/);
  if (prev !== undefined) process.env.INACTIVITY_LIFECYCLE_INBOX = prev;
});

test("resolveLifecycleSeedTargets splits notify inbox from account login", () => {
  const prevInbox = process.env.INACTIVITY_LIFECYCLE_INBOX;
  const prevAccount = process.env.INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL;
  process.env.INACTIVITY_LIFECYCLE_INBOX = "notify@example.com";
  process.env.INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL = "worker@school.edu";
  assert.deepEqual(resolveLifecycleSeedTargets("for tests"), {
    notifyInbox: "notify@example.com",
    accountEmail: "worker@school.edu",
  });
  delete process.env.INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL;
  assert.deepEqual(resolveLifecycleSeedTargets("for tests"), {
    notifyInbox: "notify@example.com",
    accountEmail: "notify@example.com",
  });
  if (prevInbox === undefined) delete process.env.INACTIVITY_LIFECYCLE_INBOX;
  else process.env.INACTIVITY_LIFECYCLE_INBOX = prevInbox;
  if (prevAccount === undefined) delete process.env.INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL;
  else process.env.INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL = prevAccount;
});

test("readLifecycleAccountEmail trims and rejects empty", () => {
  const prev = process.env.INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL;
  process.env.INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL = "  a@b.com ";
  assert.equal(readLifecycleAccountEmail(), "a@b.com");
  process.env.INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL = "  ";
  assert.equal(readLifecycleAccountEmail(), null);
  if (prev === undefined) delete process.env.INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL;
  else process.env.INACTIVITY_LIFECYCLE_ACCOUNT_EMAIL = prev;
});
