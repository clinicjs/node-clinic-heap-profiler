'use strict'

const { generateHeapSamplingProfile } = require('@nearform/heap-profiler')
const { AbortController } = require('abort-controller')
const { createConnection, createServer } = require('net')
const onNetListen = require('on-net-listen')

const controller = new AbortController()
const clinicPort = parseInt(process.env.CLINIC_HEAP_PROFILER_PORT, 10)
const profilerOptions = {
  destination: `${process.env.HEAP_PROFILER_PATH}/${process.env.HEAP_PROFILER_NAME || process.pid}.clinic-heapprofiler`,
  signal: controller.signal
}

let toSend = 2 // We need to send two ports: the IPC one and the application one
let server
let serverPort
let stopped = false

function stopSampling () {
  if (stopped) {
    return
  }

  stopped = true
  controller.abort()

  if (server) {
    server.close()
  }
}

function startIPC () {
  // Create a TCP server which will eventually receive termination notice from a calling process
  server = createServer(socket => {
    socket.on('data', data => {
      socket.end()

      // Make sure the request was not accidentally sent by someone else
      if (data.toString() !== 'clinic-heap-profiler:stop') {
        return
      }

      stopSampling()
    })
  })

  const listener = onNetListen(function ({ port }) {
    const client = createConnection({ port: clinicPort }, () => {
      if (port === serverPort) {
        // Send the IPC port as negative, for the other side to make the distinction
        client.end(`${-serverPort}`)
      } else {
        // Send the application port as positive
        client.end(`${port}`)
      }

      toSend--

      // No more ports to send, remove the on-net-listen handler
      if (toSend === 0) {
        listener.destroy()
      }
    })
  })

  // Grab an arbitrary unused port
  server.listen(0, () => {
    serverPort = server.address().port
  })
}

process.once('SIGINT', stopSampling)

//  If the process runs of out work before receiving a request to stop sampling, stop it manually
process.once('beforeExit', stopSampling)

// Start sampling the process
generateHeapSamplingProfile(profilerOptions, function (err) {
  if (err) {
    console.error(err)
    process.exit(1)
  }

  process.exit(0)
})

// Start the IPC server, if asked to
if (process.env.HEAP_PROFILER_USE_IPC === 'true') {
  startIPC()
}
