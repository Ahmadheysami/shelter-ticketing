import { describe, expect, it } from 'vitest'
import { resolveSqlitePath } from '../../server/utils/sqlite-path'

describe('SQLite path resolution', () => {
  it('resolves relative paths from the project root', () => {
    expect(resolveSqlitePath('file:./data/app.db', '/srv/ticketing')).toBe(
      '/srv/ticketing/data/app.db',
    )
  })

  it('resolves relative paths from the project root when preview runs in .output', () => {
    expect(resolveSqlitePath('file:./data/app.db', '/srv/ticketing/.output')).toBe(
      '/srv/ticketing/data/app.db',
    )
  })

  it('keeps absolute paths unchanged', () => {
    expect(resolveSqlitePath('file:/var/lib/ticketing/app.db', '/srv/ticketing')).toBe(
      '/var/lib/ticketing/app.db',
    )
    expect(resolveSqlitePath('file:///var/lib/ticketing/app.db', '/srv/ticketing')).toBe(
      '/var/lib/ticketing/app.db',
    )
  })

  it('rejects non-file URLs and empty paths', () => {
    expect(() => resolveSqlitePath('libsql://example.turso.io')).toThrow(/local SQLite/)
    expect(() => resolveSqlitePath('file:')).toThrow(/empty SQLite path/)
  })
})
