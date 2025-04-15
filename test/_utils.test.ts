import { describe, it, expect, vi } from "vitest";
import { networkInterfaces } from "node:os";
import { consola } from "consola";
import {
  getNetworkInterfaces,
  formatAddress,
  formatURL,
  isLocalhost,
  isAnyhost,
  generateURL,
  getDefaultHost,
  getPublicURL,
  validateHostname,
} from "../src/_utils";

vi.mock("node:os", () => ({
  networkInterfaces: vi.fn(),
}));

vi.mock("consola", () => ({
  consola: {
    warn: vi.fn(),
  },
}));

vi.mock("./lib/docker", () => ({
  isDocker: vi.fn(() => false),
}));

vi.mock("./lib/wsl", () => ({
  isWsl: vi.fn(() => false),
}));

vi.mock("std-env", () => ({
  provider: "docker",
}));

describe("getNetworkInterfaces", () => {
  it("should return formatted network interfaces excluding internal and invalid addresses", () => {
    vi.mocked(networkInterfaces).mockReturnValue({
      eth0: [
        {
          address: "192.168.1.1",
          family: "IPv4",
          internal: false,
          mac: "00:11:22:33:44:55",
        },
        {
          address: "fe80::1",
          family: "IPv6",
          internal: false,
          mac: "00:11:22:33:44:55",
        },
        {
          address: "127.0.0.1",
          family: "IPv4",
          internal: true,
          mac: "00:11:22:33:44:55",
        },
      ] as any,
    });

    const result = getNetworkInterfaces();
    expect(result).toEqual(["192.168.1.1"]);
  });

  it("should include IPv6 addresses when includeIPV6 is true", () => {
    vi.mocked(networkInterfaces).mockReturnValue({
      eth0: [
        {
          address: "192.168.1.1",
          family: "IPv4",
          internal: false,
          mac: "00:11:22:33:44:55",
        },
        {
          address: "fe80::1",
          family: "IPv6",
          internal: false,
          mac: "00:11:22:33:44:55",
        },
      ] as any,
    });

    const result = getNetworkInterfaces(true);
    expect(result).toEqual(["192.168.1.1"]);
  });
});

describe("formatAddress", () => {
  it("should format IPv4 addresses correctly", () => {
    expect(formatAddress({ family: "IPv4", address: "192.168.1.1" })).toBe(
      "192.168.1.1",
    );
  });

  it("should format IPv6 addresses correctly", () => {
    expect(formatAddress({ family: "IPv6", address: "fe80::1" })).toBe(
      "[fe80::1]",
    );
  });
});

describe("formatURL", () => {
  it("should format and colorize URLs", () => {
    const result = formatURL("http://localhost:3000/");
    expect(result).toContain("http://localhost:");
  });
});

describe("isLocalhost", () => {
  it("should return true for localhost addresses", () => {
    expect(isLocalhost("127.0.0.1")).toBe(true);
    expect(isLocalhost("localhost")).toBe(true);
  });

  it("should return false for non-localhost addresses", () => {
    expect(isLocalhost("192.168.1.1")).toBe(false);
  });
});

describe("isAnyhost", () => {
  it("should return true for any-host addresses", () => {
    expect(isAnyhost("0.0.0.0")).toBe(true);
    expect(isAnyhost("::")).toBe(true);
  });

  it("should return false for specific addresses", () => {
    expect(isAnyhost("192.168.1.1")).toBe(false);
  });
});

describe("generateURL", () => {
  it("should generate a URL based on hostname and options", () => {
    const result = generateURL(
      "localhost",
      { https: false, port: 3000 } as any,
      "/base",
    );
    expect(result).toBe("http://localhost:3000/base");
  });

  it("should omit the port for default HTTP/HTTPS ports", () => {
    const result = generateURL("localhost", { https: true, port: 443 } as any);
    expect(result).toBe("https://localhost:");
  });
});

describe("getDefaultHost", () => {
  it("should return localhost by default", () => {
    expect(getDefaultHost()).toBe("localhost");
  });

  it("should return an empty string when preferPublic is true", () => {
    expect(getDefaultHost(true)).toBe("");
  });
});

describe("getPublicURL", () => {
  it("should return the publicURL if provided", () => {
    const result = getPublicURL({ publicURL: "https://example.com" } as any);
    expect(result).toBe("https://example.com");
  });

  it("should generate a URL for non-localhost hostname", () => {
    const result = getPublicURL({
      hostname: "192.168.1.1",
      https: true,
      port: 3000,
    } as any);
    expect(result).toBe("https://192.168.1.1:3000");
  });

  it("should return expected when provider is stackblitz", () => {
    vi.mock("std-env", () => ({
      provider: "stackblitz",
    }));
    process.env.PWD = "/home/stackblitz/project";
    const result = getPublicURL({ _entry: "test" } as any);
    expect(result).toBe(
      "https://stackblitz.com/edit/~/github.com/stackblitz/project",
    );
    delete process.env.PWD;
  });
});

describe("validateHostname", () => {
  it("should return the hostname if valid", () => {
    expect(validateHostname("example.com", false)).toBe("example.com");
  });

  it("should return a fallback hostname if invalid", () => {
    const result = validateHostname("-invalid-hostname-", false);
    expect(result).toBe("localhost");
    expect(consola.warn).toHaveBeenCalledWith(
      "[listhen] Invalid hostname `-invalid-hostname-`. Using `localhost` as fallback.",
    );
  });
});
