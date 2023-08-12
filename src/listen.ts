import { createServer } from "node:http";
import type { Server as HTTPServer } from "node:https";
import { createServer as createHTTPSServer } from "node:https";
import { promisify } from "node:util";
import type { RequestListener, Server } from "node:http";
import type { AddressInfo } from "node:net";
import { getPort } from "get-port-please";
import addShutdown from "http-shutdown";
import { defu } from "defu";
import { colors } from "consola/utils";
import { renderUnicodeCompact as renderQRCode } from "uqr";
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

  let _closed = false;
  const close = () => {
    if (_closed) {
      return Promise.resolve();
    }
    _closed = true;
    return promisify((server as any).shutdown)();
  };

  if (listhenOptions.clipboard) {
    const clipboardy = await import("clipboardy").then((r) => r.default || r);
    await clipboardy.write(getURL()).catch(() => {
      listhenOptions.clipboard = false;
    });
  }

  const getURLs = (getURLOptions?: GetURLOptions) => {
    const urls: ListenURL[] = [];
    const baseURL = getURLOptions?.baseURL || listhenOptions.baseURL || "";

    const anyV4 = addr?.addr === "0.0.0.0";
    const anyV6 = addr?.addr === "[::]";

    if (anyV4 || anyV6) {
      urls.push({
        url: getURL("localhost", baseURL),
        type: anyV4 ? "ipv4" : "ipv6",
        public: false,
      });

      for (const addr of getNetworkInterfaces(anyV4)) {
        urls.push({
          url: getURL(addr, baseURL),
          type: addr.includes("[") ? "ipv6" : "ipv4",
          public: true,
        });
      }
    }

    return urls;
  };

  const showURL = (showURLOptions: ShowURLOptions = {}) => {
    const add = listhenOptions.clipboard
      ? colors.gray("(copied to clipboard)")
      : "";
    const lines = [];
    const name =
      showURLOptions.name || listhenOptions.name
        ? ` (${showURLOptions.name || listhenOptions.name})`
        : "";
    const baseURL = showURLOptions.baseURL || listhenOptions.baseURL || "";

    const urls = getURLs(showURLOptions);

    if (urls.length > 0) {
      for (const url of urls) {
        const label = url.public ? `Network${name}:  ` : `Local${name}:    `;
        lines.push(`  > ${label} ${formatURL(url.url)} ${add}`);
      }
    } else {
      lines.push(
        `  > Local${name}:   ${formatURL(getURL(undefined, baseURL))} ${add}`,
      );
    }

    if (!listhenOptions.public) {
      lines.push(
        colors.gray(`  > Network: use ${colors.white("--host")} to expose`),
      );
    }

    if ((showURLOptions.qr ?? listhenOptions.qr) !== false) {
      const publicURL =
        showURLOptions.publicURL ||
        listhenOptions.publicURL ||
        getPublicURL(urls);
      if (publicURL) {
        const space = " ".repeat(15);
        lines.push(" ");
        lines.push(
          ...renderQRCode(String(publicURL))
            .split("\n")
            .map((line) => space + line),
        );
        lines.push(space + formatURL(publicURL));
      }
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
