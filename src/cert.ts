// Rewrite from https://github.com/Subash/mkcert 1.5.1 (MIT)

import { promisify } from "node:util";
import forge from "node-forge";
import ipRegex from "ip-regex";

export interface Certificate {
  key: string
  cert: string
}

// SSL Cert

export interface SSLCertOptions {
  commonName?: string
  domains: string[]
  validityDays: number
  caKey: string
  caCert: string
}

export async function generateSSLCert (options: SSLCertOptions): Promise<Certificate> {
  // Certificate Attributes (https://git.io/fptna)
  const attributes = [
    // Use the first address as common name if no common name is provided
    { name: "commonName", value: options.commonName || options.domains[0] }
  ];

  // Required certificate extensions for a tls certificate
  const extensions = [
    { name: "basicConstraints", cA: false, critical: true },
    { name: "keyUsage", digitalSignature: true, keyEncipherment: true, critical: true },
    { name: "extKeyUsage", serverAuth: true, clientAuth: true },
    {
      name: "subjectAltName",
      altNames: options.domains.map((domain) => {
        // Available Types: https://git.io/fptng
        const types = { domain: 2, ip: 7 };
        const isIp = ipRegex({ exact: true }).test(domain);
        if (isIp) { return { type: types.ip, ip: domain }; }
        return { type: types.domain, value: domain };
      })
    }
  ];

  const ca = forge.pki.certificateFromPem(options.caCert);

  return await generateCert({
    subject: attributes,
    issuer: ca.subject.attributes,
    extensions,
    validityDays: options.validityDays,
    signWith: options.caKey
  });
}

// CA

export interface CAOptions {
  commonName?: string
  organization?: string
  countryCode?: string
  state?: string
  locality?: string
  validityDays?: number
}

export async function generateCA (options: CAOptions = {}): Promise<Certificate> {
  // Certificate Attributes: https://git.io/fptna
  const attributes = [
    options.commonName && { name: "commonName", value: options.commonName },
    options.countryCode && { name: "countryName", value: options.countryCode },
    options.state && { name: "stateOrProvinceName", value: options.state },
    options.locality && { name: "localityName", value: options.locality },
    options.organization && { name: "organizationName", value: options.organization }
  ].filter(Boolean) as {name: string, value: string }[];

  // Required certificate extensions for a certificate authority
  const extensions = [
    { name: "basicConstraints", cA: true, critical: true },
    { name: "keyUsage", keyCertSign: true, critical: true }
  ];

  return await generateCert({
    subject: attributes,
    issuer: attributes,
    extensions,
    validityDays: options.validityDays || 365
  });
}

// Cert

interface CertOptions {
  subject: forge.pki.CertificateField[]
  issuer: forge.pki.CertificateField[]
  extensions: any[]
  validityDays: number
  signWith?: string
}

export async function generateCert (options: CertOptions): Promise<Certificate> {
  // Create serial from and integer between 50000 and 99999
  const serial = Math.floor((Math.random() * 95_000) + 50_000).toString();
  const generateKeyPair = promisify(forge.pki.rsa.generateKeyPair.bind(forge.pki.rsa));
  const keyPair = await generateKeyPair({ bits: 2048, workers: 4 });
  const cert = forge.pki.createCertificate();

  cert.publicKey = keyPair.publicKey;
  cert.serialNumber = Buffer.from(serial).toString("hex"); // serial number must be hex encoded
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setDate(cert.validity.notAfter.getDate() + options.validityDays);
  cert.setSubject(options.subject);
  cert.setIssuer(options.issuer);
  cert.setExtensions(options.extensions);

  // Sign the certificate with it's own private key if no separate signing key is provided
  const signWith = options.signWith ? forge.pki.privateKeyFromPem(options.signWith) : keyPair.privateKey;
  cert.sign(signWith, forge.md.sha256.create());

  return {
    key: forge.pki.privateKeyToPem(keyPair.privateKey),
    cert: forge.pki.certificateToPem(cert)
  };
}
