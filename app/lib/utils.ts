import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Returns a path that is safe to navigate to after authentication.
 *
 * Only same-origin absolute paths are accepted. Backslashes and control
 * characters are rejected too because browsers may normalize `/\evil.test`
 * into a protocol-relative URL.
 */
export function safeInternalPath(
  value: unknown,
  fallback: string,
  options: { prefix?: string } = {},
): string {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  if (value.includes('\\')) return fallback
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code < 32 || code === 127) return fallback
  }
  if (
    options.prefix &&
    value !== options.prefix &&
    !value.startsWith(`${options.prefix}/`)
  ) {
    return fallback
  }
  return value
}
