import { getClient } from "./client.js";

export const SESSION_URL = "/api/auth/session";
export const REFRESH_URL = "/api/auth/refresh";
export const LOGOUT_URL = "/api/auth/logout";
export const LOGIN_URL = "/api/auth/login";

const OWN_ORIGIN = { baseURL: "" };

export async function fetchSession(client = getClient()) {
  const response = await client.get(SESSION_URL, OWN_ORIGIN);
  return response.data;
}

export async function postRefresh(client = getClient()) {
  const response = await client.post(REFRESH_URL, null, OWN_ORIGIN);
  return response.data;
}

export async function postLogout(client = getClient()) {
  const response = await client.post(LOGOUT_URL, null, OWN_ORIGIN);
  return response.data;
}
