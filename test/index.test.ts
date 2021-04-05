// @ts-nocheck
import './setup'
import { resolve } from 'path'
import { listen } from '../src'

jest.mock('clipboardy')
const clipboardy = require('clipboardy')
clipboardy.write = jest.fn().mockImplementation(() => Promise.resolve())

jest.mock('open')
const open = require('open')
open.mockImplementation(() => Promise.resolve())

// eslint-disable-next-line no-console
console.log = jest.fn()

function handle (req, res) {
  res.end(req.url)
}

describe('listhen', () => {
  let listener

  afterEach(async () => {
    if (listener) {
      await listener.close()
      listener = null
    }
  })

  test('listen (no args)', async () => {
    listener = await listen(handle)
    expect(listener.url.startsWith('http://')).toBe(true)
  })

  test('listen (http)', async () => {
    listener = await listen(handle, {
      isTest: false,
      autoClose: false,
      clipboard: true,
      open: true,
      baseURL: '/foo/bar'
    })
    expect(listener.url.startsWith('http://')).toBe(true)
    expect(listener.url.endsWith('/foo/bar')).toBe(true)
    // eslint-disable-next-line no-console
    // expect(console.log).toHaveBeenCalledWith(expect.stringMatching('\n  > Local:    http://localhost:3000/foo/bar'))
  })

  test('listen (https - selfsigned)', async () => {
    listener = await listen(handle, { https: true })
    expect(listener.url.startsWith('https://')).toBe(true)
  })

  test('listen (https - custom)', async () => {
    listener = await listen(handle, {
      https: true,
      certificate: {
        key: resolve(__dirname, 'fixture/cert/key.pem'),
        cert: resolve(__dirname, 'fixture/cert/cert.pem')
      }
    })
    expect(listener.url.startsWith('https://')).toBe(true)
  })

  test('silent errors', async () => {
    clipboardy.write.mockImplementationOnce(() => Promise.reject(new Error('Error')))
    open.mockImplementationOnce(() => Promise.reject(new Error('Error')))
    listener = await listen(handle, { isTest: false, clipboard: true, open: true })
  })

  test('double close', async () => {
    listener = await listen(handle, { isTest: false, clipboard: true, open: true })
    await listener.close()
    await listener.close()
  })

  test('autoClose', async () => {
    /* not passing close */ await listen(handle)
    // @ts-ignore
    process.emit('exit')
  })
})
