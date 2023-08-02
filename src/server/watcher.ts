import { consola } from "consola";
import { dirname } from "pathe";
import type { AsyncSubscription } from "@parcel/watcher";
import type { ConsolaInstance } from "consola";
import type { Listener, ListenOptions } from "../types";
import { listen } from "../listen";
import { createDevServer } from "./_dev";

export interface WatchOptions {
  cwd?: string;
  logger?: ConsolaInstance;
  ignore?: string[];
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

  // Log about public dirs
  for (const dir of devServer.staticDirs) {
    logger.log(
      `📁 Serving static files from ${devServer.resolver.formateRelative(dir)}`,
    );
  }

  // Start watcher
  // https://github.com/parcel-bundler/watcher
  const { subscribe } = await import("@parcel/watcher").then(
    (r) => r.default || r,
  );

  const entryDir = dirname(entry);
  watcher = await subscribe(
    entryDir,
    (_error, events) => {
      if (events.length === 0) {
        return;
      }
      const eventsString = events
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
    `👀 Watching ${devServer.resolver.formateRelative(entryDir)} for changes`,
  );

  return listenter;
}
