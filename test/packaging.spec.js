import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

function packagedFile(relative) {
  return resolve(root, relative);
}

describe("packaging", () => {
  it("builds every file the manifest points consumers at", () => {
    const entries = [manifest.main, manifest.module, manifest.exports["."].import, manifest.exports["."].require];

    for (const entry of entries) {
      expect(entry, "entry must be declared").toBeTruthy();
      expect(existsSync(packagedFile(entry)), `${entry} is missing from dist`).toBe(true);
    }
  });

  it("ships the require entry as .cjs so node does not parse it as an es module", () => {
    expect(manifest.type).toBe("module");
    expect(manifest.main).toMatch(/\.cjs$/);
    expect(manifest.exports["."].require).toMatch(/\.cjs$/);
  });

  it("builds before publishing", () => {
    expect(manifest.scripts.prepublishOnly).toContain("build");
  });

  it("publishes the scoped package publicly", () => {
    expect(manifest.publishConfig?.access).toBe("public");
  });

  it("keeps vue and axios out of the bundle", () => {
    const bundle = readFileSync(packagedFile(manifest.module), "utf8");

    expect(bundle).not.toContain("createApp");
    expect(bundle).toMatch(/from"vue"|from "vue"/);
    expect(bundle).toMatch(/from"axios"|from "axios"/);
  });
});
