import type { Server } from "node:http";
import type { Server as HTTPServer } from "node:https";
import type { GetPortInput } from "get-port-please";
import type { ConsolaInstance } from "consola";
import forge from "node-forge";

export interface Certificate {
  key: string;
  cert: string;
  passphrase?: string;
}

export interface CertificateOptions {
  validityDays: number;
  subject: forge.pki.CertificateField[];
  issuer: forge.pki.CertificateField[];
  extensions: any[];
}

export interface CommonCertificateOptions {
  commonName?: string;
  countryCode?: string;
  state?: string;
  locality?: string;
  organization?: string;
  organizationalUnit?: string;
  emailAddress?: string;
  domains?: string[];
}

export interface TLSCertOptions
  extends CommonCertificateOptions,
    SigningOptions {
  bits?: number;
  validityDays?: number;
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

export interface SigningOptions {
  signingKey?: string;
  signingKeyCert?: string;
  signingKeyPassphrase?: string;
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

export interface WatchOptions {
  cwd: string;
  entry: string;
  logger: ConsolaInstance;
  ignore: string[];
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
