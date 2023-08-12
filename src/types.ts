import type { Server } from "node:http";
import type { Server as HTTPServer } from "node:https";
import type { GetPortInput } from "get-port-please";

export interface Certificate {
  key: string;
  cert: string;
  passphrase?: string;
}

export interface HTTPSOptions {
  cert?: string;
  key?: string;
  pfx?: string;
  passphrase?: string;
  validityDays?: number;
  domains?: string[];
}

export interface ListenOptions {
  name: string;
  port?: GetPortInput;
  hostname: string;
  showURL: boolean;
  baseURL: string;
  open: boolean;
  https: boolean | HTTPSOptions;
  clipboard: boolean;
  isTest: boolean;
  isProd: boolean;
  autoClose: boolean;
  autoCloseSignals: string[];
}

export interface ListenURL {
  url: string;
  type: "ipv4" | "ipv6" | "unknown";
  public: boolean;
}

export interface GetURLOptions {
  baseURL: string;
  name?: string;
}

export interface ShowURLOptions extends GetURLOptions {
  /**
   * Print QR Code for public IPv4 address
   *
   * @default true
   */
  qrcode?: boolean;
}

export interface Listener {
  url: string;
  address: any;
  server: Server | HTTPServer;
  https: false | Certificate;
  close: () => Promise<void>;
  open: () => Promise<void>;
  showURL: (options?: ShowURLOptions) => void;
  getURLs: (options?: GetURLOptions) => ListenURL[];
}
