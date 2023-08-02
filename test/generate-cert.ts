import { writeFileSync, mkdirSync } from "node:fs";
import forge from "node-forge";
import { resolve } from "pathe";
import { _private } from "../src/cert";

export default async function generateCert() {
  const pw = "cert-pw";
  const certs = await _private.generateCertificates({
    passphrase: pw,
  });

  const decryptedKey = forge.pki.decryptRsaPrivateKey(certs.cert.key, pw);
  mkdirSync(resolve("test", "fixture", "cert"));
  writeFileSync(
    resolve("test", "fixture", "cert", "cert.pem"),
    certs.cert.cert,
  );
  writeFileSync(
    resolve("test", "fixture", "cert", "encrypted-key.pem"),
    certs.cert.key,
  );
  writeFileSync(
    resolve("test", "fixture", "cert", "key.pem"),
    forge.pki.privateKeyToPem(decryptedKey),
  );
  const pfx = convertToPFX(certs.cert.cert, certs.cert.key, "store-pw");
  const pfx2 = convertToPFX(certs.cert.cert, certs.cert.key, "");
  writeFileSync(
    resolve("test", "fixture", "cert", "keystore.p12"),
    pfx,
    "binary",
  );
  writeFileSync(
    resolve("test", "fixture", "cert", "keystore2.p12"),
    pfx2,
    "binary",
  );
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
