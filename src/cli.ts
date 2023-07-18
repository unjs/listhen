import { resolve } from "node:path";
import { defineCommand, runMain as _runMain } from "citty";
import { name, description, version } from "../package.json";
import { listen } from "./listen";
import { listenAndWatch } from "./watch";
import type { ListenOptions, WatchOptions } from "./types";
import { createImporter } from "./_utils";

export const main = defineCommand({
  meta: {
    name,
    description,
    version,
  },
  args: {
    cwd: {
      type: "string",
      description: "Current working directory",
    },
    entry: {
      type: "positional",
      description: "Listener entry file (./app.ts)",
      required: true,
    },
    port: {
      type: "string",
      description:
        "Port to listen on (use PORT environment variable to override)",
    },
    host: {
      type: "string",
      description:
        "Host to listen on (use HOST environment variable to override)",
    },
    clipboard: {
      type: "boolean",
      description: "Copy the URL to the clipboard",
      default: false,
    },
    open: {
      type: "boolean",
      description: "Open the URL in the browser",
      default: false,
    },
    baseURL: {
      type: "string",
      description: "Base URL to use",
    },
    name: {
      type: "string",
      description: "Name to use in the banner",
    },
    https: {
      type: "boolean",
      description: "Enable HTTPS",
      default: false,
    },
    watch: {
      type: "boolean",
      description: "Watch for changes",
      alias: "w",
      default: false,
    },
  },
  async run({ args }) {
    const cwd = resolve(args.cwd || ".");
    process.chdir(cwd);

    const opts: Partial<ListenOptions & WatchOptions> = {
      ...args,
      cwd,
      port: args.port,
      hostname: args.host,
      clipboard: args.clipboard,
      open: args.open,
      baseURL: args.baseURL,
      name: args.name,
      https: args.https, // TODO: Support custom cert
    };

    if (args.watch) {
      await listenAndWatch(args.entry, opts);
    } else {
      const importer = await createImporter(args.entry);
      const handler = await importer.import();
      await listen(handler, opts);
    }
  },
});

export const runMain = () => _runMain(main);
