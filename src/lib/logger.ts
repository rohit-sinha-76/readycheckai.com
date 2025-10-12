import pino from 'pino'

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

export const logger = pino({
  level,
  base: undefined, // do not include pid/hostname in serverless logs
  redact: {
    paths: ['headers.authorization', 'req.headers.cookie', 'cookies', 'body.password', 'body.token'],
    censor: '[REDACTED]'
  },
  // Transport is intentionally omitted. In Next.js Server Components/Actions, 
  // Pino's worker threads (used by pino-pretty) can cause crashes or memory leaks.
  // Best practice: Log standard JSON and pipe to pino-pretty in package.json scripts.
  browser: {
    asObject: true
  }
})

export default logger
