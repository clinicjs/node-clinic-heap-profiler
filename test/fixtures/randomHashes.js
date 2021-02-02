'use strict'

const { spawnSync } = require('child_process')

const hashes = []

for (let i = 0; i < 10; i++) {
  const length = Math.floor(Math.random() * 1000)
  hashes.push(spawnSync('openssl', ['rand', '-base64', length], { encoding: 'utf-8' }).stdout)
}
