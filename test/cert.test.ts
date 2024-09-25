import { describe, afterEach, test, expect } from "vitest";
import forge from "node-forge";
import { resolve } from "pathe";
import { Listener } from "../src";
import { TLSCertOptions, _private } from "../src/_cert";

// console.log = fn()

function assertDefaultAttributes(attrs: forge.pki.CertificateField[]) {
  const commonName = attrs.find((attr) => attr.name === "commonName");
  const countryCode = attrs.find((attr) => attr.name === "countryName");
  const stateOrProvinceName = attrs.find(
    (attr) => attr.name === "stateOrProvinceName",
  );
  const localityName = attrs.find((attr) => attr.name === "localityName");
  const organizationName = attrs.find(
    (attr) => attr.name === "organizationName",
  );

  expect(commonName!.value).toEqual("localhost");
  expect(countryCode!.value).toEqual("US");
  expect(stateOrProvinceName!.value).toEqual("Michigan");
  expect(localityName!.value).toEqual("Berkley");
  expect(organizationName!.value).toEqual("Testing Corp");
}

function assertNewlyGeneratedKeyPair(
  keyPair: forge.pki.KeyPair,
  cert: forge.pki.Certificate,
) {
  expect(keyPair).toBeTruthy();
  expect(cert).toBeTruthy();
  const publicKeyPem = forge.pki.publicKeyToPem(cert.publicKey);
  const publicKeyPem2 = forge.pki.publicKeyToPem(keyPair.publicKey);
  expect(publicKeyPem).toEqual(publicKeyPem2);
  expect(publicKeyPem).toContain("-----BEGIN PUBLIC KEY-----");
  expect(publicKeyPem).toContain("-----END PUBLIC KEY-----");
  const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
  expect(privateKeyPem).toContain("-----BEGIN RSA PRIVATE KEY-----");
  expect(privateKeyPem).toContain("-----END RSA PRIVATE KEY-----");
}

async function generateCerts(certOptions: TLSCertOptions) {
  const ca = await _private.generateCACert(certOptions);
  const { attributes, extensions } = _private.createCertificateInfo({
    commonName: "localhost",
    domains: ["localhost", "127.0.0.1"],
  });

  const keyPair = await _private.generateKeyPair(1024);
  const cert = _private.createCertificateFromKeyPair(keyPair, {
    validityDays: 20,
    subject: attributes,
    issuer: attributes,
    extensions,
  });
  return {
    ca,
    cert,
  };
}

describe("Certification Tests", () => {
  let listener: Listener | undefined;
  const certOptions = {
    bits: 1024,
    state: "Michigan",
    organization: "Testing Corp",
    validityDays: 20,
    locality: "Berkley",
    commonName: "localhost",
    countryCode: "US",
    domains: ["localhost", "127.0.0.1", "::1"],
  };

  afterEach(async () => {
    if (listener) {
      await listener.close();
      listener = undefined;
    }
  });

  describe("CA", () => {
    test("Generate certificate and private key (with attributes)", async () => {
      const { cert, key, passphrase } =
        await _private.generateCACert(certOptions);
      const certificate = forge.pki.certificateFromPem(cert);
      const attrs = certificate.subject.attributes;
      assertDefaultAttributes(attrs);

      expect(passphrase).toBeFalsy();
      expect(cert).toContain("-----BEGIN CERTIFICATE-----");
      expect(cert).toContain("-----END CERTIFICATE-----");
      expect(key).toContain("-----BEGIN RSA PRIVATE KEY-----");
      expect(key).toContain("-----END RSA PRIVATE KEY-----");
    });

    test("Generate certificate and private key (without options)", async () => {
      const { cert, key, passphrase } = await _private.generateCACert();
      expect(passphrase).toBeFalsy();
      expect(cert).toContain("-----BEGIN CERTIFICATE-----");
      expect(cert).toContain("-----END CERTIFICATE-----");
      expect(key).toContain("-----BEGIN RSA PRIVATE KEY-----");
      expect(key).toContain("-----END RSA PRIVATE KEY-----");

      const {
        cert: cert4,
        key: key4,
        passphrase: passphrase4,
      } = await _private.generateCACert({});
      expect(passphrase4).toBeFalsy();
      expect(cert4).toContain("-----BEGIN CERTIFICATE-----");
      expect(cert4).toContain("-----END CERTIFICATE-----");
      expect(key4).toContain("-----BEGIN RSA PRIVATE KEY-----");
      expect(key4).toContain("-----END RSA PRIVATE KEY-----");

      const {
        cert: cert2,
        key: key2,
        passphrase: passphrase2,
      } = await _private.generateCACert(undefined);
      expect(passphrase2).toBeFalsy();
      expect(cert2).toContain("-----BEGIN CERTIFICATE-----");
      expect(cert2).toContain("-----END CERTIFICATE-----");
      expect(key2).toContain("-----BEGIN RSA PRIVATE KEY-----");
      expect(key2).toContain("-----END RSA PRIVATE KEY-----");
    });

    test("Generate certificate and encrypted private key (with attributes)", async () => {
      const pw = "ca-pw";
      const { cert, key, passphrase } = await _private.generateCACert({
        ...certOptions,
        passphrase: pw,
      });
      expect(passphrase).toEqual(pw);
      expect(cert).toContain("-----BEGIN CERTIFICATE-----");
      expect(cert).toContain("-----END CERTIFICATE-----");
      expect(key).toContain("-----BEGIN ENCRYPTED PRIVATE KEY-----");
      expect(key).toContain("-----END ENCRYPTED PRIVATE KEY-----");

      const encryptedPrivateKeyInfo = forge.pki.encryptedPrivateKeyFromPem(key);
      const decryptedPrivateKeyInfo = forge.pki.decryptPrivateKeyInfo(
        encryptedPrivateKeyInfo,
        pw,
      );
      const decryptedPrivateKeyPem = forge.pki.privateKeyInfoToPem(
        decryptedPrivateKeyInfo,
      );
      expect(decryptedPrivateKeyPem).toContain("-----BEGIN PRIVATE KEY-----");
      expect(decryptedPrivateKeyPem).toContain("-----END PRIVATE KEY-----");

      const certificate = forge.pki.certificateFromPem(cert);
      const attrs = certificate.subject.attributes;
      assertDefaultAttributes(attrs);
    });

    test("Generate certificate and encrypted private key (without attributes)", async () => {
      const pw = "ca-pw";
      const { cert, key, passphrase } = await _private.generateCACert({
        passphrase: pw,
      });
      expect(passphrase).toEqual(pw);
      expect(cert).toContain("-----BEGIN CERTIFICATE-----");
      expect(cert).toContain("-----END CERTIFICATE-----");
      expect(key).toContain("-----BEGIN ENCRYPTED PRIVATE KEY-----");
      expect(key).toContain("-----END ENCRYPTED PRIVATE KEY-----");
    });
  });

  describe("Certificate generation", () => {
    describe("Generates certificate and private key", () => {
      test("with (encrypted key) and CA passphrase", async () => {
        const pw = "ca-pw";
        const keyPw = "key-pw";
        const ca = await _private.generateCACert({
          ...certOptions,
          passphrase: pw,
        });
        const cert = await _private.generateTLSCert({
          commonName: "localhost",
          domains: ["localhost", "127.0.0.1", "::1"],
          bits: 1024,
          validityDays: 20,
          signingKey: ca.key,
          signingKeyCert: ca.cert,
          signingKeyPassphrase: pw,
          passphrase: keyPw,
        });
        expect(cert).toBeTruthy();
        expect(cert.key).toContain("-----BEGIN ENCRYPTED PRIVATE KEY-----");
        expect(cert.key).toContain("-----END ENCRYPTED PRIVATE KEY-----");
        expect(cert.cert).toContain("-----BEGIN CERTIFICATE-----");
        expect(cert.cert).toContain("-----END CERTIFICATE-----");
      });

      test("without key passphrases", async () => {
        const ca = await _private.generateCACert({
          ...certOptions,
        });
        const cert = await _private.generateTLSCert({
          ...certOptions,
          signingKeyCert: ca.cert,
          signingKey: ca.key,
        });
        expect(cert).toBeTruthy();
        expect(cert.key).toContain("-----BEGIN RSA PRIVATE KEY-----");
        expect(cert.key).toContain("-----END RSA PRIVATE KEY-----");
        expect(cert.cert).toContain("-----BEGIN CERTIFICATE-----");
        expect(cert.cert).toContain("-----END CERTIFICATE-----");
        expect(ca.key).toContain("-----BEGIN RSA PRIVATE KEY-----");
        expect(ca.key).toContain("-----END RSA PRIVATE KEY-----");
        expect(ca.cert).toContain("-----BEGIN CERTIFICATE-----");
        expect(ca.cert).toContain("-----END CERTIFICATE-----");
      });

      test("with CA passphrase", async () => {
        const pw = "ca-pw";
        const ca = await _private.generateCACert({
          ...certOptions,
          passphrase: pw,
        });
        const cert = await _private.generateTLSCert({
          bits: 1024,
          validityDays: 20,
          commonName: "localhost",
          domains: ["localhost", "127.0.0.1", "::1"],
          signingKeyCert: ca.cert,
          signingKey: ca.key,
          signingKeyPassphrase: pw,
        });
        expect(cert).toBeTruthy();
        expect(cert.key).toContain("-----BEGIN RSA PRIVATE KEY-----");
        expect(cert.key).toContain("-----END RSA PRIVATE KEY-----");
        expect(cert.cert).toContain("-----BEGIN CERTIFICATE-----");
        expect(cert.cert).toContain("-----END CERTIFICATE-----");
      });

      describe("Autogenerate certificates", () => {
        test("with key passphrases", async () => {
          const certs = await _private.generateCertificates({
            ...certOptions,
            passphrase: "cert-pw",
            signingKeyPassphrase: "ca-pw",
          });
          expect(certs).toBeTruthy();
          expect(certs.cert.key).toContain(
            "-----BEGIN ENCRYPTED PRIVATE KEY-----",
          );
          expect(certs.cert.key).toContain(
            "-----END ENCRYPTED PRIVATE KEY-----",
          );
          expect(certs.cert.cert).toContain("-----BEGIN CERTIFICATE-----");
          expect(certs.cert.cert).toContain("-----END CERTIFICATE-----");
          expect(certs.ca.key).toContain(
            "-----BEGIN ENCRYPTED PRIVATE KEY-----",
          );
          expect(certs.ca.key).toContain("-----END ENCRYPTED PRIVATE KEY-----");
          expect(certs.ca.cert).toContain("-----BEGIN CERTIFICATE-----");
          expect(certs.ca.cert).toContain("-----END CERTIFICATE-----");
        });

        test("with private key passphrase", async () => {
          const certs = await _private.generateCertificates({
            ...certOptions,
            passphrase: "cert-pw",
          });
          expect(certs).toBeTruthy();
          expect(certs.cert.key).toContain(
            "-----BEGIN ENCRYPTED PRIVATE KEY-----",
          );
          expect(certs.cert.key).toContain(
            "-----END ENCRYPTED PRIVATE KEY-----",
          );
          expect(certs.cert.cert).toContain("-----BEGIN CERTIFICATE-----");
          expect(certs.cert.cert).toContain("-----END CERTIFICATE-----");
          expect(certs.ca.key).toContain("-----BEGIN RSA PRIVATE KEY-----");
          expect(certs.ca.key).toContain("-----END RSA PRIVATE KEY-----");
          expect(certs.ca.cert).toContain("-----BEGIN CERTIFICATE-----");
          expect(certs.ca.cert).toContain("-----END CERTIFICATE-----");
        });

        test("with ca key passphrase", async () => {
          const certs = await _private.generateCertificates({
            ...certOptions,
            signingKeyPassphrase: "ca-pw",
          });
          expect(certs).toBeTruthy();
          expect(certs.cert.key).toContain("-----BEGIN RSA PRIVATE KEY-----");
          expect(certs.cert.key).toContain("-----END RSA PRIVATE KEY-----");
          expect(certs.cert.cert).toContain("-----BEGIN CERTIFICATE-----");
          expect(certs.cert.cert).toContain("-----END CERTIFICATE-----");
          expect(certs.ca.key).toContain(
            "-----BEGIN ENCRYPTED PRIVATE KEY-----",
          );
          expect(certs.ca.key).toContain("-----END ENCRYPTED PRIVATE KEY-----");
          expect(certs.ca.cert).toContain("-----BEGIN CERTIFICATE-----");
          expect(certs.ca.cert).toContain("-----END CERTIFICATE-----");
        });
      });
      describe("Generates Keypair", () => {
        test("for CA", async () => {
          const { attributes, extensions } = _private.createCaInfo(certOptions);
          const keyPair = await _private.generateKeyPair(1024);
          const cert = _private.createCertificateFromKeyPair(keyPair, {
            validityDays: 20,
            subject: attributes,
            issuer: attributes,
            extensions,
          });
          assertNewlyGeneratedKeyPair(keyPair, cert);
        });
        test("for Certificate", async () => {
          const { attributes, extensions } =
            _private.createCertificateInfo(certOptions);
          const keyPair = await _private.generateKeyPair(1024);
          const cert = _private.createCertificateFromKeyPair(keyPair, {
            validityDays: 20,
            subject: attributes,
            issuer: attributes,
            extensions,
          });
          assertNewlyGeneratedKeyPair(keyPair, cert);
        });
      });
    });
  });

  describe("Certificate resolution", () => {
    describe("resolveCert", () => {
      test("Resolves to certificate and key", async () => {
        const c = await _private.resolveCert({
          key: resolve("test/.tmp/certs/key.pem"),
          cert: resolve("test/.tmp/certs/cert.pem"),
        });
        expect(c.key).toBeTruthy();
        expect(c.key).toContain("-----BEGIN RSA PRIVATE KEY-----");
        expect(c.key).toContain("-----END RSA PRIVATE KEY-----");
        expect(c.cert).toBeTruthy();
        expect(c.cert).toContain("-----BEGIN CERTIFICATE-----");
        expect(c.cert).toContain("-----END CERTIFICATE-----");
      });

      test("Resolves to certificate and encrypted key", async () => {
        const c = await _private.resolveCert({
          key: resolve("test/.tmp/certs/encrypted-key.pem"),
          cert: resolve("test/.tmp/certs/cert.pem"),
        });
        expect(c.key).toBeTruthy();
        expect(c.key).toContain("-----BEGIN ENCRYPTED PRIVATE KEY-----");
        expect(c.key).toContain("-----END ENCRYPTED PRIVATE KEY-----");
        expect(c.cert).toBeTruthy();
        expect(c.cert).toContain("-----BEGIN CERTIFICATE-----");
        expect(c.cert).toContain("-----END CERTIFICATE-----");
      });

      test("Throws error on empty args object", () => {
        // @ts-ignore
        expect(_private.resolveCert()).rejects.toThrowError(
          "Certificate or Private Key not present",
        );
        expect(_private.resolveCert({})).rejects.toThrowError(
          "Certificate or Private Key not present",
        );
      });

      test("Throws error if key or cert is missing", () => {
        expect(
          _private.resolveCert({
            key: "non-existing.pem",
          }),
        ).rejects.toThrowError("Certificate or Private Key not present");

        expect(
          _private.resolveCert({
            cert: "non-existing.pem",
          }),
        ).rejects.toThrowError("Certificate or Private Key not present");
      });

      test("Throws error if key or cert not existing", () => {
        expect(
          _private.resolveCert({
            key: "non-existing.pem",
            cert: "non-existing.pem",
          }),
        ).rejects.toThrowError("ENOENT: no such file or directory");

        expect(
          _private.resolveCert({
            key: resolve("test/.tmp/certs/key.pem"),
            cert: "non-existing.pem",
          }),
        ).rejects.toThrowError("ENOENT: no such file or directory");

        expect(
          _private.resolveCert({
            key: "non-existing.pem",
            cert: resolve("test/.tmp/certs/cert.pem"),
          }),
        ).rejects.toThrowError("ENOENT: no such file or directory");
      });
    });

    describe("resolvePfx", () => {
      test("Resolves certificate and key from store (without store passphrase)", async () => {
        const certs = await _private.resolveCert({
          cert: resolve("test/.tmp/certs/cert.pem"),
          key: resolve("test/.tmp/certs/key.pem"),
        });
        const pfx = await _private.resolvePfx({
          pfx: resolve("test/.tmp/certs/keystore2.p12"),
        });
        expect(pfx).toBeTruthy();
        expect(pfx.safeContents.length).toEqual(2);
        expect(pfx.safeContents[0].safeBags[0].cert).toBeTruthy();
        expect(pfx.safeContents[1].safeBags[0].key).toBeTruthy();
        expect(
          forge.pki.certificateToPem(pfx.safeContents[0].safeBags[0].cert!),
        ).toEqual(certs.cert);
        expect(
          forge.pki.privateKeyToPem(pfx.safeContents[1].safeBags[0].key!),
        ).toEqual(certs.key);
      });
      test("Resolves certificate and key from store (with store passphrase)", async () => {
        const certs = await _private.resolveCert({
          cert: resolve("test/.tmp/certs/cert.pem"),
          key: resolve("test/.tmp/certs/key.pem"),
        });
        const pfx = await _private.resolvePfx({
          pfx: resolve("test/.tmp/certs/keystore.p12"),
          passphrase: "store-pw",
        });
        expect(pfx).toBeTruthy();
        expect(pfx.safeContents.length).toEqual(2);
        expect(pfx.safeContents[0].safeBags[0].cert).toBeTruthy();
        expect(pfx.safeContents[1].safeBags[0].key).toBeTruthy();
        expect(
          forge.pki.certificateToPem(pfx.safeContents[0].safeBags[0].cert!),
        ).toEqual(certs.cert);
        expect(
          forge.pki.privateKeyToPem(pfx.safeContents[1].safeBags[0].key!),
        ).toEqual(certs.key);
      });

      test("Throws error on wrong store password", () => {
        expect(
          _private.resolvePfx({
            pfx: resolve("test/.tmp/certs/keystore.p12"),
            passphrase: "wrong-pw",
          }),
        ).rejects.toThrowError(
          "PKCS#12 MAC could not be verified. Invalid password?",
        );

        expect(
          _private.resolvePfx({
            pfx: resolve("test/.tmp/certs/keystore.p12"),
            passphrase: "",
          }),
        ).rejects.toThrowError(
          "PKCS#12 MAC could not be verified. Invalid password?",
        );
      });

      test("Throws error on non existing store", () => {
        expect(
          _private.resolvePfx({
            pfx: resolve("test/.tmp/certs/non-existing-keystore.p12"),
          }),
        ).rejects.toThrowError("ENOENT: no such file or directory");

        expect(
          _private.resolvePfx({
            pfx: resolve("test/.tmp/certs/non-existing-keystore.p12"),
            passphrase: "wrong-pw",
          }),
        ).rejects.toThrowError("ENOENT: no such file or directory");
      });

      test("Throws error on empty args object", () => {
        // @ts-ignore
        expect(_private.resolvePfx()).rejects.toThrowError(
          "Error resolving the pfx store",
        );
        expect(_private.resolvePfx({})).rejects.toThrowError(
          "Error resolving the pfx store",
        );
      });
    });
  });
  describe("Certificate signing", () => {
    test("Self-sign certificate", async () => {
      const certs = await generateCerts(certOptions);

      expect(() => certs.cert.verify(certs.cert)).toThrowError(
        "Could not compute certificate digest. Unknown signature OID.",
      );
      _private.signCertificate({}, certs.cert);
      expect(certs.cert.verify(certs.cert)).toBeTruthy();
    });

    test("Sign certificate with CA (no passphrases)", async () => {
      const ca = await _private.generateCACert(certOptions);
      const { attributes, extensions } =
        _private.createCertificateInfo(certOptions);
      const keyPair = await _private.generateKeyPair(1024);
      const cert = _private.createCertificateFromKeyPair(keyPair, {
        validityDays: 20,
        subject: attributes,
        issuer: attributes,
        extensions,
      });
      const caCert = forge.pki.certificateFromPem(ca.cert);
      expect(() => caCert.verify(cert)).toThrowError(
        /Could not compute certificate digest. Unknown signature OID./,
      );

      _private.signCertificate(
        {
          signingKey: ca.key,
        },
        cert,
      );

      expect(caCert.verify(caCert)).toBeTruthy();
      expect(caCert.verify(cert)).toBeTruthy();
    });

    test("Sign certificate with CA (with passphrase)", async () => {
      const ca = await _private.generateCACert({
        ...certOptions,
        passphrase: "ca-pw",
      });
      expect(ca.passphrase).toEqual("ca-pw");
      const { attributes, extensions } =
        _private.createCertificateInfo(certOptions);
      const keyPair = await _private.generateKeyPair(1024);
      const cert = _private.createCertificateFromKeyPair(keyPair, {
        validityDays: 20,
        subject: attributes,
        issuer: attributes,
        extensions,
      });

      const caCert = forge.pki.certificateFromPem(ca.cert);
      expect(() => caCert.verify(cert)).toThrowError(
        /Could not compute certificate digest. Unknown signature OID./,
      );

      _private.signCertificate(
        {
          signingKey: ca.key,
          signingKeyPassphrase: ca.passphrase,
        },
        cert,
      );

      expect(caCert.verify(caCert)).toBeTruthy();
      expect(caCert.verify(cert)).toBeTruthy();
    });
  });
});
