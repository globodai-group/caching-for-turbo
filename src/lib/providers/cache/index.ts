import {
  createReadStream,
  createWriteStream,
  existsSync,
  statSync
} from 'node:fs'
import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { getTracker } from 'src/lib/tracker'
import { timingProvider } from 'src/lib/utils'
import { getCacheKey, getFsCachePath, getTempCachePath } from '../../constants'
import { env } from '../../env'
import type { TProvider } from '../../providers'
import type { RequestContext } from '../../server'
import { getCacheClient } from './utils'

export async function saveCache(
  ctx: RequestContext,
  hash: string,
  tag: string,
  stream: Readable
): Promise<void> {
  if (!env.valid) {
    ctx.log.info('Using filesystem cache (GitHub Cache API not available)')
    await pipeline(stream, createWriteStream(getFsCachePath(hash)))
    return
  }
  const client = getCacheClient()
  const key = getCacheKey(hash, tag)
  await client.save(key, stream)
  ctx.log.info(`Saved cache ${key}`)
}

export async function getCache(
  ctx: RequestContext,
  hash: string
): Promise<
  [number | undefined, Readable | ReadableStream, string | undefined] | null
> {
  if (!env.valid) {
    const path = getFsCachePath(hash)
    if (!existsSync(path)) return null
    const size = statSync(path).size
    return [size, createReadStream(path), undefined]
  }

  const client = getCacheClient()
  const cacheKey = getCacheKey(hash)
  const fileRestorationPath = getTempCachePath(cacheKey)
  const foundKey = await client.restore(fileRestorationPath, cacheKey)

  if (!foundKey) {
    return null
  }

  const [foundCacheKey, artifactTag] = String(foundKey).split('#')
  if (foundCacheKey !== cacheKey) {
    ctx.log.info(`Cache key mismatch: ${foundCacheKey} !== ${cacheKey}`)
    return null
  }

  const size = statSync(fileRestorationPath).size
  return [size, createReadStream(fileRestorationPath), artifactTag]
}

export const getGithubProvider = (
  tracker: ReturnType<typeof getTracker>
): TProvider => ({
  save: timingProvider('save', tracker, saveCache),
  get: timingProvider('get', tracker, getCache)
})
