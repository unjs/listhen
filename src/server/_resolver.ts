import { join, relative } from "pathe";

export async function createResolver() {
  const { createJiti } = await import("jiti");

  const jiti = createJiti(join(process.cwd(), '_'), {
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
  };
}
