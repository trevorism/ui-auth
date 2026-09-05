import { beforeEach, vi } from "vitest";
import { navigation } from "../src/navigation.js";
import { clearScheduledRefresh } from "../src/refresh.js";
import { clearSession } from "../src/store.js";

navigation.currentPath = vi.fn(() => "/here");
navigation.assign = vi.fn();

beforeEach(() => {
  clearSession();
  clearScheduledRefresh();
  navigation.assign.mockClear();
  navigation.currentPath.mockClear();
});
