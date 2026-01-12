import { Readable } from 'stream'
import { RequestContext } from './server'
import { getGithubProvider } from './providers/cache'
import { getTracker } from './tracker'

export type TProvider = {
  save: (
    ctx: RequestContext,
    hash: string,
    tag: string,
    stream: Readable
  ) => Promise<void>
  get: (
    ctx: RequestContext,
    hash: string
  ) => Promise<
    [number | undefined, Readable | ReadableStream, string | undefined] | null
  >
}

export const getProvider = (
  tracker: ReturnType<typeof getTracker>
): TProvider => {
  return getGithubProvider(tracker)
}
