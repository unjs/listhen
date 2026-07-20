import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "pathe";

export async function createResolver() {
  const { createJiti } = await import("jiti");

  const jiti = createJiti(join(process.cwd(), "_"), {
    cache: true,
    requireCache: false,
    interopDefault: true,
  });

  return {
    relative: (path: string) => relative(process.cwd(), path),
    formatRelative: (path: string) => `\`./${relative(process.cwd(), path)}\``,
    import: jiti.import,
    resolve: (id: string) => jiti.esmResolve(id),
    tryResolve: (id: string) => jiti.esmResolve(id, { try: true }),
    /**
     * Resolve `id` from the first of `dirs` that can see it, falling back to
     * listhen's own dependencies. Returns a `file://` URL.
     *
     * A jiti instance is created per candidate so that a miss returns
     * `undefined` instead of falling back to this instance's root (which would
     * resolve via CJS and pick the wrong build).
     */
    resolveFrom: (id: string, dirs: string[]) => {
      for (const dir of [...dirs, dirname(fileURLToPath(import.meta.url))]) {
        const resolved = createJiti(join(dir, "_")).esmResolve(id, {
          try: true,
        });
        if (resolved) {
          return resolved;
        }
      }
      throw new Error(`Cannot resolve \`${id}\` from ${dirs.join(", ")}`);
    },
  };
}
