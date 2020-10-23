'use strict'

/* 
  How to run this example:

  - Start a Redis server on the local machine. 
  
    If you don't want to start a Redis server locally, provide a remote Redis server URL via REDIS_URL env variable,
    for information about the URL format, see: https://github.com/luin/ioredis#connect-to-redis

  - Install fastify, ioredis and autocannon:

    npm i --no-save fastify ioredis autocannon

  - Run this script:

    node examples/redis-web-service/index.js

*/

const { spawnSync } = require('child_process')
const { join } = require('path')
const ClinicHeapProfiler = require(join(__dirname, '../../src/index'))

const heapProfiler = new ClinicHeapProfiler({ detectPort: true })

heapProfiler.collect([join(__dirname, 'app.js')], function (err, filepath) {
  if (err) {
    throw err
  }

  heapProfiler.visualize(filepath, filepath + '.html', function (err) {
    if (err) {
      throw err
    }

    spawnSync('open', [filepath + '.html'])
  })
})
