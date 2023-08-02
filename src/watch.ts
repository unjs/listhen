import type { RequestListener } from "node:http";
import { consola } from "consola";
import { dirname } from "pathe";
import type { AsyncSubscription } from "@parcel/watcher";
import type { Listener, ListenOptions, WatchOptions } from "./types";
import { listen } from "./listen";
import { createImporter } from "./_utils";

export async function listenAndWatch(
  input: string,
  options: Partial<ListenOptions & WatchOptions> = {},
): Promise<Listener> {
  const logger = options.logger || consola.withTag("listhen");
  let watcher: AsyncSubscription; // eslint-disable-line prefer-const
  let handle: RequestListener | undefined;
  let error: undefined | unknown;

  // Initialize listener
  const listenter = await listen((req, res) => {
    if (error) {
      res.end((error as Error)?.stack || error.toString());
    } else if (handle) {
      return handle(req, res);
    } else {
      res.end("Please wait for the server to load.");
    }
  }, options);

  // Hook close event to stop watcher too
  const _close = listenter.close;
  listenter.close = async () => {
    if (watcher) {
      await watcher.unsubscribe().catch((error) => {
        logger.error(error);
      });
    }
    await _close();
  };

  // Initialize resolver
  let loadTime = 0;
  const importer = await createImporter(input);
  const resolveHandle = async () => {
    const start = Date.now();
    try {
      handle = await importer.import();
      error = undefined;
    } catch (_error) {
      error = _error;
    }
    loadTime = Date.now() - start;
  };

  // Resolve handle once
  logger.info(
    `Loading server entry ${importer.formateRelative(importer.entry)}`,
  );
  resolveHandle().then(() => {
    if (error) {
      logger.error(error);
    } else {
      logger.log(`🚀 Server initialized in ${loadTime}ms.`);
    }
  });

  // Start watcher
  // https://github.com/parcel-bundler/watcher
  const { subscribe } = await import("@parcel/watcher").then(
    (r) => r.default || r,
  );

  const entryDir = dirname(importer.entry);
  watcher = await subscribe(entryDir, (_error, events) => {
    if (events.length === 0) {
      return;
    }
    resolveHandle().then(() => {
      const eventsString = events
        .map((e) => `${importer.formateRelative(e.path)} ${e.type}d`)
        .join(", ");
      logger.log(`${eventsString}. Reloading server...`);
      if (error) {
        logger.error(error);
      } else {
        logger.log(`🔃 Server Reloaded in ${loadTime}ms.`);
      }
    });
  });

  logger.log(`👀 Watching ${importer.formateRelative(entryDir)} for changes.`);

  return listenter;
}
