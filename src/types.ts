import type { Server } from "node:http";
import type { Server as HTTPServer } from "node:https";
import type { GetPortInput } from "get-port-please";

export interface Certificate {
  key: string;
  cert: string;
}

export interface HTTPSOptions {
  cert: string;
  key: string;
  domains?: string[];
  validityDays?: number;
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

export interface ShowURLOptions {
  baseURL: string;
  name?: string;
}

export interface Listener {
  url: string;
  address: any;
  server: Server | HTTPServer;
  https: false | Certificate;
  close: () => Promise<void>;
  open: () => Promise<void>;
  showURL: (options?: Pick<ListenOptions, "baseURL">) => void;
}
