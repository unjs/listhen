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
import { formatAddress, formatURL, getNetworkInterfaces } from "./_utils";
import { resolveCertificate } from "./_cert";

export async function listen(
  handle: RequestListener,
  options_: Partial<ListenOptions> = {},
): Promise<Listener> {
  options_ = defu(options_, {
    port: process.env.PORT || 3000,
    hostname: process.env.HOST || "",
    showURL: true,
    baseURL: "/",
    open: false,
    clipboard: false,
    isTest: process.env.NODE_ENV === "test",
    isProd: process.env.NODE_ENV === "production",
    autoClose: true,
  });

  if (options_.isTest) {
    options_.showURL = false;
  }

  if (options_.isProd || options_.isTest) {
    options_.open = false;
    options_.clipboard = false;
  }

  const port = await getPort({
    port: Number(options_.port),
    verbose: !options_.isTest,
    host: options_.hostname,
    alternativePortRange: [3000, 3100],
    ...(typeof options_.port === "object" && options_.port),
  });

  let server: Server | HTTPServer;

  let addr: { proto: "http" | "https"; addr: string; port: number } | null;
  const getURL = (host?: string, baseURL?: string) => {
    const anyV4 = addr?.addr === "0.0.0.0";
    const anyV6 = addr?.addr === "[::]";

    return `${addr!.proto}://${
      host || options_.hostname || (anyV4 || anyV6 ? "localhost" : addr!.addr)
    }:${addr!.port}${baseURL || options_.baseURL}`;
  };

  let https: Listener["https"] = false;
  const httpsOptions = options_.https as HTTPSOptions;

  if (httpsOptions) {
    https = await resolveCertificate(httpsOptions);
    server = createHTTPSServer(https, handle);
    addShutdown(server);
    // @ts-ignore
    await promisify(server.listen.bind(server))(port, options_.hostname);
    const _addr = server.address() as AddressInfo;
    addr = { proto: "https", addr: formatAddress(_addr), port: _addr.port };
  } else {
    server = createServer(handle);
    addShutdown(server);
    // @ts-ignore
    await promisify(server.listen.bind(server))(port, options_.hostname);
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

  if (options_.clipboard) {
    const clipboardy = await import("clipboardy").then((r) => r.default || r);
    await clipboardy.write(getURL()).catch(() => {
      options_.clipboard = false;
    });
  }

  const getURLs = (options?: GetURLOptions) => {
    const urls: ListenURL[] = [];
    const baseURL = options?.baseURL || options_.baseURL || "";

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

  const showURL = (options?: ShowURLOptions) => {
    const add = options_.clipboard ? colors.gray("(copied to clipboard)") : "";
    const lines = [];
    const name = options?.name ? ` (${options.name})` : "";
    const baseURL = options?.baseURL || options_.baseURL || "";

    const urls = getURLs(options);

    if (urls.length > 0) {
      for (const url of urls) {
        const label = url.public ? `Network${name}:  ` : `Local${name}:    `;
        lines.push(`  > ${label} ${formatURL(url.url)} ${add}`);
      }
    } else {
      lines.push(
        `  > Listening${name}:    ${formatURL(
          getURL(undefined, baseURL),
        )} ${add}`,
      );
    }

    const firstPublicIPv4 = urls.find(
      (url) => url.public && url.type === "ipv4",
    );
    if (firstPublicIPv4 && options?.qrcode !== false) {
      const space = " ".repeat(15);
      lines.push(" ");
      lines.push(
        ...renderQRCode(firstPublicIPv4.url)
          .split("\n")
          .map((line) => space + line),
      );
      lines.push(space + formatURL(firstPublicIPv4.url));
    }

    // eslint-disable-next-line no-console
    console.log("\n" + lines.join("\n") + "\n");
  };

  if (options_.showURL) {
    showURL();
  }

  const _open = async () => {
    await open(getURL()).catch(() => {});
  };
  if (options_.open) {
    await _open();
  }

  if (options_.autoClose) {
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
