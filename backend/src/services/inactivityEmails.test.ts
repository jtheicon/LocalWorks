import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accountDisplayName,
  isPurgedDisplayName,
  resolveLifecycleGreetingName,
  accountLifecycleEmail,
  emailGreetingName,
  INACTIVITY_WARNING_DATA_PRESERVED,
} from "./inactivityEmails";

test("account lifecycle emails use a configured override", () => {
  assert.equal(accountLifecycleEmail("demo@localworks-inactivity.test", "worker@example.com"), "worker@example.com");
});

test("account lifecycle emails fall back to the registered email", () => {
  assert.equal(accountLifecycleEmail("worker@example.com"), "worker@example.com");
  assert.equal(accountLifecycleEmail("worker@example.com", "  "), "worker@example.com");
});

test("emailGreetingName uses the first name", () => {
  assert.equal(emailGreetingName("Maria Santos"), "Maria");
  assert.equal(emailGreetingName("  Juan Dela Cruz "), "Juan");
  assert.equal(emailGreetingName(""), "there");
});

test("accountDisplayName prefers worker name and employer owner", () => {
  assert.equal(accountDisplayName({ email: "w@x.com", name: "Joshua Zabala" }, "worker"), "Joshua Zabala");
  assert.equal(
    accountDisplayName({ email: "e@x.com", company: "Acme", owner: "Ana Reyes" }, "employer"),
    "Ana Reyes",
  );
  assert.equal(accountDisplayName({ email: "e@x.com", company: "Acme Corp" }, "employer"), "Acme Corp");
});

test("accountDisplayName ignores purged tombstone labels", () => {
  assert.equal(isPurgedDisplayName("Removed user#purged-abc"), true);
  assert.equal(
    accountDisplayName(
      { email: "w@x.com", name: "Removed user#purged-abc", owner: "Real Owner" },
      "worker",
    ),
    "there",
  );
  assert.equal(
    accountDisplayName(
      { email: "w@x.com", name: "Joshua Zabala" },
      "worker",
    ),
    "Joshua Zabala",
  );
});

test("inactivity warning copy preserves CV/resume until deletion threshold", () => {
  assert.match(INACTIVITY_WARNING_DATA_PRESERVED, /CV\/Resume/);
  assert.match(INACTIVITY_WARNING_DATA_PRESERVED, /do not remove your data/i);
});

test("resolveLifecycleGreetingName prefers account holder on their login email", () => {
  const account = { email: "worker@example.com", name: "Maria Santos" };
  assert.equal(
    resolveLifecycleGreetingName(account, "worker", "worker@example.com", "Joav Admin"),
    "Maria Santos",
  );
  assert.equal(
    resolveLifecycleGreetingName(account, "worker", "inbox@school.edu", "Joav Admin"),
    "Joav Admin",
  );
  assert.equal(
    resolveLifecycleGreetingName(account, "worker", "unknown@inbox.edu", null),
    "Maria Santos",
  );
});
