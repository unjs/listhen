import './shim'
import http from 'http'
import https from 'https'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import { networkInterfaces } from 'os'
import { cyan, gray, underline, bold } from 'colorette'
import type { SelfsignedOptions } from 'selfsigned'
import { getPort, GetPortInput } from 'get-port-please'
import addShutdown from 'http-shutdown'
import defu from 'defu'
import { open } from './lib/open'

export interface Certificate {
  key: string
  cert: string
}

export interface CertificateInput {
  key: string
  cert: string
}

export interface ListenOptions {
  name: string
  port?: GetPortInput,
  hostname?: string,
  https?: boolean
  selfsigned?: SelfsignedOptions
  showURL: boolean
  baseURL: string
  open: boolean
  certificate: Certificate
  clipboard: boolean
  isTest: Boolean
  isProd: Boolean
  autoClose: Boolean
  autoCloseSignals: string[]
}

export interface Listener {
  url: string,
  server: http.Server | https.Server,
  close: () => Promise<void>,
  open: () => Promise<void>,
  showURL: () => void
}

export async function listen (handle: http.RequestListener, opts: Partial<ListenOptions> = {}): Promise<Listener> {
  opts = defu(opts, {
    port: process.env.PORT || 3000,
    hostname: process.env.HOST || '0.0.0.0',
    showURL: true,
    baseURL: '/',
    open: false,
    clipboard: false,
    isTest: process.env.NODE_ENV === 'test',
    isProd: process.env.NODE_ENV === 'production',
    autoClose: true,
    selfsigned: {
      // https://github.com/jfromaniello/selfsigned/issues/33
      keySize: 2048
    }
  })

  if (opts.isTest) {
    opts.showURL = false
  }

  if (opts.isProd || opts.isTest) {
    opts.open = false
    opts.clipboard = false
  }

  const port = await getPort(opts.port)

  let server: http.Server | https.Server
  let url: string

  const isExternal = opts.hostname === '0.0.0.0'
  const displayHost = isExternal ? 'localhost' : opts.hostname

  if (opts.https) {
    const { key, cert } = opts.certificate ? await resolveCert(opts.certificate) : await getSelfSignedCert(opts.selfsigned)
    server = https.createServer({ key, cert }, handle)
    addShutdown(server)
    // @ts-ignore
    await promisify(server.listen.bind(server))(port, opts.hostname)
    url = `https://${displayHost}:${port}${opts.baseURL}`
  } else {
    server = http.createServer(handle)
    addShutdown(server)
    // @ts-ignore
    await promisify(server.listen.bind(server))(port, opts.hostname)
    url = `http://${displayHost}:${port}${opts.baseURL}`
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
    await clipboardy.write(url).catch(() => { opts.clipboard = false })
  }

  const showURL = () => {
    const add = opts.clipboard ? gray('(copied to clipboard)') : ''
    const lines = []
    lines.push(`  > Local:    ${formatURL(url)} ${add}`)
    if (isExternal) {
      for (const ip of getExternalIps()) {
        lines.push(`  > Network:  ${formatURL(url.replace('localhost', ip))}`)
      }
    }
    // eslint-disable-next-line no-console
    console.log('\n' + lines.join('\n') + '\n')
  }

  if (opts.showURL) {
    showURL()
  }

  const _open = async () => {
    await open(url).catch(() => { })
  }
  if (opts.open) {
    await _open()
  }

  if (opts.autoClose) {
    process.on('exit', () => close())
  }

  return <Listener>{
    url,
    server,
    open: _open,
    showURL,
    close
  }
}

async function resolveCert (input: CertificateInput): Promise<Certificate> {
  const key = await fs.readFile(input.key, 'utf-8')
  const cert = await fs.readFile(input.cert, 'utf-8')
  return { key, cert }
}

async function getSelfSignedCert (opts: SelfsignedOptions = {}): Promise<Certificate> {
  // @ts-ignore
  const { generate } = await import('selfsigned')
  // @ts-ignore
  const { private: key, cert } = await promisify(generate)(opts.attrs, opts)
  return { key, cert }
}

function getExternalIps (): string[] {
  const ips = new Set<string>()
  for (const details of Object.values(networkInterfaces())) {
    if (details) {
      for (const d of details) {
        if ((d.family === 'IPv4' || d.family === 4) && !d.internal) {
          ips.add(d.address)
        }
      }
    }
  }
  return Array.from(ips)
}

function formatURL (url: string) {
  return cyan(underline(decodeURI(url).replace(/:(\d+)\//g, `:${bold('$1')}/`)))
}
