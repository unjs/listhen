import { listen } from '../src'

listen((_req, res) => {
  res.end('works!')
}, {
  open: true
})
