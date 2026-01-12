import { readFile } from 'fs/promises'
import { serverLogFile, serverPort } from './lib/constants'
import { core } from './lib/core'

const SHUTDOWN_TOKEN = process.env.TURBOGHA_SHUTDOWN_TOKEN || 'turbogha-internal'

async function post(): Promise<void> {
  try {
    // Shutdown server with auth token
    const response = await fetch(`http://localhost:${serverPort}/shutdown`, {
      method: 'DELETE',
      headers: { 'x-shutdown-token': SHUTDOWN_TOKEN }
    })

    if (!response.ok) {
      core.warn(`Shutdown returned status ${response.status}`)
    }

    // Read and display logs
    try {
      const logs = await readFile(serverLogFile, 'utf-8')
      core.info(logs)
    } catch {
      core.info('No server logs available')
    }
  } catch (error) {
    if (error instanceof Error) {
      core.warn(`Server shutdown failed: ${error.message}`)
    }
  }
}

post()
