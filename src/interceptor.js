import axios from "axios";
import { login } from "./redirect.js";
import { refreshSession } from "./refresh.js";

const INSTALLED = Symbol.for("trevorism.ui-auth.interceptor");

export function installOn(instance = axios) {
  if (instance[INSTALLED]) {
    return instance;
  }
  instance[INSTALLED] = true;
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error?.config;
      if (!shouldReplay(error, config)) {
        return Promise.reject(error);
      }
      config._retried = true;
      try {
        await refreshSession();
      } catch {
        login();
        return Promise.reject(error);
      }
      return instance(config);
    },
  );
  return instance;
}

function shouldReplay(error, config) {
  if (!config || config._retried) {
    return false;
  }
  if (error?.response?.status !== 401) {
    return false;
  }
  return isProtectedApiUrl(config);
}

export function isProtectedApiUrl(config) {
  try {
    const origin = window.location.origin;
    const base = new URL(config.baseURL ?? "", origin);
    const resolved = new URL(config.url ?? "", base);
    if (resolved.origin !== origin) {
      return false;
    }
    return resolved.pathname.startsWith("/api/") && !resolved.pathname.startsWith("/api/auth/");
  } catch {
    return false;
  }
}
