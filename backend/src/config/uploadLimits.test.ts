import assert from "node:assert/strict";
import test from "node:test";
import {
  SIGNUP_DOCUMENT_MAX_MB,
  parseSignupDocumentMaxMb,
  signupDocumentMaxBytes,
} from "./uploadLimits";

test("parseSignupDocumentMaxMb defaults to 5 MB", () => {
  assert.equal(parseSignupDocumentMaxMb(undefined), 5);
  assert.equal(parseSignupDocumentMaxMb(""), 5);
  assert.equal(parseSignupDocumentMaxMb("5"), 5);
});

test("parseSignupDocumentMaxMb rejects invalid values", () => {
  assert.equal(parseSignupDocumentMaxMb("0"), 5);
  assert.equal(parseSignupDocumentMaxMb("99"), 5);
});

test("signupDocumentMaxBytes matches MB setting", () => {
  assert.equal(signupDocumentMaxBytes(), SIGNUP_DOCUMENT_MAX_MB * 1024 * 1024);
});
