export interface ApiErrorPayload {
  code: string
  message: string
  fields?: Record<string, string>
}

export class ApiClientError extends Error {
  readonly code: string
  readonly status: number
  readonly fields?: Record<string, string>

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = payload.code
    this.fields = payload.fields
  }
}

export function getCsrfToken(): string {
  if (import.meta.server) return ''
  const match = document.cookie.match(/(?:^|;\s*)tm_csrf=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

type FetchOptions = Parameters<typeof $fetch>[1]

/**
 * Client-side API helper. Adds the double-submit CSRF header and converts every
 * failure into an ApiClientError with a stable code and optional field errors.
 */
export async function apiFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
  try {
    const response = await $fetch<{ data: T }>(url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        ...(options?.headers as Record<string, string> | undefined),
        'x-csrf-token': getCsrfToken(),
      },
    })
    return response.data
  } catch (error: unknown) {
    const fetchError = error as {
      statusCode?: number
      status?: number
      data?: { error?: ApiErrorPayload }
    }
    const status = fetchError.statusCode ?? fetchError.status ?? 0
    const payload = fetchError.data?.error
    if (payload) throw new ApiClientError(status, payload)
    throw new ApiClientError(status, {
      code: 'NETWORK',
      message: 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.',
    })
  }
}

export function fieldError(error: unknown, field: string): string | undefined {
  if (error instanceof ApiClientError) return error.fields?.[field]
  return undefined
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message
  return 'خطای غیرمنتظره‌ای رخ داد.'
}
