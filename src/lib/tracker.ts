export type Tracker = {
  // Timing (ms)
  save: number
  get: number
  delete: number
  list: number
  // Counts
  saveCount: number
  getCount: number
  deleteCount: number
  listCount: number
  // Cache metrics
  hits: number
  misses: number
  // Size metrics (bytes)
  bytesUploaded: number
  bytesDownloaded: number
}

export const getTracker = (): Tracker => ({
  save: 0,
  get: 0,
  delete: 0,
  list: 0,
  saveCount: 0,
  getCount: 0,
  deleteCount: 0,
  listCount: 0,
  hits: 0,
  misses: 0,
  bytesUploaded: 0,
  bytesDownloaded: 0
})

export const formatMetrics = (tracker: Tracker): string => {
  const hitRate =
    tracker.hits + tracker.misses > 0
      ? ((tracker.hits / (tracker.hits + tracker.misses)) * 100).toFixed(1)
      : '0'

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const avgTime = (total: number, count: number): string =>
    count > 0 ? `${Math.round(total / count)}ms` : '0ms'

  return `
╔══════════════════════════════════════════╗
║           TurboGHA Statistics            ║
╠══════════════════════════════════════════╣
║  Cache Hit Rate: ${hitRate.padStart(6)}%                 ║
║  Hits: ${String(tracker.hits).padStart(6)} | Misses: ${String(tracker.misses).padStart(6)}       ║
╠══════════════════════════════════════════╣
║  Uploads:   ${String(tracker.saveCount).padStart(4)} (${formatBytes(tracker.bytesUploaded).padStart(8)})       ║
║  Downloads: ${String(tracker.getCount).padStart(4)} (${formatBytes(tracker.bytesDownloaded).padStart(8)})       ║
╠══════════════════════════════════════════╣
║  Avg Save: ${avgTime(tracker.save, tracker.saveCount).padStart(7)}                    ║
║  Avg Get:  ${avgTime(tracker.get, tracker.getCount).padStart(7)}                    ║
╚══════════════════════════════════════════╝`
}
