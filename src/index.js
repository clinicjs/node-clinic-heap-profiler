'use strict'

const { spawn } = require('child_process')
const events = require('events')
const fs = require('fs')
const { ensureDir } = require('fs-extra')
const { createServer } = require('net')
const path = require('path')
const pump = require('pump')
const buildJs = require('@nearform/clinic-common/scripts/build-js')
const buildCss = require('@nearform/clinic-common/scripts/build-css')
const mainTemplate = require('@nearform/clinic-common/templates/main')
const analyse = require('./analysis/index.js')

function execute(args, dest, env, nodeOptions, cb, server) {
  ensureDir(path.dirname(dest), err => {
    if (err) {
      cb(err)
      return
    }

    env.NODE_OPTIONS = nodeOptions
    const app = spawn('node', args, { stdio: ['ignore', 'inherit', 'inherit'], env })

    // Forward SIGINT to the spawned process so it stops heap profiling
    process.once('SIGINT', () => {
      app.kill('SIGINT')
    })

    app.once('exit', code => {
      if (server) {
        server.close()
      }

      if (code) {
        cb(new Error(`Child process exited with code ${code}.`))
        return
      }

      cb(null, dest)
    })
  })
}

function writeHtml(data, outputFilename, debug, cb) {
  const fakeDataPath = path.join(__dirname, 'visualizer', 'data.json')
  const stylePath = path.join(__dirname, 'visualizer', 'style.css')
  const scriptPath = path.join(__dirname, 'visualizer', 'main.js')
  const logoPath = path.join(__dirname, 'visualizer/assets', 'heap-profiler-logo.svg')
  const nearFormLogoPath = path.join(__dirname, 'visualizer', 'nearform-logo.svg')
  const clinicFaviconPath = path.join(__dirname, 'visualizer', 'clinic-favicon.png.b64')

  // add logos
  const logoFile = fs.createReadStream(logoPath)
  const nearFormLogoFile = fs.createReadStream(nearFormLogoPath)
  const clinicFaviconBase64 = fs.createReadStream(clinicFaviconPath)

  const version = require('../package.json').version

  // build JS
  const scriptFile = buildJs({
    basedir: __dirname,
    debug,
    fakeDataPath,
    scriptPath,
    beforeBundle(b) {
      b.require({ source: JSON.stringify(data), file: fakeDataPath })
    },
    env: {
      PRESENTATION_MODE: process.env.PRESENTATION_MODE
    }
  })

  // build CSS
  const styleFile = buildCss({ stylePath, debug })

  // generate HTML
  const outputFile = mainTemplate({
    favicon: clinicFaviconBase64,
    title: 'Clinic Heap Profiler',
    styles: styleFile,
    script: scriptFile,
    headerLogoUrl: 'https://clinicjs.org/heap-profiler/',
    headerLogoTitle: 'Clinic Heap Profiler on Clinicjs.org',
    headerLogo: logoFile,
    headerText: 'Heap Profiler',
    toolVersion: version,
    nearFormLogo: nearFormLogoFile,
    uploadId: outputFilename.split('/').pop().split('.html').shift(),
    body: '<main></main>'
  })

  pump(outputFile, fs.createWriteStream(outputFilename), cb)
}

class ClinicHeapProfiler extends events.EventEmitter {
  constructor(settings = {}) {
    super()

    const { detectPort = false, debug = false, dest = null } = settings

    this.detectPort = detectPort
    this.debug = debug
    this.dest = dest
  }

  collect(args, cb) {
    let nodeOptions = ` -r ${path.join(__dirname, './injects/sampler.js')}`

    if (!this.dest) {
      this.dest = path.join(process.cwd(), `.clinic/${process.pid}-clinic.heapprofile`)
    }

    const env = {
      ...process.env,
      HEAP_PROFILER_DESTINATION: this.dest,
      HEAP_PROFILER_PRELOADER_DISABLED: 'true'
    }

    if (this.detectPort) {
      nodeOptions += ` -r ${path.join(__dirname, './injects/detect-port.js')}`

      const server = createServer(socket => {
        socket.once('data', port => {
          socket.end()
          server.close()
          this.emit('port', Number(port.toString()))
        })
      }).on('error', err => {
        return cb(err)
      })

      // Grab an arbitrary unused port
      server.listen(0, () => {
        env.CLINIC_HEAP_PROFILER_PORT = server.address().port.toString()
        execute(args, this.dest, env, nodeOptions, cb, server)
      })

      return
    }

    execute(args, this.dest, env, nodeOptions, cb)
  }

  visualize(sourceFile, outputFilename, cb) {
    analyse(sourceFile, (err, converted) => {
      if (err) {
        return cb(err)
      }

      writeHtml(converted, outputFilename, this.debug, cb)
    })
  }
}

module.exports = ClinicHeapProfiler
