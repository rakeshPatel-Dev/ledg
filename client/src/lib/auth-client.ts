import { createAuthClient } from "better-auth/react";

const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";
const API_ORIGIN =
  API_URL.replace(/\/api\/v1$/, "").replace(/\/+$/, "") || window.location.origin;

export const authClient = createAuthClient({
  baseURL: API_ORIGIN,
});