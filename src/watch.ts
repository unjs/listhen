import type { RequestListener } from "node:http";
import { consola } from "consola";
import { colors } from "consola/utils";
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
      res.setHeader("Content-Type", "text/html");
      return res.end(errorTemplate(error.toString(), (error as Error)?.stack));
    } else if (handle) {
      return handle(req, res);
    } else {
      res.setHeader("Content-Type", "text/html");
      return res.end(
        `<!DOCTYPE html><html lang="en-US"><meta http-equiv="refresh" content="3"></head><body><p>Server is loading...</p>`,
      );
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
  logger.log(
    colors.gray(
      `🚀 Loading server entry ${importer.formateRelative(importer.entry)}`,
    ),
  );
  resolveHandle().then(() => {
    if (error) {
      logger.error(error);
    } else {
      logger.log(
        colors.gray(`✅ Server initialized in ${colors.bold(loadTime)}ms.`),
      );
    }
  });

  // Start watcher
  // https://github.com/parcel-bundler/watcher
  const { subscribe } = await import("@parcel/watcher").then(
    (r) => r.default || r,
  );

  const entryDir = dirname(importer.entry);
  watcher = await subscribe(
    entryDir,
    (_error, events) => {
      if (events.length === 0) {
        return;
      }
      resolveHandle().then(() => {
        const eventsString = events
          .map(
            (e) =>
              `${colors.cyan(`./${importer.relative(e.path)}`)} ${e.type}d`,
          )
          .join(", ");
        logger.log(colors.gray(`🔃 Reloading server... (${eventsString})`));
        if (error) {
          logger.error(error);
        } else {
          logger.log(
            colors.gray(`✅ Server reloaded in ${colors.bold(loadTime)}ms.`),
          );
        }
      });
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
    colors.gray(
      `👀 Watching ${colors.cyan(
        "./" + importer.relative(entryDir),
      )} for changes.`,
    ),
  );

  return listenter;
}

function errorTemplate(message: string, stack?: string) {
  return `<!DOCTYPE html>
  <html>
  <head>
  <title>Server Error</title>
  <meta charset="utf-8">
  <meta content="width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no" name=viewport>
  <style>
  .error-page{padding: 1rem;background:#f7f8fb;color:#47494e;text-align:center;display:flex;justify-content:center;align-items:center;flex-direction:column;font-family:sans-serif;font-weight:100!important;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;-webkit-font-smoothing:antialiased;position:absolute;top:0;left:0;right:0;bottom:0}.error-page .error{max-width:450px}.error-page .title{font-size:24px;font-size:1.5rem;margin-top:15px;color:#47494e;margin-bottom:8px}.error-page .description{color:#7f828b;line-height:21px;margin-bottom:10px;text-align:left;}.error-page a{color:#7f828b!important;text-decoration:none}
  </style>
  </head>
  <body>
    <div class="error-page">
      <div class="error">
          <svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" fill="#DBE1EC" viewBox="0 0 48 48"><path d="M22 30h4v4h-4zm0-16h4v12h-4zm1.99-10C12.94 4 4 12.95 4 24s8.94 20 19.99 20S44 35.05 44 24 35.04 4 23.99 4zM24 40c-8.84 0-16-7.16-16-16S15.16 8 24 8s16 7.16 16 16-7.16 16-16 16z"/></svg>
          <div class="title">Server Error</div>
          <div class="description">${message}<pre>${stack}</pre></div>
      </div>
    </div>
  </body>
  </html>`;
}
