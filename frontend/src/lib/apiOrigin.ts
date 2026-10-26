/** Backend origin for REST + socket. In dev, use same-origin (Vite proxy → :8920) so auth cookies work. */
export const resolveApiOrigin = (): string => {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (import.meta.env.DEV) return "";
  return "http://localhost:8920";
};

export const API_ORIGIN = resolveApiOrigin();
