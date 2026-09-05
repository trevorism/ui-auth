import axios from "axios";
import { installOn } from "./interceptor.js";
import { markReady, ready } from "./ready.js";
import { login } from "./redirect.js";
import { bindVisibility, scheduleRefresh, setClient } from "./refresh.js";
import { fetchSession } from "./session.js";
import { applySession, clearSession, isAuthenticated } from "./store.js";
import { useAuth } from "./useAuth.js";

export const TrevorismAuth = {
  install(app, options = {}) {
    const client = options.axios ?? axios;
    installOn(client);
    setClient(client);
    bindVisibility();
    if (options.router) {
      options.router.beforeEach(createAuthGuard());
    }
    if (app?.config?.globalProperties) {
      app.config.globalProperties.$auth = useAuth();
    }
    bootstrap(client);
  },
};

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
    await ready;
    if (isAuthenticated.value) {
      return true;
    }
    login(to.fullPath);
    return false;
  };
}
