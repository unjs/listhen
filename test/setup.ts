import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "pathe";
import forge from "node-forge";
import { _private } from "../src/_cert";

export async function setup() {
  if (!existsSync(resolve("test/.tmp/certs/cert.pem"))) {
    // eslint-disable-next-line unicorn/prefer-top-level-await
    const start = Date.now();
    console.log("Generating certificates...");
    await generateCert();
    console.log("Certificates generated. Took", Date.now() - start, "ms.");
  }
}

export default async function generateCert() {
  const pw = "cert-pw";
  const certs = await _private.generateCertificates({
    passphrase: pw,
  });

  const decryptedKey = forge.pki.decryptRsaPrivateKey(certs.cert.key, pw);
  await mkdir(resolve("test/.tmp/certs"), { recursive: true });
  await writeFile(resolve("test/.tmp/certs/cert.pem"), certs.cert.cert);
  await writeFile(resolve("test/.tmp/certs/ca.pem"), certs.ca.cert);
  await writeFile(resolve("test/.tmp/certs/ca-key.pem"), certs.ca.key);
  await writeFile(
    resolve("test/.tmp/certs/cert.chain.pem"),
    [certs.cert.cert, certs.ca.cert].join("\n"),
  );
  await writeFile(resolve("test/.tmp/certs/encrypted-key.pem"), certs.cert.key);
  await writeFile(
    resolve("test/.tmp/certs/key.pem"),
    forge.pki.privateKeyToPem(decryptedKey),
  );
  const pfx = convertToPFX(certs.cert.cert, certs.cert.key, "store-pw");
  const pfx2 = convertToPFX(certs.cert.cert, certs.cert.key, "");
  await writeFile(resolve("test/.tmp/certs/keystore.p12"), pfx, "binary");
  await writeFile(resolve("test/.tmp/certs/keystore2.p12"), pfx2, "binary");
}

function convertToPFX(
  certPem: string,
  privateKeyPem: string,
  password: string,
) {
  const cert = forge.pki.certificateFromPem(certPem);
  const privateKey = forge.pki.encryptedPrivateKeyFromPem(privateKeyPem);
  const pk = forge.pki.decryptPrivateKeyInfo(privateKey, "cert-pw");
  const pk2 = forge.pki.privateKeyFromAsn1(pk);

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(pk2, [cert], password);
  return forge.asn1.toDer(p12Asn1).getBytes();
}
