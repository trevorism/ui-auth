import axios from "axios";
import { login } from "./redirect.js";
import { setClient } from "./client.js";
import { refreshSession } from "./refresh.js";
import { isAuthenticated } from "./store.js";

const INSTALLED = Symbol.for("trevorism.ui-auth.interceptor");

let loginRedirected = false;

export function installOn(instance = axios) {
  if (instance[INSTALLED]) {
    return instance;
  }
  instance[INSTALLED] = true;
  setClient(instance);
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error?.config;
      if (!shouldReplay(error, config)) {
        return Promise.reject(error);
      }
      const wasAuthenticated = isAuthenticated.value;
      config._retried = true;
      try {
        await refreshSession();
      } catch {
        if (wasAuthenticated) {
          redirectToLoginOnce();
        }
        return Promise.reject(error);
      }
      return instance(config);
    },
  );
  return instance;
}

export function redirectToLoginOnce(next) {
  if (loginRedirected) {
    return false;
  }
  loginRedirected = true;
  login(next);
  return true;
}

export function resetLoginRedirect() {
  loginRedirected = false;
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
    const resolved = new URL(fullPath(config), origin);
    if (resolved.origin !== origin) {
      return false;
    }
    return resolved.pathname.startsWith("/api/") && !resolved.pathname.startsWith("/api/auth/");
  } catch {
    return false;
  }
}

function fullPath(config) {
  const url = config.url ?? "";
  const baseURL = config.baseURL;
  if (!baseURL || /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url)) {
    return url;
  }
  return `${baseURL.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}
