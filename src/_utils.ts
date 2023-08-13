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
    urls.find((url) => url.type === "network" && !url.url.startsWith("["))
      ?.url ||
    urls.find((url) => url.type === "network")?.url
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
