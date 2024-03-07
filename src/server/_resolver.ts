import { relative } from "pathe";

export async function createResolver() {
  const jiti = await import("jiti").then((r) => r.default || r);

  const _jitiRequire = jiti(process.cwd(), {
    cache: true,
    esmResolve: true,
    requireCache: false,
    interopDefault: true,
  });

  const _import = (id: string) => {
    const r = _jitiRequire(id);
    return Promise.resolve(r.default || r);
  };

  const resolve = (id: string) => _jitiRequire.resolve(id);

  const tryResolve = (id: string) => {
    try {
      return resolve(id);
    } catch {}
  };

  return {
    relative: (path: string) => relative(process.cwd(), path),
    formateRelative: (path: string) => `\`./${relative(process.cwd(), path)}\``,
    import: _import,
    resolve,
    tryResolve,
  };
}
