import { RequestListener, Server, createServer } from 'http'
import { Server as HTTPServer, createServer as createHTTPSServer } from 'https'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import { networkInterfaces } from 'os'
import type { AddressInfo } from 'net'
import { cyan, gray, underline, bold } from 'colorette'
import { getPort, GetPortInput } from 'get-port-please'
import addShutdown from 'http-shutdown'
import { defu } from 'defu'
import { open } from './lib/open'

export interface Certificate {
  key: string
  cert: string
}

export interface HTTPSOptions {
  cert: string
  key: string
  domains?: string[]
  validityDays?: number
}

export interface ListenOptions {
  name: string
  port?: GetPortInput,
  hostname: string,
  showURL: boolean
  baseURL: string
  open: boolean
  https: false | HTTPSOptions
  clipboard: boolean
  isTest: Boolean
  isProd: Boolean
  autoClose: Boolean
  autoCloseSignals: string[]
}

export interface ShowURLOptions {
  baseURL: string
  name?: string
}

export interface Listener {
  url: string,
  address: { },
  server: Server | HTTPServer,
  https: boolean | Certificate,
  close: () => Promise<void>,
  open: () => Promise<void>,
  showURL: (options?: Pick<ListenOptions, 'baseURL'>) => void
}

export async function listen (handle: RequestListener, opts: Partial<ListenOptions> = {}): Promise<Listener> {
  opts = defu(opts, {
    port: process.env.PORT || 3000,
    hostname: process.env.HOST || '',
    showURL: true,
    baseURL: '/',
    open: false,
    clipboard: false,
    isTest: process.env.NODE_ENV === 'test',
    isProd: process.env.NODE_ENV === 'production',
    autoClose: true
  })

  if (opts.isTest) {
    opts.showURL = false
  }

  if (opts.isProd || opts.isTest) {
    opts.open = false
    opts.clipboard = false
  }

  const port = await getPort({
    port: Number(opts.port),
    verbose: !opts.isTest,
    host: opts.hostname
  })

  let server: Server | HTTPServer

  let addr: { proto: 'http' | 'https', addr: string, port: number } | null
  const getURL = (host?: string, baseURL?: string) => `${addr!.proto}://${host || opts.hostname || addr!.addr}:${addr!.port}${baseURL || opts.baseURL}`

  let https: Listener['https'] = false
  if (opts.https) {
    const { key, cert } = await resolveCert({ ...opts.https as any })
    https = { key, cert }
    server = createHTTPSServer({ key, cert }, handle)
    addShutdown(server)
    // @ts-ignore
    await promisify(server.listen.bind(server))(port, opts.hostname)
    const _addr = server.address() as AddressInfo
    addr = { proto: 'https', addr: formatAddress(_addr), port: _addr.port }
  } else {
    server = createServer(handle)
    addShutdown(server)
    // @ts-ignore
    await promisify(server.listen.bind(server))(port, opts.hostname)
    const _addr = server.address() as AddressInfo
    addr = { proto: 'http', addr: formatAddress(_addr), port: _addr.port }
  }

  let _closed = false
  const close = () => {
    if (_closed) {
      return Promise.resolve()
    }
    _closed = true
    return promisify((server as any).shutdown)()
  }

  if (opts.clipboard) {
    const clipboardy = await import('clipboardy').then(r => r.default || r)
    await clipboardy.write(getURL('localhost')).catch(() => { opts.clipboard = false })
  }

  const showURL = (options?: ShowURLOptions) => {
    const add = opts.clipboard ? gray('(copied to clipboard)') : ''
    const lines = []
    const baseURL = options?.baseURL || opts.baseURL || ''
    const name = options?.name ? ` (${options.name})` : ''

    const anyV4 = addr?.addr === '0.0.0.0'
    const anyV6 = addr?.addr === '[::]'
    if (anyV4 || anyV6) {
      lines.push(`  > Local${name}:    ${formatURL(getURL('localhost', baseURL))} ${add}`)
      for (const addr of getNetworkInterfaces(anyV4)) {
        lines.push(`  > Network${name}:  ${formatURL(getURL(addr, baseURL))}`)
      }
    } else {
      lines.push(`  > Listening${name}:    ${formatURL(getURL(undefined, baseURL))} ${add}`)
    }
    // eslint-disable-next-line no-console
    console.log('\n' + lines.join('\n') + '\n')
  }

  if (opts.showURL) {
    showURL()
  }

  const _open = async () => {
    await open(getURL('localhost')).catch(() => { })
  }
  if (opts.open) {
    await _open()
  }

  if (opts.autoClose) {
    process.on('exit', () => close())
  }

  return <Listener>{
    url: getURL(),
    https,
    server,
    open: _open,
    showURL,
    close
  }
}

async function resolveCert (opts: HTTPSOptions): Promise<Certificate> {
  // Use cert if provided
  if (opts.key && opts.cert) {
    const isInline = (s: string = '') => s.startsWith('--')
    const r = (s: string) => isInline(s) ? s : fs.readFile(s, 'utf-8')
    return {
      key: await r(opts.key),
      cert: await r(opts.cert)
    }
  }

  // Use auto generated cert
  const { generateCA, generateSSLCert } = await import('./cert')
  const ca = await generateCA()
  const cert = await generateSSLCert({
    caCert: ca.cert,
    caKey: ca.key,
    domains: opts.domains || ['localhost', '127.0.0.1', '::1'],
    validityDays: opts.validityDays || 1
  })
  return cert
}

function getNetworkInterfaces (v4Only: boolean = true): string[] {
  const addrs = new Set<string>()
  for (const details of Object.values(networkInterfaces())) {
    if (details) {
      for (const d of details) {
        if (
          !d.internal &&
          !(d.mac === '00:00:00:00:00:00') &&
          !(d.address.startsWith('fe80::')) &&
          !(v4Only && (d.family === 'IPv6' || +d.family === 6))
        ) {
          addrs.add(formatAddress(d))
        }
      }
    }
  }
  return Array.from(addrs).sort()
}

function formatAddress (addr: { family: string | number, address: string }) {
  return ((addr.family === 'IPv6' || addr.family === 6) ? `[${addr.address}]` : addr.address)
}

function formatURL (url: string) {
  return cyan(underline(decodeURI(url).replace(/:(\d+)\//g, `:${bold('$1')}/`)))
}
