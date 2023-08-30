import { isDocker } from "./docker";
import { readFileSync, accessSync, constants as fsConstants } from "node:fs";
import os from "node:os";

let isWSLCached: boolean;

export function isWsl() {
  if (isWSLCached === undefined) {
    isWSLCached = _isWsl();
  }
  return isWSLCached;
}

function _isWsl() {
  if (process.platform !== "linux") {
    return false;
  }
  if (os.release().toLowerCase().includes("microsoft")) {
    if (isDocker()) {
      return false;
    }
    return true;
  }
  try {
    return readFileSync("/proc/version", "utf8")
      .toLowerCase()
      .includes("microsoft")
      ? !isDocker()
      : false;
  } catch {
    return false;
  }
}

// Get the mount point for fixed drives in WSL.
const defaultMountPoint = "/mnt/";
let _wslMountpoint: string;
export function getWslDrivesMountPoint() {
  // Default value for "root" param
  // according to https://docs.microsoft.com/en-us/windows/wsl/wsl-config
  return function getWslDrivesMountPoint() {
    if (_wslMountpoint) {
      // Return memoized mount point value
      return _wslMountpoint;
    }

    const configFilePath = "/etc/wsl.conf";

    let isConfigFileExists = false;
    try {
      accessSync(configFilePath, fsConstants.F_OK);
      isConfigFileExists = true;
    } catch {}

    if (!isConfigFileExists) {
      return defaultMountPoint;
    }

    const configContent = readFileSync(configFilePath, { encoding: "utf8" });
    const configMountPoint = /(?<!#.*)root\s*=\s*(?<mountPoint>.*)/g.exec(
      configContent,
    );

    if (!configMountPoint || !configMountPoint.groups) {
      return defaultMountPoint;
    }

    _wslMountpoint = configMountPoint.groups.mountPoint.trim();
    _wslMountpoint = _wslMountpoint.endsWith("/")
      ? _wslMountpoint
      : `${_wslMountpoint}/`;

    return _wslMountpoint;
  };
}
