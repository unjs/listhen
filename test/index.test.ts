import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, afterEach, test, expect } from "vitest";
import { listen, Listener } from "../src";
import { parseHTTPSArgs } from "../src/cli";

// eslint-disable-next-line no-console
// console.log = fn()

function handle(request: IncomingMessage, response: ServerResponse) {
  response.end(request.url);
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
  });

  describe("https", () => {
    test("should parse HTTPS CLI Options", () => {
      const options = {
        "https.cert": "cert.pem",
        "https.key": "key.pem",
        "https.pfx": "keystore.p12",
        "https.passphrase": "pw",
        "https.domains": "localhost, 127.0.0.1",
        "https.validityDays": 10,
      };
      expect(parseHTTPSArgs(options)).toEqual({
        cert: "cert.pem",
        key: "key.pem",
        pfx: "keystore.p12",
        passphrase: "pw",
        domains: ["localhost", "127.0.0.1"],
        validityDays: 10,
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
