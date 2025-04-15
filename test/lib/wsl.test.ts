import { describe, it, expect, vi, afterEach } from "vitest";
import { isWsl, getWslDrivesMountPoint } from "../../src/lib/wsl";
import * as fs from "node:fs";
import * as os from "node:os";
import { isDocker } from "../../src/lib/docker";

vi.mock("node:fs");
vi.mock("node:os", () => ({
  ...vi.importActual("node:os"),
  release: vi.fn(),
}));

describe("isWsl", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return false if platform is not linux", () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    expect(isWsl()).toBe(false);
  });

  it("should return true if running on WSL and not in Docker", () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("linux");
    vi.spyOn(os, "release").mockReturnValue("microsoft");

    expect(isWsl()).toBe(false);
  });
});

describe("getWslDrivesMountPoint", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return default mount point if /etc/wsl.conf does not exist", () => {
    vi.mocked(fs.accessSync).mockImplementation(() => {
      throw new Error("File not found");
    });

    expect(getWslDrivesMountPoint()).toBe("/mnt/");
  });

  it("should return default mount point if /etc/wsl.conf does not contain root configuration", () => {
    vi.mocked(fs.accessSync).mockImplementation(() => {});
    vi.mocked(fs.readFileSync).mockReturnValue("");

    expect(getWslDrivesMountPoint()).toBe("/mnt/");
  });

  it("should return custom mount point if /etc/wsl.conf contains root configuration", () => {
    vi.mocked(fs.accessSync).mockImplementation(() => {});
    vi.mocked(fs.readFileSync).mockReturnValue("root = /custom/");

    expect(getWslDrivesMountPoint()).toBe("/custom/");
  });

  it("should append a trailing slash to the custom mount point if missing", () => {
    vi.mocked(fs.accessSync).mockImplementation(() => {});
    vi.mocked(fs.readFileSync).mockReturnValue("root = /custom");

    expect(getWslDrivesMountPoint()).toBe("/custom/");
  });
});
