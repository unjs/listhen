import type { RequestListener } from "node:http";
import { resolve } from "node:path";
import { watch } from "node:fs";
import { fileURLToPath } from "mlly";
import type { Listener, ListenOptions, WatchOptions } from "./types";
import { listen } from "./listen";

export async function listenAndWatch(
  input: string,
  options: Partial<ListenOptions & WatchOptions> = {},
): Promise<Listener> {
  const cwd = resolve(options.cwd ? fileURLToPath(options.cwd) : ".");

  const jiti = await import("jiti").then((r) => r.default || r);
  const _jitiRequire = jiti(cwd, {
    esmResolve: true,
    requireCache: false,
    interopDefault: true,
  });

  const entry = _jitiRequire.resolve(input);

  let handle: RequestListener;

  const resolveHandle = () => {
    const imported = _jitiRequire(entry);
    handle = imported.default || imported;
  };

  resolveHandle();

  const watcher = await watch(entry, () => {
    resolveHandle();
  });

  const listenter = await listen((...args) => {
    return handle(...args);
  }, options);

  const _close = listenter.close;
  listenter.close = async () => {
    watcher.close();
    await _close();
  };

  return listenter;
}
