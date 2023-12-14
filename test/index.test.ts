import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { request } from "node:http";
import { request as httpsRequest } from "node:https";
import { connect } from "node:http2";
import { describe, afterEach, test, expect } from "vitest";
import { listen, Listener } from "../src";

// eslint-disable-next-line no-console
// console.log = fn()

function handle(request: IncomingMessage, response: ServerResponse) {
  response.end(
    JSON.stringify({
      path: request.url,
      httpVersion: request.httpVersion,
    }),
  );
}

// disable TLS certificate checks
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function sendRequest(url: string, https = false) {
  return new Promise((resolve) => {
    (https ? httpsRequest : request)(url, (res) => {
      const data: any[] = [];
      res.on("data", (chunk) => {
        data.push(chunk);
      });
      res.on("end", () => {
        resolve(data.join(""));
      });
    }).end();
  });
}

function sendHttp2Request(url: string) {
  // eslint-disable-next-line promise/param-names
  return new Promise((resolve1, reject) => {
    const client = connect(url);

    client.on("error", (err: Error) => {
      reject(err);
      client.close();
    });

    const req = client.request({
      ":path": "/",
    });

    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      resolve1(data);
      client.close();
    });

    req.end();
  });
}

describe("listhen", () => {
  let listener: Listener | undefined;

  afterEach(async () => {
    if (listener) {
      await listener.close();
      listener = undefined;
    }
  });
  test("should listen to the next port in range (3000 -> 31000)", async () => {
    listener = await listen(handle, {
      port: { port: 3000 },
    });
    expect(listener.url).toMatch(/:3000\/$/);
    const listener2 = await listen(handle, {
      port: { port: 3000 },
    });
    expect(listener2.url).toMatch(/:3001\/$/);
    await listener2.close();
  });
  test("listen (no args)", async () => {
    listener = await listen(handle);
    expect(listener.url.startsWith("http://")).toBe(true);
  });

  test("listen (http)", async () => {
    listener = await listen(handle, {
      isTest: false,
      autoClose: false,
      baseURL: "/foo/bar",
    });
    expect(listener.url.startsWith("http://")).toBe(true);
    expect(listener.url.endsWith("/foo/bar")).toBe(true);
    // eslint-disable-next-line no-console
    // expect(console.log).toHaveBeenCalledWith(expect.stringMatching('\n  > Local:    http://localhost:3000/foo/bar'))
    const response = (await sendRequest(listener.url)) as string;
    expect(JSON.parse(response)).toEqual({
      path: "/foo/bar",
      httpVersion: "1.1",
    });
  });

  // see https://http2.github.io/faq/#does-http2-require-encryption
  test("listen (http2): http1 client", async () => {
    listener = await listen(handle);
    expect(listener.url.startsWith("http://")).toBeTruthy();

    const response = (await sendRequest(listener.url, false)) as string;
    expect(JSON.parse(response)).toEqual({
      path: "/",
      httpVersion: "1.1",
    });
  });
  test("listhen (http2): http2 client", async () => {
    listener = await listen(handle);
    expect(listener.url.startsWith("http://")).toBeTruthy();

    const response = (await sendRequest(listener.url, false)) as string;
    expect(JSON.parse(response)).toEqual({
      path: "/",
      httpVersion: "1.1",
    });
  });

  describe("https", () => {
    test("listen (http2)", async () => {
      listener = await listen(handle, {
        https: true,
        http2: true,
      });
      expect(listener.url.startsWith("https:")).toBeTruthy();

      let response = (await sendRequest(listener.url, true)) as string;
      expect(JSON.parse(response)).toEqual({
        path: "/",
        httpVersion: "1.1",
      });

      response = (await sendHttp2Request(listener.url)) as string;
      expect(JSON.parse(response)).toEqual({
        path: "/",
        httpVersion: "2.0",
      });
    });

    test("listen (https - selfsigned)", async () => {
      listener = await listen(handle, { https: true, hostname: "localhost" });
      expect(listener.url.startsWith("https://")).toBe(true);
    });

    test("listen (https - custom)", async () => {
      listener = await listen(handle, {
        https: {
          // eslint-disable-next-line unicorn/prefer-module
          key: resolve(__dirname, ".tmp/certs", "key.pem"),
          // eslint-disable-next-line unicorn/prefer-module
          cert: resolve(__dirname, ".tmp/certs", "cert.pem"),
        },
        hostname: "localhost",
      });
      expect(listener.url.startsWith("https://")).toBe(true);
    });

    test("listen (https - custom - with private key passphrase)", async () => {
      listener = await listen(handle, {
        https: {
          // eslint-disable-next-line unicorn/prefer-module
          key: resolve(__dirname, ".tmp/certs", "encrypted-key.pem"),
          // eslint-disable-next-line unicorn/prefer-module
          cert: resolve(__dirname, ".tmp/certs", "cert.pem"),
          passphrase: "cert-pw",
        },
        hostname: "localhost",
      });
      expect(listener.url.startsWith("https://")).toBe(true);
    });

    const nodeMajor = Number(process.version.slice(1).split(".")[0]);
    test.skipIf(nodeMajor < 18)(
      "listen (https - custom - with wrong private key passphrase)",
      () => {
        expect(() =>
          listen(handle, {
            https: {
              // eslint-disable-next-line unicorn/prefer-module
              key: resolve(__dirname, ".tmp/certs", "encrypted-key.pem"),
              // eslint-disable-next-line unicorn/prefer-module
              cert: resolve(__dirname, ".tmp/certs", "cert.pem"),
              passphrase: "wrong-pw",
            },
            hostname: "localhost",
          }),
        ).rejects.toThrowError("error:1C800064:Provider routines::bad decrypt");
      },
    );

    test("listen (https - PCKS#12/pfx/p12 - with store passphrase)", async () => {
      const listener = await listen(handle, {
        https: {
          // eslint-disable-next-line unicorn/prefer-module
          pfx: resolve(__dirname, ".tmp/certs/keystore.p12"),
          passphrase: "store-pw",
        },
        hostname: "localhost",
      });
      expect(listener.url.startsWith("https://")).toBe(true);
    });

    test("listen (https - PCKS#12/pfx/p12 - without store passphrase)", () => {
      expect(() =>
        listen(handle, {
          https: {
            // eslint-disable-next-line unicorn/prefer-module
            pfx: resolve(__dirname, ".tmp/certs/keystore.p12"),
          },
          hostname: "localhost",
        }),
      ).rejects.toThrowError(
        "PKCS#12 MAC could not be verified. Invalid password?",
      );
    });

    test("listen (https - PCKS#12/pfx/p12 - with wrong store passphrase)", () => {
      expect(() =>
        listen(handle, {
          https: {
            // eslint-disable-next-line unicorn/prefer-module
            pfx: resolve(__dirname, ".tmp/certs/keystore.p12"),
            passphrase: "wrong-pw",
          },
          hostname: "localhost",
        }),
      ).rejects.toThrowError(
        "PKCS#12 MAC could not be verified. Invalid password?",
      );
    });
  });

  describe("close", () => {
    test("double close", async () => {
      listener = await listen(handle, { isTest: false });
      await listener.close();
      await listener.close();
    });

    test("autoClose", async () => {
      /* not passing close */ await listen(handle);
      // @ts-ignore
      process.emit("exit");
    });
  });

  describe("port", () => {
    test("pass hostname to get-port-please", async () => {
      listener = await listen(handle, { hostname: "127.0.0.1" });
      expect(listener.url.startsWith("http://127.0.0.1")).toBe(true);
    });

    test("pass port to get-port-please", async () => {
      listener = await listen(handle, { port: 40_000 });
      expect(listener.url.endsWith(":40000/")).toBe(true);
    });

    test("pass extended options to get-port-please", async () => {
      listener = await listen(handle, {
        port: { port: 50_000, portRange: [50_000, 59_999] },
      });
      expect(listener.url).toMatch(/:5\d{4}\/$/);
    });
  });
});
