import { listen } from "../../src";
import handler from "./app";

listen(handler, {
  open: process.argv.some(
    (argument) => argument === "-o" || argument === "--open",
  ),
  https: process.argv.includes("--https"),
});
