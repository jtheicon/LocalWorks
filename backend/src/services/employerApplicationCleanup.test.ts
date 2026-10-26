import { test } from "node:test";
import assert from "node:assert/strict";
import { applicationWorkerIsStale } from "./employerApplicationCleanup";

test("applicationWorkerIsStale when worker document is missing", () => {
  const map = new Map<string, { status?: string; name?: string }>();
  assert.equal(applicationWorkerIsStale("507f1f77bcf86cd799439011", map), true);
});

test("applicationWorkerIsStale when worker is deleted tombstone", () => {
  const map = new Map([
    [
      "w1",
      {
        status: "deleted",
        name: "Pat (deleted)#deleted-507f1f77bcf86cd799439011",
      },
    ],
  ]);
  assert.equal(applicationWorkerIsStale("w1", map), true);
});

test("applicationWorkerIsStale when worker is active", () => {
  const map = new Map([["w1", { status: "active", name: "Maria Santos" }]]);
  assert.equal(applicationWorkerIsStale("w1", map), false);
});
