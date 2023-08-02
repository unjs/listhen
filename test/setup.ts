import { existsSync } from "node:fs";
import { resolve } from "pathe";
import generateCert from "./generate-cert";

export async function setup() {
  process.env.NO_COLOR = "1";
  if (!existsSync(resolve("test", "cert", "cert.pem"))) {
    // eslint-disable-next-line unicorn/prefer-top-level-await
    await generateCert();
  }
}
