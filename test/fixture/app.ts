import { listen } from "../../src";

listen((_request, response) => {
  response.end("works!");
}, {
  open: process.argv.some(argument => argument === "-o" || argument === "--open"),
  https: process.argv.includes("--https")
});
