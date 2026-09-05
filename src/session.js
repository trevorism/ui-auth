import axios from "axios";

export const SESSION_URL = "/api/auth/session";
export const REFRESH_URL = "/api/auth/refresh";
export const LOGOUT_URL = "/api/auth/logout";
export const LOGIN_URL = "/api/auth/login";

export async function fetchSession(client = axios) {
  const response = await client.get(SESSION_URL);
  return response.data;
}

export async function postRefresh(client = axios) {
  const response = await client.post(REFRESH_URL);
  return response.data;
}

export async function postLogout(client = axios) {
  const response = await client.post(LOGOUT_URL);
  return response.data;
}
