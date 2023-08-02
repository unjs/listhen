import { relative } from "node:path";

export async function createResolver() {
  const jiti = await import("jiti").then((r) => r.default || r);

  const _jitiRequire = jiti(process.cwd(), {
    esmResolve: true,
    requireCache: false,
    interopDefault: true,
  });

  const _import = (id: string) => {
    const r = _jitiRequire(id);
    return Promise.resolve(r.default || r);
  };

  return {
    relative: (path: string) => relative(process.cwd(), path),
    formateRelative: (path: string) => `\`./${relative(process.cwd(), path)}\``,
    resolve: (id: string) => _jitiRequire.resolve(id),
    import: _import,
  };
}
