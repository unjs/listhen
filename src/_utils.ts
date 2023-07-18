import { promises as fs } from "node:fs";
import { networkInterfaces } from "node:os";
import { relative, resolve } from "node:path";
import { colors } from "consola/utils";
import { fileURLToPath } from "mlly";
import type { Certificate, HTTPSOptions } from "./types";

export async function resolveCert(
  options: HTTPSOptions,
  host?: string,
): Promise<Certificate> {
  // Use cert if provided
  if (options.key && options.cert) {
    const isInline = (s = "") => s.startsWith("--");
    const r = (s: string) => (isInline(s) ? s : fs.readFile(s, "utf8"));
    return {
      key: await r(options.key),
      cert: await r(options.cert),
    };
  }

  // Use auto generated cert
  const { generateCA, generateSSLCert } = await import("./cert");
  const ca = await generateCA();
  const cert = await generateSSLCert({
    caCert: ca.cert,
    caKey: ca.key,
    domains:
      options.domains ||
      (["localhost", "127.0.0.1", "::1", host].filter(Boolean) as string[]),
    validityDays: options.validityDays || 1,
  });
  return cert;
}

export function getNetworkInterfaces(v4Only = true): string[] {
  const addrs = new Set<string>();
  for (const details of Object.values(networkInterfaces())) {
    if (details) {
      for (const d of details) {
        if (
          !d.internal &&
          !(d.mac === "00:00:00:00:00:00") &&
          !d.address.startsWith("fe80::") &&
          !(v4Only && (d.family === "IPv6" || +d.family === 6))
        ) {
          addrs.add(formatAddress(d));
        }
      }
    }
  }
  return [...addrs].sort();
}

export function formatAddress(addr: {
  family: string | number;
  address: string;
}) {
  return addr.family === "IPv6" || addr.family === 6
    ? `[${addr.address}]`
    : addr.address;
}

export function formatURL(url: string) {
  return colors.cyan(
    colors.underline(
      decodeURI(url).replace(/:(\d+)\//g, `:${colors.bold("$1")}/`),
    ),
  );
}

export async function createImporter(input: string, _cwd?: string) {
  const cwd = resolve(_cwd ? fileURLToPath(_cwd) : ".");

  const jiti = await import("jiti").then((r) => r.default || r);
  const _jitiRequire = jiti(cwd, {
    esmResolve: true,
    requireCache: false,
    interopDefault: true,
  });

  const entry = _jitiRequire.resolve(input);

  const _import = () => {
    const r = _jitiRequire(input);
    return Promise.resolve(r.default || r);
  };

  return {
    entry,
    relativeEntry: relative(cwd, entry),
    import: _import,
  };
}
