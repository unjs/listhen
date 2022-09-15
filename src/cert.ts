// Rewrite from https://github.com/Subash/mkcert 1.5.1 (MIT)

import { promisify } from 'node:util'
import forge from 'node-forge'
import ipRegex from 'ip-regex'

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

export async function generateSSLCert (opts: SSLCertOptions): Promise<Certificate> {
  // Certificate Attributes (https://git.io/fptna)
  const attributes = [
    // Use the first address as common name if no common name is provided
    { name: 'commonName', value: opts.commonName || opts.domains[0] }
  ]

  // Required certificate extensions for a tls certificate
  const extensions = [
    { name: 'basicConstraints', cA: false, critical: true },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true },
    { name: 'extKeyUsage', serverAuth: true, clientAuth: true },
    {
      name: 'subjectAltName',
      altNames: opts.domains.map((domain) => {
        // Available Types: https://git.io/fptng
        const types = { domain: 2, ip: 7 }
        const isIp = ipRegex({ exact: true }).test(domain)
        if (isIp) { return { type: types.ip, ip: domain } }
        return { type: types.domain, value: domain }
      })
    }
  ]

  const ca = forge.pki.certificateFromPem(opts.caCert)

  return await generateCert({
    subject: attributes,
    issuer: ca.subject.attributes,
    extensions,
    validityDays: opts.validityDays,
    signWith: opts.caKey
  })
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

export async function generateCA (opts: CAOptions = {}): Promise<Certificate> {
  // Certificate Attributes: https://git.io/fptna
  const attributes = [
    opts.commonName && { name: 'commonName', value: opts.commonName },
    opts.countryCode && { name: 'countryName', value: opts.countryCode },
    opts.state && { name: 'stateOrProvinceName', value: opts.state },
    opts.locality && { name: 'localityName', value: opts.locality },
    opts.organization && { name: 'organizationName', value: opts.organization }
  ].filter(Boolean) as {name: string, value: string }[]

  // Required certificate extensions for a certificate authority
  const extensions = [
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, critical: true }
  ]

  return await generateCert({
    subject: attributes,
    issuer: attributes,
    extensions,
    validityDays: opts.validityDays || 365
  })
}

// Cert

interface CertOptions {
  subject: forge.pki.CertificateField[]
  issuer: forge.pki.CertificateField[]
  extensions: any[]
  validityDays: number
  signWith?: string
}

export async function generateCert (opts: CertOptions): Promise<Certificate> {
  // Create serial from and integer between 50000 and 99999
  const serial = Math.floor((Math.random() * 95000) + 50000).toString()
  const generateKeyPair = promisify(forge.pki.rsa.generateKeyPair.bind(forge.pki.rsa))
  const keyPair = await generateKeyPair({ bits: 2048, workers: 4 })
  const cert = forge.pki.createCertificate()

  cert.publicKey = keyPair.publicKey
  cert.serialNumber = Buffer.from(serial).toString('hex') // serial number must be hex encoded
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setDate(cert.validity.notAfter.getDate() + opts.validityDays)
  cert.setSubject(opts.subject)
  cert.setIssuer(opts.issuer)
  cert.setExtensions(opts.extensions)

  // Sign the certificate with it's own private key if no separate signing key is provided
  const signWith = opts.signWith ? forge.pki.privateKeyFromPem(opts.signWith) : keyPair.privateKey
  cert.sign(signWith, forge.md.sha256.create())

  return {
    key: forge.pki.privateKeyToPem(keyPair.privateKey),
    cert: forge.pki.certificateToPem(cert)
  }
}
