import { beforeEach } from "vitest";
import { vi } from "vitest";
import { navigation } from "../src/navigation.js";
import { resetLoginRedirect } from "../src/interceptor.js";
import { abandonRefreshes } from "../src/refresh.js";
import { resetSession } from "../src/store.js";
import { resetBootstrapForTests } from "../src/plugin.js";

navigation.currentPath = vi.fn(() => "/here");
navigation.assign = vi.fn();

beforeEach(() => {
  resetSession();
  abandonRefreshes();
  resetLoginRedirect();
  resetBootstrapForTests();
  navigation.assign.mockClear();
  navigation.currentPath.mockClear();
});
