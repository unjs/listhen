import type { RequestListener } from "node:http";
import { watch } from "node:fs";
import { consola } from "consola";
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

  const watcher = await watch(importer.entry, () => {
    logger.info(`\`${importer.relativeEntry}\` changed, Reloading...`);
    resolveHandle();
  });

  const listenter = await listen((...args) => {
    return handle(...args);
  }, options);

  logger.info(`Watching \`${importer.relativeEntry}\` for changes!`);

  const _close = listenter.close;
  listenter.close = async () => {
    watcher.close();
    await _close();
  };

  return listenter;
}
