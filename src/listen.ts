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
import forge from "node-forge";
import { open } from "./lib/open";
import type {
  ListenOptions,
  Listener,
  ShowURLOptions,
  HTTPSOptions,
} from "./types";
import { formatAddress, formatURL, getNetworkInterfaces } from "./_utils";
import { resolvePfx, resolveCert, generateCertificates } from "./cert";

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
    if (
      typeof httpsOptions === "object" &&
      httpsOptions.key &&
      httpsOptions.cert
    ) {
      // Resolve actual certificate and cert
      https = await resolveCert(httpsOptions);
      if (httpsOptions.passphrase) {
        https.passphrase = httpsOptions.passphrase;
      }
    } else if (typeof httpsOptions === "object" && httpsOptions.pfx) {
      // Resolve certificate and key from PKCS#12 (PFX) store
      const pfx = await resolvePfx(httpsOptions);
      if (
        !pfx.safeContents ||
        pfx.safeContents.length < 2 ||
        pfx.safeContents[0].safeBags.length === 0 ||
        pfx.safeContents[1].safeBags.length === 0
      ) {
        throw new Error("keystore not containing a cert AND a key");
      }
      const _cert = pfx.safeContents[0].safeBags[0].cert;
      const _key = pfx.safeContents[1].safeBags[0].key;

      https = {
        key: forge.pki.privateKeyToPem(_key!),
        cert: forge.pki.certificateToPem(_cert!),
      };
    } else {
      const { cert } = await generateCertificates(httpsOptions);
      https = {
        key: cert.key,
        cert: cert.cert,
        passphrase: cert.passphrase,
      };
    }

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

  const showURL = (options?: ShowURLOptions) => {
    const add = options_.clipboard ? colors.gray("(copied to clipboard)") : "";
    const lines = [];
    const baseURL = options?.baseURL || options_.baseURL || "";
    const name = options?.name ? ` (${options.name})` : "";

    const anyV4 = addr?.addr === "0.0.0.0";
    const anyV6 = addr?.addr === "[::]";
    if (anyV4 || anyV6) {
      lines.push(
        `  > Local${name}:    ${formatURL(
          getURL("localhost", baseURL),
        )} ${add}`,
      );
      for (const addr of getNetworkInterfaces(anyV4)) {
        lines.push(`  > Network${name}:  ${formatURL(getURL(addr, baseURL))}`);
      }
    } else {
      lines.push(
        `  > Listening${name}:    ${formatURL(
          getURL(undefined, baseURL),
        )} ${add}`,
      );
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
    close,
  };
}
