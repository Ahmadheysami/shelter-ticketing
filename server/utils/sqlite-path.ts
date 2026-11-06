import { basename, dirname, isAbsolute, resolve } from 'node:path'

/**
 * Resolves a `file:` URL to an absolute SQLite path.
 *
 * Relative paths are resolved against the project root, not the current
 * working directory. `nuxt preview` starts the compiled server with its
 * working directory set to `.output`, while Prisma CLI migrations resolve
 * `file:./data/app.db` from the project root. Without this adjustment,
 * preview would silently open an empty database inside `.output`.
 */
export function resolveSqlitePath(url: string, cwd = process.cwd()): string {
  if (!url.startsWith('file:')) {
    throw new Error('DATABASE_URL must point to a local SQLite file (file:...)')
  }

  // Accept file:./data/app.db, file:/var/lib/app.db, and file:///var/lib/app.db.
  const withoutScheme = url.slice('file:'.length)
  const queryIndex = withoutScheme.search(/[?#]/)
  const pathPart = queryIndex === -1 ? withoutScheme : withoutScheme.slice(0, queryIndex)
  const normalizedPath = pathPart.startsWith('//') ? pathPart.slice(2) : pathPart
  if (!normalizedPath) throw new Error('DATABASE_URL points to an empty SQLite path')

  const projectRoot = basename(cwd) === '.output' ? dirname(cwd) : cwd
  return isAbsolute(normalizedPath) ? normalizedPath : resolve(projectRoot, normalizedPath)
}
