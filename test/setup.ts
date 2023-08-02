import { existsSync } from "node:fs";
import { resolve } from "pathe";
import generateCert from "./generate-cert";

process.env.NO_COLOR = "1";

if (!existsSync(resolve("test", "fixture", "cert", "cert.pem"))) {
  // eslint-disable-next-line unicorn/prefer-top-level-await
  (async () => {
    await generateCert();
  })();
}
