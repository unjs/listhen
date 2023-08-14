import { createServer } from "node:http";
import type { Server as HTTPServer } from "node:https";
import { createServer as createHTTPSServer } from "node:https";
import { promisify } from "node:util";
import type { RequestListener, Server } from "node:http";
import type { AddressInfo } from "node:net";
import { getPort } from "get-port-please";
import addShutdown from "http-shutdown";
import { defu } from "defu";
import { ColorName, getColor, colors } from "consola/utils";
import { renderUnicodeCompact as renderQRCode } from "uqr";
import type { Tunnel } from "untun";
import { open } from "./lib/open";
import type {
  ListenOptions,
  Listener,
  ShowURLOptions,
  HTTPSOptions,
  ListenURL,
  GetURLOptions,
} from "./types";
import {
  formatAddress,
  formatURL,
  getNetworkInterfaces,
  getPublicURL,
} from "./_utils";
import { resolveCertificate } from "./_cert";

export async function listen(
  handle: RequestListener,
  _options: Partial<ListenOptions> = {},
): Promise<Listener> {
  const _isProd = _options.isProd ?? process.env.NODE_ENV === "production";
  const _isTest = _options.isTest ?? process.env.NODE_ENV === "test";
  const _hostname = process.env.HOST ?? _options.hostname;
  const _public =
    _options.public ??
    (process.argv.includes("--host") ? true : undefined) ??
    (_hostname === "localhost" ? false : _isProd);

  const listhenOptions = defu<ListenOptions, ListenOptions[]>(_options, {
    name: "",
    https: false,
    port: process.env.PORT || 3000,
    hostname: _hostname ?? (_public ? "" : "localhost"),
    showURL: true,
    baseURL: "/",
    open: false,
    clipboard: false,
    isTest: _isTest,
    isProd: _isProd,
    public: _public,
    autoClose: true,
  });

  if (listhenOptions.isTest) {
    listhenOptions.showURL = false;
  }

  if (listhenOptions.isProd || listhenOptions.isTest) {
    listhenOptions.open = false;
    listhenOptions.clipboard = false;
  }

  const port = await getPort({
    port: Number(listhenOptions.port),
    verbose: !listhenOptions.isTest,
    host: listhenOptions.hostname,
    alternativePortRange: [3000, 3100],
    ...(typeof listhenOptions.port === "object" && listhenOptions.port),
  });

  let server: Server | HTTPServer;

  let addr: { proto: "http" | "https"; addr: string; port: number } | null;
  const getURL = (host?: string, baseURL?: string) => {
    const anyV4 = addr?.addr === "0.0.0.0";
    const anyV6 = addr?.addr === "[::]";
    return `${addr!.proto}://${
      host ||
      listhenOptions.hostname ||
      (anyV4 || anyV6 ? "localhost" : addr!.addr)
    }:${addr!.port}${baseURL || listhenOptions.baseURL}`;
  };

  // Local server
  let https: Listener["https"] = false;
  const httpsOptions = listhenOptions.https as HTTPSOptions;

  if (httpsOptions) {
    https = await resolveCertificate(httpsOptions);
    server = createHTTPSServer(https, handle);
    addShutdown(server);
    // @ts-ignore
    await promisify(server.listen.bind(server))(port, listhenOptions.hostname);
    const _addr = server.address() as AddressInfo;
    addr = { proto: "https", addr: formatAddress(_addr), port: _addr.port };
  } else {
    server = createServer(handle);
    addShutdown(server);
    // @ts-ignore
    await promisify(server.listen.bind(server))(port, listhenOptions.hostname);
    const _addr = server.address() as AddressInfo;
    addr = { proto: "http", addr: formatAddress(_addr), port: _addr.port };
  }

  // Tunnel
  let tunnel: Tunnel | undefined;
  if (listhenOptions.tunnel) {
    const { startTunnel } = await import("untun");
    tunnel = await startTunnel({
      url: getURL("localhost"),
    });
  }

  let _closed = false;
  const close = async () => {
    if (_closed) {
      return;
    }
    _closed = true;
    await promisify((server as any).shutdown)().catch(() => {});
    await tunnel?.close().catch(() => {});
  };

  if (listhenOptions.clipboard) {
    const clipboardy = await import("clipboardy").then((r) => r.default || r);
    await clipboardy.write(getURL()).catch(() => {
      listhenOptions.clipboard = false;
    });
  }

  const getURLs = async (getURLOptions: GetURLOptions = {}) => {
    const urls: ListenURL[] = [];
    const baseURL = getURLOptions?.baseURL || listhenOptions.baseURL || "";

    // Add local URL
    urls.push({
      url: getURL("localhost", baseURL),
      type: "local",
    });

    // Add public URL
    const publicURL =
      getURLOptions.publicURL || getPublicURL(urls, listhenOptions);
    if (publicURL) {
      urls.push({
        url: publicURL,
        type: "network",
      });
    }

    // Add tunnel URL
    if (tunnel) {
      urls.push({
        url: await tunnel.getURL(),
        type: "tunnel",
      });
    }

    // Add network URLs
    const anyV4 = addr?.addr === "0.0.0.0";
    const anyV6 = addr?.addr === "[::]";
    if (anyV4 || anyV6) {
      for (const addr of getNetworkInterfaces(anyV4)) {
        urls.push({
          url: getURL(addr, baseURL),
          type: "network",
        });
      }
    }

    return urls;
  };

  const showURL = async (showURLOptions: ShowURLOptions = {}) => {
    const lines = [];

    const nameSuffix =
      showURLOptions.name || listhenOptions.name
        ? ` (${showURLOptions.name || listhenOptions.name})`
        : "";

    const urls = await getURLs(showURLOptions);

    const firstLocalUrl = urls.find((u) => u.type === "local");
    const firstPublicUrl = urls.find((u) => u.type !== "local");

    const showQR = (showURLOptions.qr ?? listhenOptions.qr) !== false;

    const typeMap: Record<ListenURL["type"], [string, ColorName]> = {
      local: ["Local", "green"],
      tunnel: ["Tunnel", "yellow"],
      network: ["Network", "gray"],
    };

    for (const url of urls) {
      const type = typeMap[url.type];
      const label = getColor(type[1])(
        `  ➜ ${(type[0] + ":").padEnd(8, " ")}${nameSuffix} `,
      );
      let suffix = "";
      if (url === firstLocalUrl && listhenOptions.clipboard) {
        suffix += colors.gray(" [copied to clipboard]");
      }
      if (url === firstPublicUrl && showQR) {
        suffix += colors.gray(" [QR code ⬇️ ]");
      }
      lines.push(`${label} ${formatURL(url.url)}${suffix}`);
    }

    if (!firstPublicUrl) {
      lines.push(
        colors.gray(`  > Network: use ${colors.white("--host")} to expose`),
      );
    }

    // Show QR code
    if (firstPublicUrl && showQR) {
      const space = " ".repeat(14);
      lines.push(" ");
      lines.push(
        ...renderQRCode(firstPublicUrl.url)
          .split("\n")
          .map((line) => space + line),
      );
    }

    // eslint-disable-next-line no-console
    console.log("\n" + lines.join("\n") + "\n");
  };

  if (listhenOptions.showURL) {
    showURL();
  }

  const _open = async () => {
    await open(getURL()).catch(() => {});
  };
  if (listhenOptions.open) {
    await _open();
  }

  if (listhenOptions.autoClose) {
    process.on("exit", () => close());
  }

  return <Listener>{
    url: getURL(),
    https,
    server,
    open: _open,
    showURL,
    getURLs,
    close,
  };
}
