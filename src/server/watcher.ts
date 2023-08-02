import { extname } from "node:path";
import { consola } from "consola";
import type { AsyncSubscription } from "@parcel/watcher";
import type { ConsolaInstance } from "consola";
import type { Listener, ListenOptions } from "../types";
import { listen } from "../listen";
import { createDevServer } from "./_dev";

export interface WatchOptions {
  cwd?: string;
  logger?: ConsolaInstance;
  ignore?: string[];
  publicDirs?: string[];
}

export async function listenAndWatch(
  entry: string,
  options: Partial<ListenOptions & WatchOptions>,
): Promise<Listener> {
  const logger = options.logger || consola.withTag("listhen");
  let watcher: AsyncSubscription; // eslint-disable-line prefer-const

  // Create dev server
  const devServer = await createDevServer({
    cwd: options.cwd,
    entry,
    logger,
  });

  // Initialize listener
  const listenter = await listen(devServer.nodeListener, options);

  // Load dev server handler first time
  await devServer.reload(true);

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

  // Start watcher
  // https://github.com/parcel-bundler/watcher
  const { subscribe } = await import("@parcel/watcher").then(
    (r) => r.default || r,
  );

  const jsExts = new Set([".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]);
  watcher = await subscribe(
    devServer.cwd,
    (_error, events) => {
      const filteredEvents = events.filter((e) => jsExts.has(extname(e.path)));
      if (filteredEvents.length === 0) {
        return;
      }
      const eventsString = filteredEvents
        .map((e) => `${devServer.resolver.formateRelative(e.path)} ${e.type}d`)
        .join(", ");
      logger.start(` Reloading server (${eventsString})`);
      devServer.reload();
    },
    {
      ignore: options.ignore || [
        "**/.git/**",
        "**/node_modules/**",
        "**/dist/**",
      ],
    },
  );

  logger.log(
    `👀 Watching ${devServer.resolver.formateRelative(
      devServer.cwd,
    )} for changes`,
  );

  return listenter;
}
