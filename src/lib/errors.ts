import * as Sentry from '@sentry/nextjs'

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    if (!isOperational) {
      Sentry.captureException(this)
    }
  }
}
