/**
 * Simple colored logger for CLI output
 * Replaces external dependency for full independence
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

const getTimestamp = (): string => {
  return new Date().toISOString().slice(11, 19)
}

const formatMessage = (
  color: string,
  prefix: string,
  message: string
): string => {
  const timestamp =
    process.env.LOG_TIMESTAMPS === 'true'
      ? `${colors.gray}[${getTimestamp()}]${colors.reset} `
      : ''
  return `${timestamp}${color}${prefix}${colors.reset} ${message}`
}

export const logger = {
  init: async (): Promise<void> => {
    // No-op for compatibility
  },
  info: (message: string): void => {
    console.log(formatMessage(colors.blue, '[INFO]', message))
  },
  success: (message: string): void => {
    console.log(formatMessage(colors.green, '[SUCCESS]', message))
  },
  error: (message: string): void => {
    console.error(formatMessage(colors.red, '[ERROR]', message))
  },
  warn: (message: string): void => {
    console.warn(formatMessage(colors.yellow, '[WARN]', message))
  },
  debug: (message: string): void => {
    if (process.env.DEBUG === 'true') {
      console.log(formatMessage(colors.gray, '[DEBUG]', message))
    }
  },
  log: (message: string): void => {
    console.log(message)
  }
}
