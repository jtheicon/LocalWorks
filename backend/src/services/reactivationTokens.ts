import { createHash, randomBytes } from "node:crypto";
import ReactivationToken from "../model/ReactivationToken";
import { now } from "./inactivityPolicy";

const TOKEN_TTL_DAYS = Number(process.env.REACTIVATION_TOKEN_DAYS) || 30;

export const hashReactivationToken = (raw: string) =>
  createHash("sha256").update(raw).digest("hex");

export const issueReactivationToken = async (userId: string, role: "worker" | "employer") => {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = hashReactivationToken(raw);
  const expiresAt = new Date(now().getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await ReactivationToken.updateMany(
    { userId, role, usedAt: null },
    { $set: { usedAt: now() } },
  );

  await ReactivationToken.create({ userId, role, tokenHash, expiresAt });
  return { raw, expiresAt };
};

export type TokenValidation =
  | { ok: true; userId: string; role: "worker" | "employer"; tokenId: string }
  | { ok: false; code: "invalid" | "expired" | "used" };

export const validateReactivationToken = async (raw: string): Promise<TokenValidation> => {
  if (!raw || raw.length < 16) return { ok: false, code: "invalid" };
  const tokenHash = hashReactivationToken(raw);
  const record = await ReactivationToken.findOne({ tokenHash });
  if (!record) return { ok: false, code: "invalid" };
  if (record.usedAt) return { ok: false, code: "used" };
  if (record.expiresAt.getTime() < now().getTime()) return { ok: false, code: "expired" };
  return {
    ok: true,
    userId: String(record.userId),
    role: record.role,
    tokenId: String(record._id),
  };
};

export const consumeReactivationToken = async (tokenId: string) => {
  await ReactivationToken.updateOne({ _id: tokenId, usedAt: null }, { $set: { usedAt: now() } });
};
