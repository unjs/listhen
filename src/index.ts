import './shim'
import http from 'http'
import https from 'https'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import { getPort, GetPortInput } from 'get-port-please'
import chalk from 'chalk'
import { generate as generalSSL, SelfsignedOptions } from 'selfsigned'
import defu from 'defu'
import open from 'open'
import clipboardy from 'clipboardy'
import { joinURL } from '@nuxt/ufo'

interface Certificate {
  key: string
  cert: string
}

interface CertificateInput {
  key: string
  cert: string
}

interface ListenOptions {
  name: string
  port?: GetPortInput,
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

export async function listen (handle: http.RequestListener, opts: Partial<ListenOptions> = {}) {
  opts = defu(opts, {
    name: 'server',
    port: process.env.PORT,
    showURL: true,
    baseURL: '/',
    open: false,
    clipboard: true,
    isTest: process.env.NODE_ENV === 'test',
    isProd: process.env.NODE_ENV === 'production',
    autoClose: true,
    autoCloseSignals: ['exit', 'SIGINT', 'SIGUSR1', 'SIGUSR2', 'SIGTERM']
  })

  if (opts.isTest) {
    opts.showURL = false
  }

  if (opts.isProd || opts.isTest) {
    opts.open = false
    opts.clipboard = false
  }

  const port = await getPort(opts.port || process.env.PORT)

  let server: http.Server | https.Server
  let url: string

  if (opts.https) {
    const { key, cert } = opts.certificate ? await resolveCert(opts.certificate) : await getSelfSignedCert(opts.selfsigned)
    server = https.createServer({ key, cert }, handle)
    // @ts-ignore
    await promisify(server.listen.bind(server))(port)
    url = `https://localhost:${port}${opts.baseURL}`
  } else {
    server = http.createServer(handle)
    // @ts-ignore
    await promisify(server.listen.bind(server))(port)
    url = `http://localhost:${port}${opts.baseURL}`
  }

  let _closed = false
  const close = () => {
    if (_closed) {
      return Promise.resolve()
    }
    _closed = true
    return promisify(server.close.bind(server))()
  }

  if (opts.clipboard) {
    await clipboardy.write(url).catch(() => { opts.clipboard = false })
  }

  if (opts.showURL) {
    const add = opts.clipboard ? chalk.gray('(copied to clipboard)') : ''
    // eslint-disable-next-line no-console
    console.log(`> ${opts.name} listening on ${chalk.cyan.underline(decodeURI(url))}`, add)
  }

  const getURL = (...path: string[]) => joinURL(url, ...path)

  if (opts.open) {
    await open(url).catch(() => {})
  }

  if (opts.autoClose) {
    for (const signal of opts.autoCloseSignals!) {
      process.on(signal, close)
    }
    if (opts.isTest && global.afterAll) {
      // istanbul ignore next
      global.afterAll(() => close())
    }
  }

  return {
    url,
    getURL,
    server,
    close
  }
}

async function resolveCert (input: CertificateInput): Promise<Certificate> {
  const key = await fs.readFile(input.key, 'utf-8')
  const cert = await fs.readFile(input.cert, 'utf-8')
  return { key, cert }
}

function getSelfSignedCert (opts: SelfsignedOptions = {}): Promise<Certificate> {
  // @ts-ignore
  return promisify(generalSSL)(opts.attrs, opts)
    .then((r: any) => ({ key: r.private, cert: r.cert }))
}
