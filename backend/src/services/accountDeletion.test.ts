import { test } from "node:test";
import assert from "node:assert/strict";
import { purgeAccountDataForInactivity, purgeAccountRelatedData } from "./accountDeletion";

test("purge helpers are aliased for inactivity monitor imports", () => {
  assert.equal(purgeAccountDataForInactivity, purgeAccountRelatedData);
});
