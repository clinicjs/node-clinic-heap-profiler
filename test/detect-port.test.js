'use strict'

const fs = require('fs')
const path = require('path')
const http = require('http')
const { test } = require('tap')
const ClinicHeapProfiler = require('../src/index.js')

test('cmd - collect - detect server port', t => {
  const tool = new ClinicHeapProfiler({ detectPort: true })

  function cleanup (err, filename) {
    let count = 0

    function callback (err) {
      t.error(err)

      if (++count === 2) {
        t.end()
      }
    }

    t.error(err)

    t.match(filename, /[0-9]+\.clinic-heapprofiler$/)

    fs.unlink(filename, callback)
    fs.unlink(filename + '.html', callback)
  }

  tool.collect([process.execPath, path.join('test', 'fixtures', 'webserver.js')], (err, filename) => {
    if (err) {
      cleanup(err, filename)
      return
    }

    tool.visualize(filename, filename + '.html', err => {
      if (err) {
        cleanup(err, filename)
        return
      }

      fs.readFile(filename + '.html', (err, content) => {
        if (err) {
          cleanup(err, filename)
          return
        }

        t.ok(content.length > 5000)
        cleanup(null, filename)
      })
    })
  })

  tool.on('port', port => {
    t.ok(typeof port === 'number')
    t.ok(port > 0)

    http.get(`http://127.0.0.1:${port}`, res => {
      const buf = []

      res.on('data', data => buf.push(data))
      res.on('end', () => {
        t.same(Buffer.concat(buf), Buffer.from('from server'))

        tool.stopViaIPC()
      })
    })
  })
})
