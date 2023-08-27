import { networkInterfaces } from "node:os";
import { relative } from "pathe";
import { colors } from "consola/utils";
import { ListenOptions } from "./types";

export function getNetworkInterfaces(includeIPV6?: boolean): string[] {
  const addrs = new Set<string>();
  for (const details of Object.values(networkInterfaces())) {
    if (details) {
      for (const d of details) {
        if (
          !d.internal &&
          !(d.mac === "00:00:00:00:00:00") &&
          !d.address.startsWith("fe80::") &&
          !(!includeIPV6 && (d.family === "IPv6" || +d.family === 6))
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

const localhostRegex = /^127(\.\d{1,3}){3}$|^localhost$|^::1$/;
export function isLocalhost(hostname: string | undefined) {
  return hostname === undefined ? false : localhostRegex.test(hostname);
}

const anyhostRegex = /^$|^0\.0\.0\.0$|^::$/;
export function isAnyhost(hostname: string | undefined) {
  return hostname === undefined ? false : anyhostRegex.test(hostname);
}

export function generateURL(
  hostname: string,
  listhenOptions: ListenOptions,
  baseURL?: string,
) {
  const proto = listhenOptions.https ? "https://" : "http://";
  let port = listhenOptions.port || "";
  if (
    (port === 80 && proto === "http://") ||
    (port === 443 && proto === "https://")
  ) {
    port = "";
  }
  if (hostname.includes(":")) {
    hostname = `[${hostname}]`;
  }
  return (
    proto + hostname + ":" + port + (baseURL || listhenOptions.baseURL || "")
  );
}

export function getPublicURL(
  listhenOptions: ListenOptions,
  baseURL?: string,
): string | undefined {
  if (listhenOptions.publicURL) {
    return listhenOptions.publicURL;
  }

  const stackblitzURL = detectStackblitzURL(listhenOptions._entry);
  if (stackblitzURL) {
    return stackblitzURL;
  }

  if (
    listhenOptions.hostname &&
    !isLocalhost(listhenOptions.hostname) &&
    !isAnyhost(listhenOptions.hostname)
  ) {
    return generateURL(listhenOptions.hostname, listhenOptions, baseURL);
  }
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
