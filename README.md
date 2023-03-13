# 👂 listhen

An elegant HTTP listener.

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Codecov][codecov-src]][codecov-href]
[![License][license-src]][license-href]
[![JSDocs][jsdocs-src]][jsdocs-href]

## Features 

- Promisified interface for listening and closing server
- Work with express/connect or plain http handle function
- Support HTTP and HTTPS
- Assign a port or fallback to human friendly alternative (with [get-port-please](https://github.com/unjs/get-port-please))
- Generate listening URL and show on console
- Copy URL to clipboard (dev only by default)
- Open URL in browser (opt-in)
- Generate self-signed certificate
- Detect test and production environments
- Close on exit signal
- Gracefully shutdown server with [http-shutdown](https://github.com/thedillonb/http-shutdown)

## Install

Install using npm:

```bash
npm i listhen
```

Import into your Node.js project:

```js
// CommonJS
const { listen } = require('listhen')

// ESM
import { listen } from 'listhen'
```

## Usage

**Function signature:**

```ts
const { url, getURL, server, close } = await listen(handle, options?)
```

**Plain handle function:**

```ts
listen((_req, res) => {
  res.end('hi')
})
```

**With express/connect:**

```ts
const express = require('express')
const app = express()

app.use('/', ((_req, res) => {
  res.end('hi')
})

listen(app)
```

## Options

### `port`

- Default: `process.env.PORT` or 3000 or memorized random (see [get-port-please](https://github.com/unjs/get-port-please))

Port to listen.

### `hostname`

- Default: `process.env.HOST || '0.0.0.0'`

Default hostname to listen.

### `https`

- Type: Boolean | Object
- Default: `false`

Listen on https with SSL enabled.

#### Self Signed Certificate

By setting `https: true`, listhen will use an auto generated self-signed certificate.

You can set https to an object for custom options. Possible options:

- `domains`: (Array) Default is `['localhost', '127.0.0.1', '::1']`.
- `validityDays`: (Number) Default is `1`.

#### User Provided Certificate

Set `https: { cert, key }` where cert and key are path to the ssl certificates.

You can also provide inline cert and key instead of reading from filesystem. In this case, they should start with `--`.

### `showURL`

- Default: `true` (force disabled on test environment)

Show a CLI message for listening URL.

### `baseURL`

- Default: `/`

### `open`

- Default: `false` (force disabled on test and production environments)

Open URL in browser. Silently ignores errors.

### `clipboard`

- Default: `false` (force disabled on test and production environments)

Copy URL to clipboard. Silently ignores errors.

### `isTest`

- Default: `process.env.NODE_ENV === 'test'`

Detect if running in a test environment to disable some features.

### `autoClose`

- Default: `true`

Automatically close when an exit signal is received on process.

## License

MIT. Made with 💖

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/listhen?style=flat&colorA=18181B&colorB=F0DB4F
[npm-version-href]: https://npmjs.com/package/listhen
[npm-downloads-src]: https://img.shields.io/npm/dm/listhen?style=flat&colorA=18181B&colorB=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/listhen
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/listhen/main?style=flat&colorA=18181B&colorB=F0DB4F
[codecov-href]: https://codecov.io/gh/unjs/listhen
[license-src]: https://img.shields.io/github/license/unjs/listhen.svg?style=flat&colorA=18181B&colorB=F0DB4F
[license-href]: https://github.com/unjs/listhen/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsDocs.io-reference-18181B?style=flat&colorA=18181B&colorB=F0DB4F
[jsdocs-href]: https://www.jsdocs.io/package/listhen
