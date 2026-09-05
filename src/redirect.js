import { navigation } from "./navigation.js";
import { clearScheduledRefresh } from "./refresh.js";
import { LOGIN_URL, postLogout } from "./session.js";
import { clearSession } from "./store.js";

export function login(next = navigation.currentPath()) {
  navigation.assign(`${LOGIN_URL}?next=${encodeURIComponent(next)}`);
}

export async function logout() {
  const logoutUrl = await resolveLogoutUrl();
  clearSession();
  clearScheduledRefresh();
  navigation.assign(logoutUrl ?? "/");
}

async function resolveLogoutUrl() {
  try {
    const body = await postLogout();
    return body?.logoutUrl ?? null;
  } catch {
    return null;
  }
}
