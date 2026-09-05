import axios from "axios";
import { installOn, redirectToLoginOnce } from "./interceptor.js";
import { markReady, ready } from "./ready.js";
import { bindVisibility, scheduleRefresh, setClient } from "./refresh.js";
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
    installOn(client);
    setClient(client);
    bindVisibility();
    if (options.router && !guardRegistered) {
      guardRegistered = true;
      options.router.beforeEach(createAuthGuard());
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

export function createAuthGuard() {
  return async (to) => {
    if (!to?.meta?.requiresAuth) {
      return true;
    }
    await ensureBootstrapped();
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
