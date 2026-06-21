import OpenAI from 'openai'

let _client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')
    _client = new OpenAI({ apiKey })
  }
  return _client
}

interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    return [429, 500, 502, 503, 504].includes(error.status)
  }
  if (error instanceof Error) {
    return error.message.includes('ECONNRESET') ||
           error.message.includes('ETIMEDOUT') ||
           error.message.includes('fetch failed')
  }
  return false
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs } = { ...DEFAULT_RETRY, ...config }

  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error
      }

      const jitter = Math.random() * 0.3 + 0.85
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt) * jitter, maxDelayMs)

      if (error instanceof OpenAI.APIError && error.status === 429) {
        const retryAfter = error.headers?.['retry-after']
        if (retryAfter) {
          const retryMs = parseInt(retryAfter, 10) * 1000
          if (!isNaN(retryMs)) {
            await sleep(Math.min(retryMs, maxDelayMs))
            continue
          }
        }
      }

      console.warn(`[OpenAI] Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`, {
        error: error instanceof Error ? error.message : 'unknown',
      })
      await sleep(delay)
    }
  }
  throw lastError
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
