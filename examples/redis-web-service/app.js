'use strict'

const autocannon = require('autocannon')
const { spawnSync } = require('child_process')
const fastify = require('fastify')
const Redis = require('ioredis')

function randomString(length = 0) {
  if (length < 1) {
    length = Math.floor(Math.random() * 1000)
  }

  return spawnSync('openssl', ['rand', '-base64', length], { encoding: 'utf-8' }).stdout
}

// Create the server the Redis client
const server = fastify({ logger: process.env.LOG === 'true' })
const redis = new Redis(process.env.REDIS_URL ? `redis://${process.env.REDIS_URL}` : 6379)
const key = randomString(10)

// Prepare server routes
server.get('/', (request, reply) => {
  redis.srandmember(key, (err, value) => {
    if (err) {
      reply.code(500)
      reply.send(err)

      return
    }

    reply.send(value)
  })
})

server.post('/', (request, reply) => {
  redis.sadd(key, randomString(), err => {
    if (err) {
      reply.code(500)
      reply.send(err)

      return
    }

    reply.code(204)
    reply.send('')
  })
})

// Start the server
server.listen(0, (err, address) => {
  if (err) {
    throw err
  }

  server.log.info(`Server listening on ${address}.`)

  // Start autocannon
  server.log.info(`Starting autocannon ...`)
  autocannon({
    url: address,
    connections: 10,
    pipelining: 1,
    duration: 10,
    requests: Array.from(Array(1000), () => ({ method: Math.random() < 0.45 ? 'POST' : 'GET' }))
  })
})

// After 15 seconds (@nearform/heap-profiler default is 10 seconds, so we let it finish) terminate the process
setTimeout(() => {
  server.log.info(`heap-profiler should have finished. Terminating the process ...`)
  process.exit(0)
}, 15000)
