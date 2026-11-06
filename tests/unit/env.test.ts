import { describe, expect, it } from 'vitest'
import { isLocalAppUrl, isLocalOriginAllowed } from '../../server/utils/env'

describe('local app URL detection', () => {
  it('treats loopback hosts as local', () => {
    expect(isLocalAppUrl('http://localhost:3000')).toBe(true)
    expect(isLocalAppUrl('http://127.0.0.1:3000')).toBe(true)
    expect(isLocalAppUrl('http://[::1]:3000')).toBe(true)
  })

  it('treats public hosts as remote', () => {
    expect(isLocalAppUrl('https://support.example.com')).toBe(false)
    expect(isLocalAppUrl('http://localhost.example.com')).toBe(false)
    expect(isLocalAppUrl('not a url')).toBe(false)
  })

  it('accepts loopback origins only when APP_URL is loopback', () => {
    expect(isLocalOriginAllowed('http://127.0.0.1:3000', 'http://localhost:3000')).toBe(true)
    expect(isLocalOriginAllowed('http://localhost:3100', 'http://localhost:3000')).toBe(true)
    expect(isLocalOriginAllowed('http://[::1]:3000', 'http://localhost:3000')).toBe(true)
    expect(isLocalOriginAllowed('http://127.0.0.1:3000', 'https://support.example.com')).toBe(
      false,
    )
    expect(isLocalOriginAllowed('http://localhost.evil.example', 'http://localhost:3000')).toBe(
      false,
    )
  })
})
