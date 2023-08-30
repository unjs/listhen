/**
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
 * Check main LICENSE for more information
 */
import childProcess, { SpawnOptions } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { getWslDrivesMountPoint, isWsl } from "./wsl";
import { isDocker } from "./docker";

export type OpenOptions = {
  wait?: boolean;
  background?: boolean;
  newInstance?: boolean;
  allowNonzeroExitCode?: boolean;
};

export async function open(target: string, options: OpenOptions = {}) {
  let command;
  const cliArguments = [];
  const childProcessOptions: SpawnOptions = {};

  if (process.platform === "darwin") {
    // --- MacOS ---
    command = "open";

    if (options.wait) {
      cliArguments.push("--wait-apps");
    }

    if (options.background) {
      cliArguments.push("--background");
    }

    if (options.newInstance) {
      cliArguments.push("--new");
    }
  } else if (process.platform === "win32" || (isWsl() && !isDocker())) {
    // --- Windows or WSL ---
    command = isWsl()
      ? `${getWslDrivesMountPoint()}c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`
      : `${process.env.SYSTEMROOT}\\System32\\WindowsPowerShell\\v1.0\\powershell`;

    cliArguments.push(
      "-NoProfile",
      "-NonInteractive",
      "–ExecutionPolicy",
      "Bypass",
      "-EncodedCommand",
    );

    if (!isWsl()) {
      childProcessOptions.windowsVerbatimArguments = true;
    }

    const encodedArguments = ["Start"];

    if (options.wait) {
      encodedArguments.push("-Wait");
    }

    encodedArguments.push(target);

    // Using Base64-encoded command, accepted by PowerShell, to allow special characters.
    target = Buffer.from(encodedArguments.join(" "), "utf16le").toString(
      "base64",
    );
  } else {
    // --- Linux ---
    command = "xdg-open";
    const useSystemXdgOpen =
      process.versions.electron || process.platform === "android";
    if (!useSystemXdgOpen) {
      command = join(os.tmpdir(), "xdg-open");
      if (!fs.existsSync(command)) {
        try {
          fs.writeFileSync(
            join(os.tmpdir(), "xdg-open"),
            await import("./xdg-open").then((r) => r.xdgOpenScript()),
            "utf8",
          );
          fs.chmodSync(command, 0o755 /* rwx r-x r-x */);
        } catch {
          command = "xdg-open";
        }
      }
    }

    if (!options.wait) {
      // `xdg-open` will block the process unless stdio is ignored and it's detached from the parent even if it's unref'd.
      childProcessOptions.stdio = "ignore";
      childProcessOptions.detached = true;
    }
  }

  cliArguments.push(target);

  const subprocess = childProcess.spawn(
    command,
    cliArguments,
    childProcessOptions,
  );

  if (options.wait) {
    return new Promise((resolve, reject) => {
      subprocess.once("error", reject);

      subprocess.once("close", (exitCode) => {
        if (options.allowNonzeroExitCode && exitCode! > 0) {
          reject(new Error(`Exited with code ${exitCode}`));
          return;
        }

        resolve(subprocess);
      });
    });
  }

  subprocess.unref();

  return subprocess;
}
