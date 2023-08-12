import { spawn, ChildProcess } from "node:child_process";
import type { Connection } from "./types";
import {
  bin,
  conn_regex,
  ip_regex,
  location_regex,
  index_regex,
} from "./constants";

/**
 *  Create a tunnel.
 * @param options The options to pass to cloudflared.
 * @returns
 */
export function tunnel(options: Record<string, string | number | null> = {}): {
  /** The URL of the tunnel */
  url: Promise<string>;
  /** The connections of the tunnel */
  connections: Promise<Connection>[];
  /** Spwaned cloudflared process */
  child: ChildProcess;
  /** Stop the cloudflared process */
  stop: ChildProcess["kill"];
} {
  const args: string[] = ["tunnel"];
  for (const [key, value] of Object.entries(options)) {
    if (typeof value === "string") {
      args.push(`${key}`, value);
    } else if (typeof value === "number") {
      args.push(`${key}`, value.toString());
    } else if (value === null) {
      args.push(`${key}`);
    }
  }
  if (args.length === 1) {
    args.push("--url", "localhost:8080");
  }

  const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });

  if (process.env.VERBOSE) {
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  }

  const url_regex = /\|\s+(https?:\/\/[^\s]+)/;
  let url_resolver: (value: string | PromiseLike<string>) => void = () =>
    undefined;
  let url_rejector: (reason: unknown) => void = () => undefined;
  const url = new Promise<string>(
    (...pair) => ([url_resolver, url_rejector] = pair),
  );

  const connection_resolvers: ((
    value: Connection | PromiseLike<Connection>,
  ) => void)[] = [];
  const connection_rejectors: ((reason: unknown) => void)[] = [];
  const connections: Promise<Connection>[] = [];
  for (let i = 0; i < 1; i++) {
    connections.push(
      new Promise<Connection>(
        (...pair) =>
          ([connection_resolvers[i], connection_rejectors[i]] = pair),
      ),
    );
  }

  const parser = (data: Buffer) => {
    const str = data.toString();

    const url_match = str.match(url_regex);
    url_match && url_resolver(url_match[1]);

    const conn_match = str.match(conn_regex);
    const ip_match = str.match(ip_regex);
    const location_match = str.match(location_regex);
    const index_match = str.match(index_regex);
    if (conn_match && ip_match && location_match && index_match) {
      const [, id] = conn_match;
      const [, ip] = ip_match;
      const [, location] = location_match;
      const [, idx] = index_match;
      connection_resolvers[+idx]?.({ id, ip, location });
    }
  };
  child.stdout.on("data", parser).on("error", url_rejector);
  child.stderr.on("data", parser).on("error", url_rejector);

  const stop = () => child.kill("SIGINT");

  return { url, connections, child, stop };
}
