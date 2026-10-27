import assert from "node:assert/strict";
import test from "node:test";
import { pollSignupScan, _clearSignupScansForTests } from "./signupDocumentScan";

test("pollSignupScan returns null for unknown id", () => {
  _clearSignupScansForTests();
  assert.equal(pollSignupScan("00000000-0000-4000-8000-000000000000"), null);
});
