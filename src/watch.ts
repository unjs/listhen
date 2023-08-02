import type { RequestListener } from "node:http";
import { consola } from "consola";
import { dirname } from "pathe";
import type { Listener, ListenOptions, WatchOptions } from "./types";
import { listen } from "./listen";
import { createImporter } from "./_utils";

export async function listenAndWatch(
  input: string,
  options: Partial<ListenOptions & WatchOptions> = {},
): Promise<Listener> {
  const logger = options.logger || consola.withTag("listhen");

  let handle: RequestListener;

  const importer = await createImporter(input);

  const resolveHandle = async () => {
    handle = await importer.import();
  };

  resolveHandle();

  // https://github.com/parcel-bundler/watcher
  const { subscribe } = await import("@parcel/watcher").then(
    (r) => r.default || r,
  );

  const entryDir = dirname(importer.entry);
  const watcher = await subscribe(entryDir, (_error, events) => {
    if (events.length === 0) {
      return;
    }
    logger.log(
      `🔃 Reloading server... (${events
        .map((e) => `\`./${importer.relative(e.path)}\` ${e.type}d`)
        .join(", ")})`,
    );
    resolveHandle();
  });

  const listenter = await listen((...args) => {
    return handle(...args);
  }, options);

  logger.log(`👀 Watching \`./${importer.relative(entryDir)}\` for changes.`);

  const _close = listenter.close;
  listenter.close = async () => {
    await watcher.unsubscribe().catch((error) => {
      logger.error(error);
    });
    await _close();
  };

  return listenter;
}
