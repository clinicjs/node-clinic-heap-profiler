'use strict'

const fs = require('fs')
const path = require('path')
/* istanbul ignore next */
const platform = path.sep === '\\' ? path.win32 : path.posix

function isNodeCore (url) {
  const filePath = url.split(' ')[1]
  return platform.isAbsolute(filePath) === false
}

function categoriseV8 (name, url) {
  const core = { type: 'core', category: 'core' }
  let type = ''

  if (!/(\.m?js)|(node:)/.test(name)) {
    if (/\[CODE:.*?]$/.test(name) || /v8::internal::.*\[CPP]$/.test(name)) {
      type = 'v8'
    } else if (/\.$/.test(name)) {
      return core
    } else if (/\[CPP]$/.test(name) || /\[SHARED_LIB]$/.test(name)) {
      type = 'cpp'
    } else if (/\[eval]/.test(name)) {
      type = 'native'
    } else {
      type = 'v8'
    }
  } else if (/ native /.test(name)) {
    type = 'native'
  } else if (isNodeCore(name)) {
    return core
  }

  return type ? { type, category: 'all-v8' } : null
}

function categoriseDep (name) {
  const escSep = path.sep
  const nodeModules = `${escSep}node_modules${escSep}`
  const depDirRegex = new RegExp(`${nodeModules}(?:(@.+?)${escSep})?(.+?)${escSep}(?!.*${nodeModules})`)
  const match = name.match(depDirRegex)

  return match ? { type: match[1] ? match.slice(1, 3).join('/') : match[2], category: 'deps' } : null
}

function categorise (name, url, appName) {
  // Check for WASM or Regexp
  if (/\[WASM:\w+]$/.test(name)) {
    return { type: 'wasm', category: 'wasm' }
  } else if (/\[CODE:RegExp]$/.test(name)) {
    return { type: 'regexp', category: 'regexp' }
  }

  return categoriseV8(name, url) || categoriseDep(name) || { type: appName, category: 'app' }
}

function translateChildren (deps, node, samples, appName, root = false) {
  const children = []
  let { functionName, url, lineNumber, columnNumber } = node.callFrame

  if (!functionName) {
    functionName = '(anonymous)'
  }

  if (root) {
    url = functionName = ''
    lineNumber = null
    columnNumber = null
  } else {
    lineNumber++
    columnNumber++
  }

  for (const c of node.children) {
    /* istanbul ignore if */
    if (
      c.callFrame.url &&
      c.callFrame.url.includes('node_modules/@clinic/heap-profiler')
    ) continue
    children.push(translateChildren(deps, c, samples, appName))
  }

  const selfValue = node.selfSize
  const childrenValue = children.reduce((accu, c) => accu + c.selfValue + c.childrenValue, 0)

  const location = lineNumber && columnNumber ? `:${lineNumber}:${columnNumber}` : ''
  const name = `${functionName} ${url}${location}`.trim()
  const { category, type } = root ? { type: appName, category: 'app' } : categorise(name, url, appName)

  /* istanbul ignore if */
  if (type === 'regexp') {
    functionName = `/${name.replace(/ \[CODE:RegExp\].*$/, '')}/`
    url = '[CODE:RegExp]'
  }

  if (category === 'deps') {
    deps.add(type)
  }

  return {
    id: node.id,
    target: '',
    name,
    fileName: url,
    functionName,
    lineNumber,
    columnNumber,
    type,
    category,
    selfValue,
    childrenValue,
    value: selfValue + childrenValue,
    children,
    isRoot: root
  }
}

function analyse (input, cb) {
  fs.readFile(input, 'utf8', (err, raw) => {
    if (err) {
      return cb(err)
    }

    try {
      const { head, samples: rawSamples } = JSON.parse(raw)

      /* istanbul ignore next */
      const pathSeparator = path.sep
      const appName = 'Application'

      const samples = rawSamples.reduce((accu, s) => {
        accu[s.nodeId] = s.size
        return accu
      }, {})

      const deps = new Set()
      const tree = translateChildren(deps, head, samples, appName, true)

      cb(null, {
        appName,
        pathSeparator,
        codeAreas: [
          {
            id: 'app',
            children: [],
            childrenVisibilityToggle: false,
            excludeKey: 'app'
          },
          {
            id: 'deps',
            children: Array.from(deps)
              .sort()
              .map(d => ({ id: d, excludeKey: `deps:${d}` })),
            childrenVisibilityToggle: true,
            excludeKey: 'deps'
          },
          {
            id: 'wasm',
            excludeKey: 'wasm'
          },
          {
            id: 'core',
            excludeKey: 'core'
          },
          {
            id: 'all-v8',
            children: [
              {
                id: 'v8',
                excludeKey: 'all-v8:v8'
              },
              {
                id: 'native',
                excludeKey: 'all-v8:native'
              },
              {
                id: 'cpp',
                excludeKey: 'all-v8:cpp'
              },
              {
                id: 'regexp',
                excludeKey: 'all-v8:regexp'
              }
            ],
            childrenVisibilityToggle: true,
            excludeKey: 'all-v8'
          }
        ],
        data: tree
      })
    } catch (e) {
      /* istanbul ignore next */
      cb(e)
    }
  })
}

module.exports = { categorise, analyse }
