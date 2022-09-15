import { listen } from '../../src'

listen((_req, res) => {
  res.end('works!')
}, {
  open: process.argv.some(arg => arg === '-o' || arg === '--open'),
  https: process.argv.includes('--https')
})
