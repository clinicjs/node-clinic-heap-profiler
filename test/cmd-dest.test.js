'use strict'

const fs = require('fs')
const path = require('path')
const { test } = require('tap')
const ClinicHeapProfiler = require('../src/index.js')

test('cmd - test collect - custom output destination', t => {
  const tool = new ClinicHeapProfiler({ debug: true, dest: 'test-output-destination' })

  function cleanup (err, filename) {
    let count = 0

    function callback (err) {
      t.error(err)

      if (++count === 2) {
        t.end()
      }
    }

    t.error(err)

    t.match(filename, /^test-output-destination$/)

    fs.unlink(filename, callback)
    fs.unlink(filename + '.html', callback)
  }

  tool.collect([process.execPath, path.join('test', 'fixtures', 'randomHashes.js')], (err, filename) => {
    if (err) {
      cleanup(err, filename)
      return
    }

    t.ok(fs.statSync(filename).isFile())

    tool.visualize(filename, `${filename}.html`, err => {
      if (err) {
        cleanup(err, filename)
        return
      }

      t.ok(fs.statSync(`${filename}.html`).isFile())

      cleanup(null, filename)
    })
  })
})
