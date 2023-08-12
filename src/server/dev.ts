import { existsSync, statSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { consola } from "consola";
import { dirname, join, resolve } from "pathe";
import type { ConsolaInstance } from "consola";
import { resolvePath } from "mlly";
import { createResolver } from "./_resolver";

export interface DevServerOptions {
  cwd?: string;
  staticDirs?: string[];
  logger?: ConsolaInstance;
}

export async function createDevServer(
  entry: string,
  options: DevServerOptions,
) {
  const logger = options.logger || consola.withTag("listhen");

  const h3Entry = await resolvePath("h3", {
    url: [options.cwd!, process.cwd(), import.meta.url].filter(Boolean),
  });

  const {
    createApp,
    fromNodeMiddleware,
    serveStatic,
    eventHandler,
    dynamicEventHandler,
    toNodeListener,
  } = (await import(h3Entry)) as typeof import("h3");

  // Initialize resolver
  const resolver = await createResolver();
  const resolveEntry = () => {
    for (const suffix of ["", "/server/src", "/server", "/src"]) {
      const resolved = resolver.tryResolve(entry + suffix);
      if (resolved) {
        return resolved;
      }
    }
  };

  // Guess cwd
  let cwd: string = options.cwd || "";
  if (!cwd) {
    const resolvedEntry = resolveEntry() || resolve(process.cwd(), entry);
    cwd = statSync(resolvedEntry, { throwIfNoEntry: false })?.isDirectory()
      ? resolvedEntry
      : dirname(resolvedEntry);
  }

  // Create app instance
  const app = createApp();

  // Register static asset handlers
  const staticDirs = (options.staticDirs || ["public"])
    .filter(Boolean)
    .map((d) => resolve(cwd, d))
    .filter((d) => existsSync(d) && statSync(d).isDirectory());

  for (const dir of staticDirs) {
    app.use(
      eventHandler(async (event) => {
        await serveStatic(event, {
          fallthrough: true,
          getContents: (id) => readFile(join(dir, id)),
          getMeta: async (id) => {
            const stats = await stat(join(dir, id)).catch(() => {});
            if (!stats || !stats.isFile()) {
              return;
            }
            return {
              size: stats.size,
              mtime: stats.mtimeMs,
            };
          },
        });
      }),
    );
  }

  // Error handler
  let error: unknown;
  app.use(
    eventHandler(() => {
      if (error) {
        return errorTemplate(String(error), (error as Error).stack);
      }
    }),
  );

  // Main (dynamic) handler
  const dynamicHandler = dynamicEventHandler(() => {
    return `<!DOCTYPE html><html lang="en-US"><meta http-equiv="refresh" content="1"></head><body><p>Server is loading...</p>`;
  });
  app.use(dynamicHandler);

  // Handler loader
  let loadTime = 0;
  const loadHandle = async (initial?: boolean) => {
    if (initial) {
      for (const dir of staticDirs) {
        logger.log(
          `📁 Serving static files from ${resolver.formateRelative(dir)}`,
        );
      }
    }
    const start = Date.now();
    try {
      const _entry = resolveEntry();
      if (!_entry) {
        const message = `Cannot find a server entry in ${entry}`;
        logger.warn(message);
        error = new Error(message);
        (error as Error).stack = "";
        return;
      }
      if (initial) {
        logger.log(
          `🚀 Loading server entry ${resolver.formateRelative(_entry)}`,
        );
      }
      let _handler = await resolver
        .import(_entry)
        .then((r) => r.handler || r.handle || r.app || r.default || r);
      if (_handler.handler) {
        _handler = _handler.handler; // h3 app
      }
      dynamicHandler.set(fromNodeMiddleware(_handler));
      error = undefined;
    } catch (_error) {
      error = normalizeErrorStack(_error as Error);
    }
    loadTime = Date.now() - start;
    if (error) {
      logger.error(error);
    } else {
      logger.success(
        ` Server ${initial ? "initialized" : "reloaded"} in ${loadTime}ms`,
      );
    }
  };

  return {
    cwd,
    resolver,
    nodeListener: toNodeListener(app),
    reload: (_initial?: boolean) => loadHandle(_initial),
  };
}

const InternalStackRe = /jiti|node:internal|citty|listhen|listenAndWatch/;

function normalizeErrorStack(error: Error) {
  if (process.env.DEBUG) {
    return error;
  }
  try {
    const cwd = process.cwd();
    (error as Error).stack = (error as Error)
      .stack!.split("\n")
      .slice(1)
      .map((l) => l.replace(cwd, "."))
      .filter((l) => !InternalStackRe.test(l))
      .join("\n");
  } catch {}
  return error;
}

function errorTemplate(message: string, stack = "") {
  return `<!DOCTYPE html>
  <html>
  <head>
  <title>Server Error</title>
  <meta charset="utf-8">
  <meta content="width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no" name=viewport>
  <style>
  .error-page {
    padding: 1rem;
    background: #222;
    color: #fff;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    font-family: sans-serif;
    font-weight: 100 !important;
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .error-page .error {
    max-width: 450px;
  }

  .error-page .title {
    font-size: 1rem;
    margin-top: 15px;
    color: #fff;
    margin-bottom: 8px;
  }

  .error-page .description {
    color: #ccc;
    line-height: 1.2;
    margin-bottom: 10px;
    text-align: left;
  }

  .error-page a {
    color: #ccc !important;
    text-decoration: none;
  }
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
