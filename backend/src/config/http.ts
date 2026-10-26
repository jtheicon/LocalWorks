import { CookieOptions } from "express";

const configuredOrigins = process.env.CORS_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const allowedOrigins =
  configuredOrigins && configuredOrigins.length > 0
    ? configuredOrigins
    : ["http://localhost:8080"];

const isProduction = process.env.NODE_ENV === "production";

export const authCookieOptions = (): CookieOptions => ({
  expires: new Date(Date.now() + 60 * 60 * 1000),
  httpOnly: true,
  path: "/",
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
});

export const clearAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
};
