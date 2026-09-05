import { ready } from "./ready.js";
import { login, logout } from "./redirect.js";
import { refreshSession } from "./refresh.js";
import { isAdmin, isAuthenticated, loading, user } from "./store.js";

export function useAuth() {
  return {
    user,
    isAuthenticated,
    isAdmin,
    loading,
    ready,
    login,
    logout,
    refresh: refreshSession,
  };
}
