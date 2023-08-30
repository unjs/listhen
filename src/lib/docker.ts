import { readFileSync, statSync } from "node:fs";

let isDockerCached: boolean;

export function isDocker() {
  if (isDockerCached === undefined) {
    isDockerCached = _hasDockerEnvironment() || _hasDockerCGroup();
  }
  return isDockerCached;
}

function _hasDockerEnvironment() {
  try {
    statSync("/.dockerenv");
    return true;
  } catch {
    return false;
  }
}

function _hasDockerCGroup() {
  try {
    return readFileSync("/proc/self/cgroup", "utf8").includes("docker");
  } catch {
    return false;
  }
}
