// Domain-level errors that map to stable HTTP responses. Kept separate from h3
// so services can be unit/integration tested without a server event.

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export function apiError(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
): never {
  throw new ApiError(status, code, message, fields)
}
