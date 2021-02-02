'use strict'

const http = require('http')

const server = http.createServer((req, res) => {
  server.close()
  res.end('from server')
})

server.listen(0)
