import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FORMER_WORKER_LABEL,
  employerWorkerDisplayName,
  formatApplicationForEmployer,
  isReleasedTombstoneName,
  isWorkerUnavailableToEmployer,
} from "./employerWorkerDisplay";

test("isReleasedTombstoneName detects signup-release suffix", () => {
  assert.equal(
    isReleasedTombstoneName("Juan Dela Cruz (deleted)#deleted-6ada1ec2c57097bfa1926427"),
    true,
  );
  assert.equal(isReleasedTombstoneName("Juan Dela Cruz"), false);
});

test("employerWorkerDisplayName hides tombstone and purged labels", () => {
  assert.equal(
    employerWorkerDisplayName({ name: "Removed user#purged-abc", status: "deleted" }),
    FORMER_WORKER_LABEL,
  );
  assert.equal(employerWorkerDisplayName({ name: "Maria Santos", status: "active" }), "Maria Santos");
});

test("formatApplicationForEmployer drops pending apps for removed workers", () => {
  const pending = formatApplicationForEmployer({
    _id: "a1",
    status: "Pending Review",
    job: { _id: "j1", title: "Cook" },
    worker: { _id: "w1", name: "X (deleted)#deleted-6ada1ec2c57097bfa1926427", status: "deleted" },
  });
  assert.equal(pending, null);
});

test("formatApplicationForEmployer hides accepted rows for removed workers", () => {
  const accepted = formatApplicationForEmployer({
    _id: "a2",
    status: "Accepted",
    job: { _id: "j1", title: "Programming" },
    worker: {
      _id: "w1",
      name: "JERYK LOIS M VIDAL (deleted)#deleted-6ada1ec2c57097bfa1926427",
      status: "deleted",
      skills: ["JavaScript"],
      photo: "/x",
    },
  });
  assert.equal(accepted, null);
});
