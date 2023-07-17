import { listenAndWatch } from "../../src";

listenAndWatch("./app", {
  cwd: import.meta.url,
  open: process.argv.some(
    (argument) => argument === "-o" || argument === "--open",
  ),
  https: process.argv.includes("--https"),
});
