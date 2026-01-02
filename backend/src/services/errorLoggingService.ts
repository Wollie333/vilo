import * as Sentry from '@sentry/node'
import { supabase } from '../lib/supabase.js'
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express'
import { v4 as uuidv4 } from 'uuid'

// Error types for categorization
export type ErrorType =
  | 'exception'
  | 'api_error'
  | 'validation'
  | 'auth'
  | 'payment'
  | 'database'
  | 'external_service'
  | 'rate_limit'
  | 'not_found'

export type ErrorSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical'

export interface ErrorLogParams {
  error: Error | string
  errorCode?: string
  errorType?: ErrorType
  severity?: ErrorSeverity
  tenantId?: string
  userId?: string
  requestId?: string
  endpoint?: string
  httpMethod?: string
  statusCode?: number
  metadata?: Record<string, any>
}

interface ErrorLogRecord {
  id: string
  error_code: string
  error_type: ErrorType
  severity: ErrorSeverity
  message: string
  stack_trace: string | null
  tenant_id: string | null
  user_id: string | null
  request_id: string | null
  endpoint: string | null
  http_method: string | null
  metadata: Record<string, any>
  environment: string
  sentry_event_id: string | null
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored'
  occurred_at: string
}

let sentryInitialized = false

/**
 * Initialize Sentry SDK
 * Call this at application startup
 */
export async function initializeSentry(): Promise<void> {
  if (sentryInitialized) {
    console.log('[ErrorLogging] Sentry already initialized')
    return
  }

  try {
    // Try to get DSN from platform settings
    let dsn = process.env.SENTRY_DSN

    if (!dsn) {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'sentry_dsn')
          .single()

        if (data?.value && data.value !== 'your-sentry-dsn-here') {
          dsn = data.value
        }
      } catch (error) {
        console.log('[ErrorLogging] Could not fetch Sentry DSN from settings')
      }
    }

    if (!dsn) {
      console.log('[ErrorLogging] No Sentry DSN configured, running without Sentry')
      return
    }

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1, // 10% of transactions
      integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration()
      ],
      beforeSend(event) {
        // Filter out sensitive data
        if (event.request?.headers) {
          delete event.request.headers['authorization']
          delete event.request.headers['cookie']
        }
        return event
      }
    })

    sentryInitialized = true
    console.log('[ErrorLogging] Sentry initialized successfully')
  } catch (error) {
    console.error('[ErrorLogging] Failed to initialize Sentry:', error)
  }
}

/**
 * Generate a unique error code based on type and timestamp
 */
function generateErrorCode(errorType: ErrorType): string {
  const prefix = errorType.substring(0, 3).toUpperCase()
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

/**
 * Log an error to both Sentry and the database
 */
export async function logError(params: ErrorLogParams): Promise<string | null> {
  const {
    error,
    errorCode,
    errorType = 'exception',
    severity = 'error',
    tenantId,
    userId,
    requestId,
    endpoint,
    httpMethod,
    statusCode,
    metadata = {}
  } = params

  const errorMessage = error instanceof Error ? error.message : String(error)
  const stackTrace = error instanceof Error ? error.stack : null
  const finalErrorCode = errorCode || generateErrorCode(errorType)
  const environment = process.env.NODE_ENV || 'development'

  let sentryEventId: string | null = null

  // Send to Sentry if initialized and severity is error or critical
  if (sentryInitialized && ['error', 'critical'].includes(severity)) {
    try {
      Sentry.withScope((scope) => {
        scope.setLevel(severity === 'critical' ? 'fatal' : 'error')
        scope.setTag('error_type', errorType)
        scope.setTag('error_code', finalErrorCode)

        if (tenantId) scope.setTag('tenant_id', tenantId)
        if (userId) scope.setTag('user_id', userId)
        if (requestId) scope.setTag('request_id', requestId)
        if (endpoint) scope.setTag('endpoint', endpoint)
        if (httpMethod) scope.setTag('http_method', httpMethod)
        if (statusCode) scope.setTag('status_code', statusCode.toString())

        scope.setContext('metadata', metadata)

        if (error instanceof Error) {
          sentryEventId = Sentry.captureException(error)
        } else {
          sentryEventId = Sentry.captureMessage(errorMessage, 'error')
        }
      })
    } catch (sentryError) {
      console.error('[ErrorLogging] Failed to send to Sentry:', sentryError)
    }
  }

  // Log to database
  try {
    const record: Partial<ErrorLogRecord> = {
      error_code: finalErrorCode,
      error_type: errorType,
      severity,
      message: errorMessage,
      stack_trace: stackTrace,
      tenant_id: tenantId || null,
      user_id: userId || null,
      request_id: requestId || null,
      endpoint: endpoint || null,
      http_method: httpMethod || null,
      metadata: {
        ...metadata,
        statusCode
      },
      environment,
      sentry_event_id: sentryEventId,
      status: 'new',
      occurred_at: new Date().toISOString()
    }

    const { error: dbError } = await supabase
      .from('error_logs')
      .insert(record)

    if (dbError) {
      console.error('[ErrorLogging] Failed to log to database:', dbError)
    }
  } catch (dbError) {
    console.error('[ErrorLogging] Database logging error:', dbError)
  }

  // Also log to console in development
  if (environment === 'development' || severity === 'critical') {
    console.error(`[${severity.toUpperCase()}] ${finalErrorCode}: ${errorMessage}`)
    if (stackTrace) {
      console.error(stackTrace)
    }
  }

  return sentryEventId
}

/**
 * Log an API error with request context
 */
export async function logAPIError(
  req: Request,
  error: Error,
  statusCode: number = 500,
  metadata?: Record<string, any>
): Promise<void> {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4()
  const tenantId = req.headers['x-tenant-id'] as string

  // Determine error type based on status code
  let errorType: ErrorType = 'api_error'
  if (statusCode === 401 || statusCode === 403) {
    errorType = 'auth'
  } else if (statusCode === 404) {
    errorType = 'not_found'
  } else if (statusCode === 422 || statusCode === 400) {
    errorType = 'validation'
  } else if (statusCode === 429) {
    errorType = 'rate_limit'
  }

  // Determine severity based on status code
  let severity: ErrorSeverity = 'error'
  if (statusCode < 500) {
    severity = 'warning'
  } else if (statusCode >= 500) {
    severity = 'error'
  }

  await logError({
    error,
    errorType,
    severity,
    tenantId,
    requestId,
    endpoint: req.path,
    httpMethod: req.method,
    statusCode,
    metadata: {
      ...metadata,
      query: req.query,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.headers['x-forwarded-for']
    }
  })
}

/**
 * Express error handling middleware
 * Add this after all routes to catch unhandled errors
 */
export function errorHandlingMiddleware(): ErrorRequestHandler {
  return async (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error
    await logAPIError(req, err, 500, {
      originalUrl: req.originalUrl,
      body: req.body ? '[REDACTED]' : undefined
    })

    // If response already started, delegate to default handler
    if (res.headersSent) {
      return next(err)
    }

    // Send error response
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
      requestId: req.headers['x-request-id'] || 'unknown'
    })
  }
}

/**
 * Request ID middleware
 * Adds a unique request ID to each request for correlation
 */
export function requestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4()
    req.headers['x-request-id'] = requestId
    res.setHeader('x-request-id', requestId)
    next()
  }
}

/**
 * Log a critical error and optionally alert
 */
export async function logCriticalError(
  error: Error | string,
  context: {
    tenantId?: string
    userId?: string
    service?: string
    metadata?: Record<string, any>
  }
): Promise<void> {
  await logError({
    error,
    severity: 'critical',
    errorType: 'exception',
    tenantId: context.tenantId,
    userId: context.userId,
    metadata: {
      ...context.metadata,
      service: context.service,
      alertSent: true
    }
  })

  // In production, you might want to send alerts here
  // e.g., email, Slack, PagerDuty, etc.
  console.error('[CRITICAL ERROR]', error)
}

/**
 * Log a database error
 */
export async function logDatabaseError(
  error: Error,
  operation: string,
  table: string,
  tenantId?: string
): Promise<void> {
  await logError({
    error,
    errorType: 'database',
    severity: 'error',
    tenantId,
    metadata: {
      operation,
      table
    }
  })
}

/**
 * Log an external service error
 */
export async function logExternalServiceError(
  error: Error,
  serviceName: string,
  endpoint?: string,
  tenantId?: string
): Promise<void> {
  await logError({
    error,
    errorType: 'external_service',
    severity: 'error',
    tenantId,
    metadata: {
      serviceName,
      externalEndpoint: endpoint
    }
  })
}

/**
 * Log a payment processing error
 */
export async function logPaymentError(
  error: Error,
  gateway: string,
  transactionId?: string,
  tenantId?: string
): Promise<void> {
  await logError({
    error,
    errorType: 'payment',
    severity: 'error',
    tenantId,
    metadata: {
      gateway,
      transactionId
    }
  })
}

/**
 * Resolve an error in the database
 */
export async function resolveError(
  errorId: string,
  resolvedBy: string,
  notes?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('error_logs')
      .update({
        status: 'resolved',
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes
      })
      .eq('id', errorId)

    if (error) {
      console.error('[ErrorLogging] Failed to resolve error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[ErrorLogging] Error resolving error:', error)
    return false
  }
}

/**
 * Get error statistics for a time period
 */
export async function getErrorStats(
  days: number = 7
): Promise<{
  total: number
  bySeverity: Record<string, number>
  byType: Record<string, number>
  trend: { date: string; count: number }[]
}> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  try {
    // Get total count
    const { count: total } = await supabase
      .from('error_logs')
      .select('id', { count: 'exact', head: true })
      .gte('occurred_at', startDate.toISOString())

    // Get by severity
    const { data: severityData } = await supabase
      .from('error_logs')
      .select('severity')
      .gte('occurred_at', startDate.toISOString())

    const bySeverity: Record<string, number> = {}
    severityData?.forEach((row) => {
      bySeverity[row.severity] = (bySeverity[row.severity] || 0) + 1
    })

    // Get by type
    const { data: typeData } = await supabase
      .from('error_logs')
      .select('error_type')
      .gte('occurred_at', startDate.toISOString())

    const byType: Record<string, number> = {}
    typeData?.forEach((row) => {
      byType[row.error_type] = (byType[row.error_type] || 0) + 1
    })

    // Get daily trend
    const { data: trendData } = await supabase
      .from('error_logs')
      .select('occurred_at')
      .gte('occurred_at', startDate.toISOString())
      .order('occurred_at', { ascending: true })

    const trendMap: Record<string, number> = {}
    trendData?.forEach((row) => {
      const date = row.occurred_at.split('T')[0]
      trendMap[date] = (trendMap[date] || 0) + 1
    })

    const trend = Object.entries(trendMap).map(([date, count]) => ({
      date,
      count
    }))

    return {
      total: total || 0,
      bySeverity,
      byType,
      trend
    }
  } catch (error) {
    console.error('[ErrorLogging] Error getting stats:', error)
    return {
      total: 0,
      bySeverity: {},
      byType: {},
      trend: []
    }
  }
}

/**
 * Flush Sentry events (useful before process exit)
 */
export async function flushSentry(): Promise<void> {
  if (sentryInitialized) {
    await Sentry.flush(2000)
  }
}
