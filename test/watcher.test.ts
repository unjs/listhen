import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { consola } from "consola";
import { afterEach, describe, expect, test, vi } from "vitest";
import { listenAndWatch } from "../src";

describe("watcher", () => {
  afterEach(() => vi.unstubAllEnvs());

  test.each(["jsx", "tsx"])("reloads when a .%s entry changes", async (extension) => {
    vi.stubEnv("JITI_JSX", "true");
    const parent = resolve("test/.tmp");
    await mkdir(parent, { recursive: true });
    const cwd = await mkdtemp(resolve(parent, "watcher-"));
    const entry = resolve(cwd, `server.${extension}`);
    const source = (message: string) =>
      `export default (_req, res) => res.end(${JSON.stringify(message)});`;
    await writeFile(entry, source("before"));

    const listener = await listenAndWatch(entry, {
      cwd,
      hostname: "127.0.0.1",
      port: 0,
      autoClose: false,
      logger: consola.create({ level: -999 }),
    });

    try {
      expect(await fetch(listener.url).then((response) => response.text())).toBe("before");
      await writeFile(entry, source("after"));
      await vi.waitFor(
        async () => {
          expect(await fetch(listener.url).then((response) => response.text())).toBe("after");
        },
        { timeout: 3000 },
      );
    } finally {
      await listener.close();
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
