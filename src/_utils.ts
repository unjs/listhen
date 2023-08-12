import { networkInterfaces } from "node:os";
import { relative } from "pathe";
import { colors } from "consola/utils";
import { ListenURL, ListenOptions } from "./types";

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

export function getPublicURL(
  urls: ListenURL[],
  listhenOptions: ListenOptions,
): string | undefined {
  if (listhenOptions.publicURL) {
    return listhenOptions.publicURL;
  }

  return (
    detectStackblitzURL(listhenOptions._entry) ||
    urls.find((url) => url.public && url.type === "ipv4")?.url ||
    urls.find((url) => url.public)?.url
  );
}

function detectStackblitzURL(entry?: string) {
  try {
    if (process.env.SHELL !== "/bin/jsh") {
      return;
    }

    const cwd = process.env.PWD || ("" as string);

    // Editor
    if (cwd.startsWith("/home/projects")) {
      const projectId = cwd.split("/")[3];
      const relativeEntry =
        entry && relative(process.cwd(), entry).replace(/^\.\//, "");
      const query = relativeEntry ? `?file=${relativeEntry}` : "";
      return `https://stackblitz.com/edit/${projectId}${query}`;
    }

    // Codeflow
    if (cwd.startsWith("/home")) {
      const githubRepo = cwd.split("/").slice(2).join("/");
      return `https://stackblitz.com/edit/~/github.com/${githubRepo}`;
    }
  } catch (error) {
    console.error(error);
  }
}

export function mergeHttpsOptions(args: {
  https?: boolean;
  tlsCert?: string;
  tlsKey?: string;
  keystore?: string;
  passphrase?: string;
  validity?: string;
  domains?: string;
}) {
  const options = { https: args.https } as any;
  if (!args.https) {
    return args;
  }

  if (args.tlsCert && args.tlsKey) {
    options.https = {
      cert: args.tlsCert,
      key: args.tlsKey,
    };
  } else if (args.keystore) {
    options.https = {
      pfx: args.keystore,
    };
  }

  if (args.passphrase) {
    options.https.passphrase = args.passphrase;
  }

  if (!(args.keystore || (args.tlsCert && args.tlsKey))) {
    if (args.validity) {
      options.https = {
        validityDays: +args.validity,
      };
    }

    if (args.domains) {
      const domains = args.domains.split(",").map((s: string) => s.trim());
      if (typeof options.https === "object") {
        options.https.domains = domains;
      } else {
        options.https = {
          domains,
        };
      }
    }
  }

  return options;
}
