'use strict'

const fs = require('fs')
const path = require('path')
const { test } = require('tap')
const ClinicHeapProfiler = require('../src/index.js')

test('cmd - test collect - default name (child_process.pid) and output destination (.clinic)', t => {
  const tool = new ClinicHeapProfiler({ debug: true })

  function cleanup (err, filepath) {
    function callback (err) {
      t.error(err)
      t.end()
    }

    t.error(err)

    t.match(filepath, /^\.clinic(\/|\\)[0-9]+\.clinic-heapprofiler$/)

    fs.rm(path.dirname(filepath), { recursive: true }, callback)
  }

  tool.collect([process.execPath, path.join('test', 'fixtures', 'randomHashes.js')], (err, filepath) => {
    if (err) {
      cleanup(err, filepath)
      return
    }

    t.match(filepath, tool.process.pid.toString())

    t.ok(fs.statSync(filepath).isFile())

    tool.visualize(filepath, `${filepath}.html`, err => {
      if (err) {
        cleanup(err, filepath)
        return
      }

      t.ok(fs.statSync(`${filepath}.html`).isFile())

      cleanup(null, filepath)
    })
  })
})

test('cmd - test collect - custom output destination', t => {
  const tool = new ClinicHeapProfiler({ debug: true, dest: 'test-output-destination' })

  function cleanup (err, filepath) {
    function callback (err) {
      t.error(err)
      t.end()
    }

    t.error(err)

    t.match(filepath, /^test-output-destination/)

    fs.rm(path.dirname(filepath), { recursive: true }, callback)
  }

  tool.collect([process.execPath, path.join('test', 'fixtures', 'randomHashes.js')], (err, filepath) => {
    if (err) {
      cleanup(err, filepath)
      return
    }

    t.ok(fs.statSync(filepath).isFile())

    tool.visualize(filepath, `${filepath}.html`, err => {
      if (err) {
        cleanup(err, filepath)
        return
      }

      t.ok(fs.statSync(`${filepath}.html`).isFile())

      cleanup(null, filepath)
    })
  })
})

test('cmd - test collect - custom output name', t => {
  const tool = new ClinicHeapProfiler({ debug: true, name: 'test-custom-name' })

  function cleanup (err, filepath) {
    function callback (err) {
      t.error(err)
      t.end()
    }

    t.error(err)

    t.equal(filepath, '.clinic/test-custom-name.clinic-heapprofiler')

    fs.rm(path.dirname(filepath), { recursive: true }, callback)
  }

  tool.collect([process.execPath, path.join('test', 'fixtures', 'randomHashes.js')], (err, filepath) => {
    if (err) {
      cleanup(err, filepath)
      return
    }

    t.ok(fs.statSync(filepath).isFile())

    tool.visualize(filepath, `${filepath}.html`, err => {
      if (err) {
        cleanup(err, filepath)
        return
      }

      t.ok(fs.statSync(`${filepath}.html`).isFile())

      cleanup(null, filepath)
    })
  })
})

test('cmd - test collect - custom name and output destination', t => {
  const tool = new ClinicHeapProfiler({ debug: true, name: 'test-custom-name', dest: 'test-output-destination' })

  function cleanup (err, filepath) {
    function callback (err) {
      t.error(err)
      t.end()
    }

    t.error(err)

    t.equal(filepath, 'test-output-destination/test-custom-name.clinic-heapprofiler')

    fs.rm(path.dirname(filepath), { recursive: true }, callback)
  }

  tool.collect([process.execPath, path.join('test', 'fixtures', 'randomHashes.js')], (err, filepath) => {
    if (err) {
      cleanup(err, filepath)
      return
    }

    t.ok(fs.statSync(filepath).isFile())

    tool.visualize(filepath, `${filepath}.html`, err => {
      if (err) {
        cleanup(err, filepath)
        return
      }

      t.ok(fs.statSync(`${filepath}.html`).isFile())

      cleanup(null, filepath)
    })
  })
})
