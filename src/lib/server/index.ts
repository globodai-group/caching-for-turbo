import Fastify, { FastifyRequest, FastifyReply } from 'fastify'
import { serverPort } from '../constants'
import { getProvider } from '../providers'
import { Readable } from 'stream'
import { getTracker, formatMetrics, Tracker } from '../tracker'

// Configuration
const MAX_BODY_SIZE = 500 * 1024 * 1024 // 500MB max upload
const REQUEST_TIMEOUT = 300000 // 5 minutes
const SHUTDOWN_TOKEN = process.env.TURBOGHA_SHUTDOWN_TOKEN || 'turbogha-internal'

export type RequestContext = {
  log: {
    info: (message: string) => void
  }
}

// Graceful shutdown handler
let isShuttingDown = false

export async function server(): Promise<void> {
  const tracker = getTracker()
  const startTime = Date.now()

  const fastify = Fastify({
    logger: process.env.LOG_LEVEL === 'debug' ? true : false,
    bodyLimit: MAX_BODY_SIZE,
    requestTimeout: REQUEST_TIMEOUT
  })

  // Request timeout hook
  fastify.addHook('onRequest', async (request, reply) => {
    if (isShuttingDown) {
      reply.code(503).send({ ok: false, error: 'Server is shutting down' })
    }
  })

  // Health check
  fastify.get('/', async () => ({
    ok: true,
    uptime: Math.round((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '1.0.0'
  }))

  // Metrics endpoint
  fastify.get('/metrics', async () => ({
    ok: true,
    uptime: Math.round((Date.now() - startTime) / 1000),
    cache: {
      hits: tracker.hits,
      misses: tracker.misses,
      hitRate:
        tracker.hits + tracker.misses > 0
          ? (tracker.hits / (tracker.hits + tracker.misses)) * 100
          : 0
    },
    operations: {
      uploads: tracker.saveCount,
      downloads: tracker.getCount,
      bytesUploaded: tracker.bytesUploaded,
      bytesDownloaded: tracker.bytesDownloaded
    },
    timing: {
      avgSaveMs:
        tracker.saveCount > 0
          ? Math.round(tracker.save / tracker.saveCount)
          : 0,
      avgGetMs:
        tracker.getCount > 0 ? Math.round(tracker.get / tracker.getCount) : 0
    }
  }))

  // Ping endpoint
  fastify.get('/ping', async request => {
    try {
      const provider = getProvider(tracker)
      const testHash = `ping-${Date.now()}`
      const testContent = 'ping'

      const testStream = new Readable()
      testStream.push(testContent)
      testStream.push(null)

      await provider.save(request, testHash, 'ping', testStream)
      const result = await provider.get(request, testHash)

      return {
        ok: !!result,
        message: result ? 'Cache operational' : 'Cache test failed'
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Shutdown endpoint with token auth
  const shutdown = async (
    request: FastifyRequest,
    reply: FastifyReply,
    tracker: Tracker
  ) => {
    const token = request.headers['x-shutdown-token']
    if (token !== SHUTDOWN_TOKEN) {
      reply.code(401)
      return { ok: false, error: 'Unauthorized' }
    }

    if (isShuttingDown) {
      return { ok: true, message: 'Already shutting down' }
    }

    isShuttingDown = true
    console.log(formatMetrics(tracker))

    // Graceful shutdown
    setTimeout(async () => {
      await fastify.close()
      process.exit(0)
    }, 500)

    return { ok: true }
  }

  fastify.delete('/shutdown', async (request, reply) => {
    return shutdown(request, reply, tracker)
  })

  // Stream parser
  fastify.addContentTypeParser(
    'application/octet-stream',
    (_req, _payload, done) => done(null)
  )

  // Upload cache
  fastify.put('/v8/artifacts/:hash', async (request, reply) => {
    const hash = (request.params as { hash: string }).hash
    const contentLength = parseInt(
      request.headers['content-length'] || '0',
      10
    )

    if (contentLength > MAX_BODY_SIZE) {
      reply.code(413)
      return { ok: false, error: 'Payload too large' }
    }

    try {
      const provider = getProvider(tracker)
      await provider.save(
        request,
        hash,
        String(request.headers['x-artifact-tag'] || ''),
        request.raw
      )
      tracker.saveCount++
      tracker.bytesUploaded += contentLength
      return { ok: true }
    } catch (error) {
      reply.code(500)
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  })

  // Download cache
  fastify.get('/v8/artifacts/:hash', async (request, reply) => {
    const hash = (request.params as { hash: string }).hash

    try {
      const provider = getProvider(tracker)
      const result = await provider.get(request, hash)

      if (result === null) {
        tracker.misses++
        reply.code(404)
        return { ok: false }
      }

      tracker.hits++
      tracker.getCount++
      const [size, stream, artifactTag] = result

      if (size) {
        reply.header('Content-Length', size)
        tracker.bytesDownloaded += size
      }

      reply.header('Content-Type', 'application/octet-stream')
      if (artifactTag) {
        reply.header('x-artifact-tag', artifactTag)
      }

      return reply.send(stream)
    } catch (error) {
      tracker.misses++
      reply.code(500)
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Download failed'
      }
    }
  })

  // Turbo API compatibility endpoints
  fastify.get('/v5/user/tokens/current', async () => ({
    ok: true,
    token: {
      id: 'turbogha',
      name: 'turbogha',
      type: 'turbogha',
      origin: 'turbogha',
      scopes: [],
      activeAt: Date.now(),
      createdAt: Date.now()
    }
  }))

  fastify.get('/v8/artifacts/status', async () => ({
    ok: true,
    status: 'enabled'
  }))

  fastify.get('/v2/user', async () => ({
    ok: true,
    user: {
      id: 'turbogha',
      username: 'turbogha',
      email: 'turbogha@turbogha.com',
      name: 'turbogha',
      createdAt: Date.now()
    }
  }))

  fastify.get('/v2/teams', async () => ({
    ok: true,
    teams: [
      {
        id: 'turbogha',
        slug: 'turbogha',
        name: 'turbogha',
        createdAt: Date.now(),
        created: new Date(),
        membership: { role: 'OWNER' }
      }
    ]
  }))

  // Start server
  await fastify.listen({ port: serverPort, host: '127.0.0.1' })
  console.log(`TurboGHA server running on http://127.0.0.1:${serverPort}`)
}
