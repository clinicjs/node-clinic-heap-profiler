'use strict'

/*
  How to run this example:

  - Start a Redis server on the local machine.

    If you are using Docker, you can just do: sudo docker run -p 6379:6379 redis

    If you don't want to start a Redis server locally, provide a remote Redis server URL via REDIS_URL env variable,
    for information about the URL format, see: https://github.com/luin/ioredis#connect-to-redis

  - Run this script:

    node examples/redis-web-service/index.js
*/

const autocannon = require('autocannon')
const open = require('open')
const { join } = require('path')
const ClinicHeapProfiler = require('../../')

const heapProfiler = new ClinicHeapProfiler({ detectPort: true })

heapProfiler.collect(['node', join(__dirname, 'app.js')], function (err, filepath) {
  if (err) {
    throw err
  }

  heapProfiler.visualize(filepath, filepath + '.html', function (err) {
    if (err) {
      throw err
    }

    open(filepath + '.html')
      .then(() => {
        console.log('The memory flamechart graph has been opened in your browser.')
      })
      .catch(e => {
        console.log('Cannot open the memory flamechart graph file.', e)
      })
  })
})

// When the port is available, run autocannon
heapProfiler.on('port', port => {
  const url = `http://localhost:${port}`
  console.log(`Server has started, starting autocannon against ${url} ...`)

  const autocannonInstance = autocannon(
    {
      url,
      connections: 1,
      pipelining: 1,
      duration: 10,
      requests: Array.from(Array(1000), () => ({ method: Math.random() < 0.45 ? 'POST' : 'GET' }))
    },
    (err, results) => {
      if (err) {
        throw err
      }

      console.log('\nAutocannon has finished. Stopping the heap profiler.')
      heapProfiler.stopViaIPC()
    }
  )

  autocannon.track(autocannonInstance, { renderProgressBar: true, renderResultsTable: true })
})
