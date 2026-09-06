import axios from "axios";
import { installOn, redirectToLoginOnce } from "./interceptor.js";
import { markReady, ready } from "./ready.js";
import { setLoginPath } from "./redirect.js";
import { setClient } from "./client.js";
import { bindVisibility, scheduleRefresh } from "./refresh.js";
import { fetchSession } from "./session.js";
import { applySession, clearSession, isAuthenticated } from "./store.js";
import { useAuth } from "./useAuth.js";

let bootstrapped = null;
let guardRegistered = false;
let installedClient = null;

export const TrevorismAuth = {
  install(app, options = {}) {
    const client = options.axios ?? axios;
    installedClient = client;
    setLoginPath(options.loginPath);
    installOn(client);
    setClient(client);
    bindVisibility();
    if (options.router && !guardRegistered) {
      guardRegistered = true;
      options.router.beforeEach(createAuthGuard(client));
    }
    if (app?.config?.globalProperties) {
      app.config.globalProperties.$auth = useAuth();
    }
    ensureBootstrapped(client);
  },
};

export function ensureBootstrapped(client = installedClient ?? axios) {
  if (!bootstrapped) {
    bootstrapped = bootstrap(client);
  }
  return bootstrapped;
}

export async function bootstrap(client = axios) {
  try {
    applySession(await fetchSession(client));
  } catch {
    clearSession();
  }
  scheduleRefresh();
  markReady();
}

export function createAuthGuard(client) {
  return async (to) => {
    if (!to?.meta?.requiresAuth) {
      return true;
    }
    await ensureBootstrapped(client);
    await ready;
    if (isAuthenticated.value) {
      return true;
    }
    redirectToLoginOnce(to.fullPath);
    return false;
  };
}

export function resetBootstrapForTests() {
  bootstrapped = null;
  guardRegistered = false;
  installedClient = null;
}
