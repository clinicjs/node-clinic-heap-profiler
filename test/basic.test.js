'use strict'

const fs = require('fs')
const path = require('path')
const { test } = require('tap')
const ClinicHeapProfiler = require('../src/index.js')

test('cmd - test collect - data exists, html generated', t => {
  const tool = new ClinicHeapProfiler()

  function cleanup (err, filename) {
    let count = 0

    function callback (err) {
      t.ifError(err)

      if (++count === 2) {
        t.end()
      }
    }

    t.ifError(err)

    t.match(filename, /[0-9]+\.clinic-heapprofile$/)

    fs.unlink(filename, callback)
    fs.unlink(filename + '.html', callback)
  }

  tool.collect([process.execPath, path.join('test', 'fixtures', 'randomHashes.js')], (err, filename) => {
    if (err) {
      cleanup(err, filename)
      return
    }

    let fileSizeDebug = 0
    const htmlName = filename + '.html'
    tool.debug = true

    // Test that calling stopViaIPC is safe when no IPC is present
    tool.stopViaIPC()

    tool.visualize(filename, htmlName, err => {
      if (err) {
        cleanup(err, filename)
        return
      }

      fileSizeDebug = fs.statSync(htmlName).size

      fs.readFile(htmlName, (err, content) => {
        if (err) {
          cleanup(err, filename)
          return
        }

        t.ok(content.length > 5000)

        /*
          Redo the html without debug setting
          Check that disabling debug mode results in a smaller file
        */
        fs.unlinkSync(htmlName)
        tool.debug = false

        tool.visualize(filename, htmlName, () => {
          //
          t.ok(fs.statSync(htmlName).size < fileSizeDebug)
          cleanup(null, filename)
        })
      })
    })
  })
})

test('cmd - test visualization - missing data', t => {
  const tool = new ClinicHeapProfiler({ debug: true })

  tool.visualize('missing.clinic-flame', 'missing.clinic-flame.html', err => {
    t.match(err.message, /ENOENT: no such file or directory/)
    t.end()
  })
})
