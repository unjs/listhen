/**
 * Forked from https://github.com/JacobLinCool/node-cloudflared
 *
 * Check main license for more information
 */
import path from "pathe";
import { tmpdir } from "node:os";

/**
 * The path to the cloudflared binary.
 */
export const bin = path.join(
  tmpdir(),
  process.platform === "win32" ? "cloudflared.exe" : "cloudflared",
);

export const CLOUDFLARED_VERSION = process.env.CLOUDFLARED_VERSION || "latest";

export const RELEASE_BASE =
  "https://github.com/cloudflare/cloudflared/releases/";

export const conn_regex = /connection[= ]([a-z0-9-]+)/i;
export const ip_regex = /ip=([0-9.]+)/;
export const location_regex = /location=([A-Z]+)/;
export const index_regex = /connIndex=(\d)/;
export const tunnelID_regex = /tunnelID=([0-9a-z-]+)/i;
export const connectorID_regex = /Connector ID: ([0-9a-z-]+)/i;
export const metrics_regex = /metrics server on ([0-9.:]+\/metrics)/;
export const config_regex = /config="(.+[^\\])"/;
export const disconnect_regex =
  /Unregistered tunnel connection connIndex=(\d)/i;
