'use strict'

const fs = require('fs')
const { test } = require('tap')
const ClinicHeapProfiler = require('../src/index.js')

test('cmd - test collect - works with nonzero exit code', t => {
  const tool = new ClinicHeapProfiler()

  tool.collect([process.execPath, '-e', 'process.exit(1)'], (err, filename) => {
    t.equal(err.message, 'Child process exited with code 1.')
    t.notOk(filename)
    t.end()
  })
})

test('cmd - test collect - works with nonzero exit code when collectOnFailure=true', t => {
  const tool = new ClinicHeapProfiler({ collectOnFailure: true })

  function cleanup (err, filename) {
    t.error(err)

    t.match(filename, /[0-9]+\.clinic-heapprofiler$/)

    fs.unlink(filename, err => {
      t.error(err)
      t.end()
    })
  }

  tool.collect([process.execPath, '-e', 'process.exit(1)'], (err, filename) => {
    if (err) {
      cleanup(err, filename)
      return
    }

    try {
      fs.accessSync(filename)
      cleanup(null, filename)
    } catch (err) {
      cleanup(err, filename)
    }
  })
})
