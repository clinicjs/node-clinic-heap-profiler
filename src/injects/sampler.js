'use strict'

const { generateHeapSamplingProfile } = require('@nearform/heap-profiler')
const { AbortController } = require('abort-controller')

// Create an AbortController like object
const controller = new AbortController()
process.once('SIGINT', controller.abort.bind(controller))

const profilerOptions = { destination: process.env.HEAP_PROFILER_DESTINATION, signal: controller.signal }

generateHeapSamplingProfile(profilerOptions, function (err) {
  if (err) {
    console.error(err)
    process.exit(1)
  }

  process.exit(0)
})
