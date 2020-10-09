'use strict'

const { createConnection } = require('net')
const onNetListen = require('on-net-listen')

const listener = onNetListen(function (addr) {
  const client = createConnection({ port: parseInt(process.env.CLINIC_HEAP_PROFILER_PORT, 10) }, () => {
    client.write(addr.port.toString())
    client.end()
    listener.destroy()
  })
})
