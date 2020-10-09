'use strict'

const { spawn } = require('child_process')
const events = require('events')
const fs = require('fs')
const { ensureDir, move } = require('fs-extra')
const { createServer } = require('net')
const path = require('path')
const pump = require('pump')
const { tmpNameSync } = require('tmp')
const buildJs = require('@nearform/clinic-common/scripts/build-js')
const buildCss = require('@nearform/clinic-common/scripts/build-css')
const mainTemplate = require('@nearform/clinic-common/templates/main')
const analyse = require('./analysis/index.js')

class ClinicHeapProfiler extends events.EventEmitter {
  constructor(settings = {}) {
    super()

    const { detectPort = false, duration = 10000, debug = false, dest = null } = settings

    this.detectPort = detectPort
    this.duration = duration
    this.debug = debug
    this.path = dest
  }

  collect(args, cb) {
    let nodeOptions = `-r ${path.join(__dirname, '../node_modules/@nearform/heap-profiler')}`

    const temporaryPath = tmpNameSync()

    const env = {
      ...process.env,
      HEAP_PROFILER_LOGGING_DISABLED: true,
      HEAP_PROFILER_SNAPSHOT: false,
      HEAP_PROFILER_TIMELINE: false,
      HEAP_PROFILER_PROFILE: true,
      HEAP_PROFILER_PROFILE_DURATION: this.duration,
      HEAP_PROFILER_PROFILE_DESTINATION: temporaryPath
    }

    if (this.detectPort) {
      nodeOptions += ` -r ${path.join(__dirname, './injects/detect-port.js')}`

      const server = createServer(socket => {
        socket.once('data', chunk => {
          socket.end()
          server.close()
          this.emit('port', chunk)
        })
      }).on('error', err => {
        return cb(err)
      })

      // Grab an arbitrary unused port
      server.listen(0, () => {
        env.CLINIC_HEAP_PROFILER_PORT = server.address().port.toString()
        this.execute(args, temporaryPath, env, nodeOptions, cb, server)
      })

      return
    }

    this.execute(args, temporaryPath, env, nodeOptions, cb)
  }

  visualize(sourceFile, outputFilename, cb) {
    analyse(sourceFile, (err, converted) => {
      if (err) {
        return cb(err)
      }

      this.writeHtml(converted, outputFilename, cb)
    })
  }

  execute(args, temporaryPath, env, nodeOptions, cb, server) {
    env.NODE_OPTIONS = nodeOptions

    const app = spawn('node', args, { stdio: ['ignore', 'inherit', 'inherit'], env })

    // TODO@PI: How do we trigger the start?
    setTimeout(() => {
      app.kill('SIGUSR2')
    }, 100)

    app.once('exit', code => {
      if (server) {
        server.close()
      }

      if (code !== 0) {
        return cb(new Error(`Child process exited with code ${code}.`))
      }

      // Move the file to its final destination, then trigger the callback
      const basePath = path.join(process.cwd(), '.clinic')

      ensureDir(basePath, err => {
        if (err) {
          cb(err)
        }

        const finalPath = path.join(basePath, `${app.pid}-clinic.heapprofile`)

        move(temporaryPath, finalPath, err => {
          cb(err, finalPath)
        })
      })
    })
  }

  onPort(port) {
    this.emit('port', Number(port.toString()))
  }

  writeHtml(data, outputFilename, cb) {
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
      debug: this.debug,
      fakeDataPath,
      scriptPath,
      beforeBundle: b =>
        b.require({
          source: JSON.stringify(data),
          file: fakeDataPath
        }),
      env: {
        PRESENTATION_MODE: process.env.PRESENTATION_MODE
      }
    })

    // build CSS
    const styleFile = buildCss({
      stylePath,
      debug: this.debug
    })

    // generate HTML
    const outputFile = mainTemplate({
      favicon: clinicFaviconBase64,
      title: 'Clinic Heap Profiler',
      styles: styleFile,
      script: scriptFile,
      headerLogoUrl: 'https://clinicjs.org/heap-profiler/',
      headerLogoTitle: 'Clinic Flame on Clinicjs.org',
      headerLogo: logoFile,
      headerText: 'Heap Profiler',
      toolVersion: version,
      nearFormLogo: nearFormLogoFile,
      uploadId: outputFilename.split('/').pop().split('.html').shift(),
      body: '<main></main>'
    })

    pump(outputFile, fs.createWriteStream(outputFilename), cb)
  }
}

module.exports = ClinicHeapProfiler
