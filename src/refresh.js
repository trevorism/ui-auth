import axios from "axios";
import { postRefresh } from "./session.js";
import { applySession, clearSession, expiresAt } from "./store.js";

export const REFRESH_LEAD_MILLIS = 60 * 1000;
export const MINIMUM_DELAY_MILLIS = 5 * 1000;

let client = axios;
let inFlight = null;
let timerId = null;
let visibilityBound = false;
let epoch = 0;

export function setClient(instance) {
  client = instance ?? axios;
}

export function refreshSession() {
  if (!inFlight) {
    const startedAt = epoch;
    inFlight = postRefresh(client)
      .then((body) => {
        if (startedAt === epoch) {
          applySession(body);
          scheduleRefresh();
        }
        return body;
      })
      .catch((error) => {
        if (startedAt === epoch) {
          clearSession();
          clearScheduledRefresh();
        }
        throw error;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function abandonRefreshes() {
  epoch += 1;
  inFlight = null;
  clearScheduledRefresh();
}

export function scheduleRefresh() {
  clearScheduledRefresh();
  const dueAt = refreshDueAt();
  if (dueAt === null || isHidden()) {
    return;
  }
  const delay = Math.max(MINIMUM_DELAY_MILLIS, dueAt - Date.now());
  timerId = setTimeout(() => {
    refreshSession().catch(() => {});
  }, delay);
}

export function clearScheduledRefresh() {
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

export function bindVisibility() {
  if (visibilityBound || typeof document === "undefined") {
    return;
  }
  visibilityBound = true;
  document.addEventListener("visibilitychange", onVisibilityChange);
}

export function onVisibilityChange() {
  if (isHidden()) {
    clearScheduledRefresh();
    return;
  }
  const dueAt = refreshDueAt();
  if (dueAt !== null && dueAt <= Date.now()) {
    refreshSession().catch(() => {});
    return;
  }
  scheduleRefresh();
}

function refreshDueAt() {
  const at = expiresAt();
  if (!at) {
    return null;
  }
  const parsed = Date.parse(at);
  return Number.isNaN(parsed) ? null : parsed - REFRESH_LEAD_MILLIS;
}

function isHidden() {
  return typeof document !== "undefined" && document.hidden === true;
}
