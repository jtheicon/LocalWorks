/** Backend origin for REST + sockets; production uses same-origin requests through the reverse proxy. */
export const resolveApiOrigin = (): string => {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "";
};

export const API_ORIGIN = resolveApiOrigin();
