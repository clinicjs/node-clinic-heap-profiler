'use strict'

const fs = require('fs')
const path = require('path')
const { test } = require('tap')
const ClinicHeapProfiler = require('../src/index.js')

test('test collect - emits "analysing" event', t => {
  const tool = new ClinicHeapProfiler()

  function cleanup (err, filename) {
    t.ifError(err)

    t.match(filename, /[0-9]+\.clinic-heapprofile$/)

    fs.unlink(filename, err => {
      t.ifError(err)
      t.end()
    })
  }

  let seenAnalysing = false
  tool.on('analysing', () => {
    seenAnalysing = true
  })

  tool.collect([process.execPath, path.join('test', 'fixtures', 'randomHashes.js')], (err, dirname) => {
    if (err) {
      cleanup(err, dirname)
      return
    }

    t.ok(seenAnalysing) // should've happened before this callback
    cleanup(null, dirname)
  })
})
