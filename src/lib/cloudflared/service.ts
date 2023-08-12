/**
 * Forked from https://github.com/JacobLinCool/node-cloudflared
 *
 * Check main license for more information
 */
import os from "node:os";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { Connection } from "./types";
import {
  bin,
  config_regex,
  conn_regex,
  connectorID_regex,
  disconnect_regex,
  index_regex,
  ip_regex,
  location_regex,
  metrics_regex,
  tunnelID_regex,
} from "./constants";

/**
 * Cloudflared launchd identifier.
 * @platform macOS
 */
export const identifier = "com.cloudflare.cloudflared";

/**
 * Cloudflared service name.
 * @platform linux
 */
export const service_name = "cloudflared.service";

/**
 * Path of service related files.
 * @platform macOS
 */
export const MACOS_SERVICE_PATH = {
  PLIST: is_root()
    ? `/Library/LaunchDaemons/${identifier}.plist`
    : `${os.homedir()}/Library/LaunchAgents/${identifier}.plist`,
  OUT: is_root()
    ? `/Library/Logs/${identifier}.out.log`
    : `${os.homedir()}/Library/Logs/${identifier}.out.log`,
  ERR: is_root()
    ? `/Library/Logs/${identifier}.err.log`
    : `${os.homedir()}/Library/Logs/${identifier}.err.log`,
} as const;

/**
 * Path of service related files.
 * @platform linux
 */
export const LINUX_SERVICE_PATH = {
  SYSTEMD: `/etc/systemd/system/${service_name}`,
  SERVICE: "/etc/init.d/cloudflared",
  SERVICE_OUT: "/var/log/cloudflared.log",
  SERVICE_ERR: "/var/log/cloudflared.err",
} as const;

/**
 * Cloudflared Service API.
 */
export const service = {
  install,
  uninstall,
  exists,
  log,
  err,
  current,
  clean,
  journal,
};

/**
 * Throw when service is already installed.
 */
export class AlreadyInstalledError extends Error {
  constructor() {
    super("service is already installed");
  }
}

/**
 * Throw when service is not installed.
 */
export class NotInstalledError extends Error {
  constructor() {
    super("service is not installed");
  }
}

/**
 * Install Cloudflared service.
 * @param token Tunnel service token.
 * @platform macOS, linux
 */
export function install(token?: string): void {
  if (!["darwin", "linux"].includes(process.platform)) {
    throw new Error(`Not Implemented on platform ${process.platform}`);
  }

  if (exists()) {
    throw new AlreadyInstalledError();
  }

  const args = ["service", "install"];

  if (token) {
    args.push(token);
  }

  const result = spawnSync(bin, args);

  if (result.status !== 0) {
    throw new Error(`service install failed: ${result.stderr.toString()}`);
  }
}

/**
 * Uninstall Cloudflared service.
 * @platform macOS, linux
 */
export function uninstall(): void {
  if (!["darwin", "linux"].includes(process.platform)) {
    throw new Error(`Not Implemented on platform ${process.platform}`);
  }

  if (!exists()) {
    throw new NotInstalledError();
  }

  const result = spawnSync(bin, ["service", "uninstall"]);

  if (result.status !== 0) {
    throw new Error(`service uninstall failed: ${result.stderr.toString()}`);
  }

  if (process.platform === "darwin") {
    fs.rmSync(MACOS_SERVICE_PATH.OUT);
    fs.rmSync(MACOS_SERVICE_PATH.ERR);
  } else if (process.platform === "linux" && !is_systemd()) {
    fs.rmSync(LINUX_SERVICE_PATH.SERVICE_OUT);
    fs.rmSync(LINUX_SERVICE_PATH.SERVICE_ERR);
  }
}

/**
 * Get stdout log of cloudflared service. (Usually empty)
 * @returns stdout log of cloudflared service.
 * @platform macOS, linux (sysv)
 */
export function log(): string {
  if (!exists()) {
    throw new NotInstalledError();
  }

  if (process.platform === "darwin") {
    return fs.readFileSync(MACOS_SERVICE_PATH.OUT, "utf8");
  }

  if (process.platform === "linux" && !is_systemd()) {
    return fs.readFileSync(LINUX_SERVICE_PATH.SERVICE_OUT, "utf8");
  }

  throw new Error(`Not Implemented on platform ${process.platform}`);
}

/**
 * Get stderr log of cloudflared service. (cloudflared print all things here)
 * @returns stderr log of cloudflared service.
 * @platform macOS, linux (sysv)
 */
export function err(): string {
  if (!exists()) {
    throw new NotInstalledError();
  }

  if (process.platform === "darwin") {
    return fs.readFileSync(MACOS_SERVICE_PATH.ERR, "utf8");
  }

  if (process.platform === "linux" && !is_systemd()) {
    return fs.readFileSync(LINUX_SERVICE_PATH.SERVICE_ERR, "utf8");
  }

  throw new Error(`Not Implemented on platform ${process.platform}`);
}

/**
 * Get cloudflared service journal from journalctl.
 * @param n The number of entries to return.
 * @returns cloudflared service journal.
 * @platform linux (systemd)
 */
export function journal(n = 300): string {
  if (process.platform === "linux" && is_systemd()) {
    const args = ["-u", service_name, "-o", "cat", "-n", n.toString()];
    return spawnSync("journalctl", args).stdout.toString();
  }

  throw new Error(`Not Implemented on platform ${process.platform}`);
}

/**
 * Get informations of current running cloudflared service.
 * @returns informations of current running cloudflared service.
 * @platform macOS, linux
 */
export function current(): {
  /** Tunnel ID */
  tunnelID: string;
  /** Connector ID */
  connectorID: string;
  /** The connections of the tunnel */
  connections: Connection[];
  /** Metrics Server Location */
  metrics: string;
  /** Tunnel Configuration */
  config: {
    ingress?: { service: string; hostname?: string }[];
    [key: string]: unknown;
  };
} {
  if (!["darwin", "linux"].includes(process.platform)) {
    throw new Error(`Not Implemented on platform ${process.platform}`);
  }

  if (!exists()) {
    throw new NotInstalledError();
  }

  const log = is_systemd() ? journal() : err();

  let tunnelID = "";
  let connectorID = "";
  const connections: Connection[] = [];
  let metrics = "";
  let config: {
    ingress?: { service: string; hostname?: string }[];
    [key: string]: unknown;
  } = {};

  for (const line of log.split("\n")) {
    try {
      if (line.match(tunnelID_regex)) {
        tunnelID = line.match(tunnelID_regex)?.[1] ?? "";
      } else if (line.match(connectorID_regex)) {
        connectorID = line.match(connectorID_regex)?.[1] ?? "";
      } else if (
        line.match(conn_regex) &&
        line.match(location_regex) &&
        line.match(ip_regex) &&
        line.match(index_regex)
      ) {
        const [, id] = line.match(conn_regex) ?? [];
        const [, location] = line.match(location_regex) ?? [];
        const [, ip] = line.match(ip_regex) ?? [];
        const [, idx] = line.match(index_regex) ?? [];
        connections[parseInt(idx)] = { id, ip, location };
      } else if (line.match(disconnect_regex)) {
        const [, idx] = line.match(disconnect_regex) ?? [];
        if (parseInt(idx) in connections) {
          connections[parseInt(idx)] = { id: "", ip: "", location: "" };
        }
      } else if (line.match(metrics_regex)) {
        metrics = line.match(metrics_regex)?.[1] ?? "";
      } else if (line.match(config_regex)) {
        config = JSON.parse(
          line.match(config_regex)?.[1].replace(/\\/g, "") ?? "{}",
        );
      }
    } catch (err) {
      if (process.env.DEBUG) {
        console.error("log parsing failed", err);
      }
    }
  }

  return { tunnelID, connectorID, connections, metrics, config };
}

/**
 * Clean up service log files.
 * @platform macOS
 */
export function clean(): void {
  if (process.platform !== "darwin") {
    throw new Error(`Not Implemented on platform ${process.platform}`);
  }

  if (exists()) {
    throw new AlreadyInstalledError();
  }

  fs.rmSync(MACOS_SERVICE_PATH.OUT, { force: true });
  fs.rmSync(MACOS_SERVICE_PATH.ERR, { force: true });
}

/**
 * Check if cloudflared service is installed.
 * @returns true if service is installed, false otherwise.
 * @platform macOS, linux
 */
export function exists(): boolean {
  if (process.platform === "darwin") {
    return fs.existsSync(MACOS_SERVICE_PATH.PLIST);
  } else if (process.platform === "linux") {
    return is_systemd()
      ? fs.existsSync(LINUX_SERVICE_PATH.SYSTEMD)
      : fs.existsSync(LINUX_SERVICE_PATH.SERVICE);
  }

  throw new Error(`Not Implemented on platform ${process.platform}`);
}

function is_root(): boolean {
  return process.getuid?.() === 0;
}

function is_systemd(): boolean {
  return process.platform === "linux" && fs.existsSync("/run/systemd/system");
}
