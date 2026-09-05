import { computed, reactive, readonly } from "vue";

const EMPTY_SESSION = {
  authenticated: false,
  username: null,
  role: null,
  permissions: null,
  tenant: null,
  admin: false,
  expiresAt: null,
};

const state = reactive({ ...EMPTY_SESSION, loading: true });

export const session = readonly(state);

export const isAuthenticated = computed(() => state.authenticated);

export const isAdmin = computed(() => state.authenticated && state.admin);

export const loading = computed(() => state.loading);

export const user = computed(() =>
  state.authenticated
    ? {
        username: state.username,
        role: state.role,
        permissions: state.permissions,
        tenant: state.tenant,
        admin: state.admin,
      }
    : null,
);

export function applySession(body) {
  if (!body || !body.authenticated) {
    clearSession();
    return;
  }
  state.authenticated = true;
  state.username = body.username ?? null;
  state.role = body.role ?? null;
  state.permissions = body.permissions ?? null;
  state.tenant = body.tenant ?? null;
  state.admin = body.admin === true;
  state.expiresAt = body.expiresAt ?? null;
  state.loading = false;
}

export function clearSession() {
  Object.assign(state, EMPTY_SESSION);
  state.loading = false;
}

export function expiresAt() {
  return state.expiresAt;
}
