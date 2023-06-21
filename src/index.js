'use strict'

const { spawn } = require('child_process')
const events = require('events')
const fs = require('fs')
const { ensureDir } = require('fs-extra')
const { createConnection, createServer } = require('net')
const path = require('path')
const pump = require('pump')
const buildJs = require('@clinic/clinic-common/scripts/build-js')
const buildCss = require('@clinic/clinic-common/scripts/build-css')
const mainTemplate = require('@clinic/clinic-common/templates/main')
const { analyse } = require('./analysis/index.js')

/* istanbul ignore next */
const noop = function () {}

function execute (instance, args, env, nodeOptions, cb) {
  ensureDir(instance.path, err => {
    /* istanbul ignore if */
    if (err) {
      cb(err)
      return
    }

    env.NODE_OPTIONS = nodeOptions

    /*
      By default spawn creates a process in the same process group of the current one.
      This means that SIGINT are received both from the parent and child processes.
      We handle SIGINT in the child, so we want to ignore in the parent.
    */
    process.once('SIGINT', noop)

    instance.process = spawn(args[0], args.slice(1), { stdio: ['ignore', 'inherit', 'inherit'], env })

    instance.process.once('exit', (code, signal) => {
      process.removeListener('SIGINT', noop)

      instance.emit('analysing')

      if (code && !instance.collectOnFailure) {
        cb(new Error(`Child process exited with code ${code}.`))
        return
      }

      cb(null, `${instance.path}/${instance.name || instance.process.pid}.clinic-heapprofiler`)
    })
  })
}

function writeHtml (data, outputFilename, debug, cb) {
  const fakeDataPath = path.join(__dirname, 'visualizer', 'data.json')
  const stylePath = path.join(__dirname, 'visualizer', 'style.css')
  const scriptPath = path.join(__dirname, 'visualizer', 'main.js')
  const logoPath = path.join(__dirname, 'visualizer/assets', 'heap-profiler-logo.svg')
  const clinicFaviconPath = path.join(__dirname, 'visualizer', 'clinic-favicon.png.b64')

  // add logos
  const logoFile = fs.createReadStream(logoPath)
  const clinicFaviconBase64 = fs.createReadStream(clinicFaviconPath)

  const version = require('../package.json').version

  // build JS
  const scriptFile = buildJs({
    basedir: __dirname,
    debug,
    fakeDataPath,
    scriptPath,
    beforeBundle (b) {
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
    uploadId: outputFilename.split('/').pop().split('.html').shift(),
    body: '<main></main>'
  })

  pump(outputFile, fs.createWriteStream(outputFilename), cb)
}

class ClinicHeapProfiler extends events.EventEmitter {
  constructor (settings = {}) {
    super()

    const {
      detectPort = false,
      collectOnFailure = false,
      debug = false,
      dest = '.clinic',
      name
    } = settings

    this.detectPort = !!detectPort
    this.collectOnFailure = !!collectOnFailure
    this.debug = debug
    this.path = dest
    this.name = name
  }

  collect (args, cb) {
    let preloadPath = path.join(__dirname, './injects/ipc.js')
    if (process.platform === 'win32') {
      preloadPath = preloadPath.replace(/\\/g, '\\\\')
    }

    const nodeOptions = `-r "${preloadPath}"`

    const env = {
      ...process.env,
      HEAP_PROFILER_NAME: this.name,
      HEAP_PROFILER_PATH: this.path,
      HEAP_PROFILER_PRELOADER_DISABLED: 'true',
      HEAP_PROFILER_USE_IPC: this.detectPort
    }

    if (!this.detectPort) {
      execute(this, args, env, nodeOptions, cb)
      return
    }

    let applicationPort
    const server = createServer(socket => {
      socket.on('data', raw => {
        const port = parseInt(raw.toString(), 0)

        /* istanbul ignore if */
        if (isNaN(port)) {
          return
        }

        // That's the IPC port
        if (port < 0) {
          this.ipcPort = -port
        } else {
          applicationPort = port
        }

        if (this.detectPort && this.ipcPort && applicationPort) {
          server.close()

          /*
            The last argument, by clinic CLI contract, is required when using --autocannon or --on-port option.
            The CLI invokes the callback when the tool --autocannon or --on-port tool has finished.
          */
          this.emit('port', applicationPort, null, this.stopViaIPC.bind(this))
        }
      })
    }).on(
      'error',
      /* istanbul ignore next */
      err => {
        return cb(err)
      }
    )

    // Grab an arbitrary unused port
    server.listen(0, () => {
      env.CLINIC_HEAP_PROFILER_PORT = server.address().port
      execute(this, args, env, nodeOptions, cb)
    })
  }

  visualize (sourceFile, outputFilename, cb) {
    analyse(sourceFile, (err, converted) => {
      if (err) {
        return cb(err)
      }

      writeHtml(converted, outputFilename, this.debug, cb)
    })
  }

  stopViaIPC () {
    if (!this.ipcPort) {
      return
    }

    const client = createConnection({ port: this.ipcPort }, () => {
      client.end('clinic-heap-profiler:stop')
    })

    // Ignore if nobody is listening
    client.on('error', noop)
  }
}

module.exports = ClinicHeapProfiler
