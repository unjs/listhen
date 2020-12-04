import './shim'
import http from 'http'
import https from 'https'
import { promisify } from 'util'
import { getPort, GetPortInput } from 'get-port-please'
import chalk from 'chalk'
import { generate as generalSSL, SelfsignedOptions } from 'selfsigned'
import defu from 'defu'
import open from 'open'
import clipboardy from 'clipboardy'

interface ListenOptions {
  name: string
  port?: GetPortInput,
  https?: boolean
  selfsigned?: SelfsignedOptions
  showURL: boolean
  open: boolean
  clipboard: boolean
}

export async function listen (handle: http.RequestListener, opts: Partial<ListenOptions> = {}) {
  opts = defu(opts, {
    name: 'server',
    port: process.env.PORT,
    showURL: true,
    open: false,
    clipboard: true
  })

  const port = await getPort(opts.port || process.env.PORT)

  let server: http.Server | https.Server
  let url: string

  if (opts.https) {
    // @ts-ignore
    const { private: key, cert } = await promisify(generalSSL)(opts.selfsigned?.attrs, opts.selfsigned)
    server = https.createServer({ key, cert }, handle)
    // @ts-ignore
    await promisify(server.listen.bind(server))(port)
    url = `https://localhost:${port}`
  } else {
    server = http.createServer(handle)
    // @ts-ignore
    await promisify(server.listen.bind(server))(port)
    url = `http://localhost:${port}`
  }

  const close = () => promisify(server.close.bind(server))()

  if (opts.clipboard) {
    await clipboardy.write(url)
  }

  if (opts.showURL) {
    const add = opts.clipboard ? chalk.gray('(copied to clipboard)') : ''
    // eslint-disable-next-line no-console
    console.log(`> ${opts.name} listening on ${chalk.cyan.underline(decodeURI(url))}`, add)
  }

  if (opts.open) {
    await open(url)
  }

  return {
    url,
    server,
    close
  }
}
