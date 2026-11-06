import { describe, expect, it } from 'vitest'
import { safeInternalPath } from '../../app/lib/utils'
import { escapeHtml } from '../../server/utils/mailer'

describe('safeInternalPath', () => {
  it('keeps same-origin absolute paths', () => {
    expect(safeInternalPath('/dashboard', '/login')).toBe('/dashboard')
    expect(safeInternalPath('/tickets/12?tab=reply', '/login')).toBe('/tickets/12?tab=reply')
  })

  it('rejects protocol-relative, absolute, and backslash-normalized URLs', () => {
    expect(safeInternalPath('//evil.example', '/login')).toBe('/login')
    expect(safeInternalPath('https://evil.example', '/login')).toBe('/login')
    expect(safeInternalPath('/\\evil.example', '/login')).toBe('/login')
    expect(safeInternalPath('/path\nHeader: value', '/login')).toBe('/login')
    expect(safeInternalPath(undefined, '/login')).toBe('/login')
  })

  it('supports a required path prefix', () => {
    expect(safeInternalPath('/admin/users', '/admin', { prefix: '/admin' })).toBe('/admin/users')
    expect(safeInternalPath('/dashboard', '/admin', { prefix: '/admin' })).toBe('/admin')
    expect(safeInternalPath('/administrator', '/admin', { prefix: '/admin' })).toBe('/admin')
  })
})

describe('HTML email escaping', () => {
  it('escapes user-controlled markup before it enters an email body', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    )
    expect(escapeHtml(`Tom & "Jerry" 'test'`)).toBe(
      'Tom &amp; &quot;Jerry&quot; &#39;test&#39;',
    )
  })
})
