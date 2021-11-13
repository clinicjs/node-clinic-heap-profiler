'use strict'

const { test } = require('tap')
const { categorise } = require('../src/analysis')

test('analysis - test categorise', t => {
  t.same(categorise('wasm [WASM:ABC]'), { type: 'wasm', category: 'wasm' })
  t.same(categorise('regexp [CODE:RegExp]'), { type: 'regexp', category: 'regexp' })

  t.same(categorise('whatever [CODE:Whatever]'), { type: 'v8', category: 'all-v8' })
  t.same(categorise('v8::internal::function [CPP]'), { type: 'v8', category: 'all-v8' })
  t.same(categorise('fs.'), { type: 'core', category: 'core' })
  t.same(categorise('cFunction [CPP]'), { type: 'cpp', category: 'all-v8' })
  t.same(categorise('libFunction [SHARED_LIB]'), { type: 'cpp', category: 'all-v8' })
  t.same(categorise('[eval]'), { type: 'native', category: 'all-v8' })
  t.same(categorise('other'), { type: 'v8', category: 'all-v8' })

  t.same(categorise('index.mjs native other'), { type: 'native', category: 'all-v8' })

  t.same(categorise(' index.mjs'), { type: 'core', category: 'core' })
  t.same(categorise('clearBuffer node:internal/streams/writable:529:21'), { type: 'core', category: 'core' })

  t.end()
})
