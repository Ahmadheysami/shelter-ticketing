// Audit trail writer. Metadata is filtered so credentials, tokens, and MFA
// secrets can never reach the database or the audit UI.

const SENSITIVE_KEY = /pass(word)?|token|secret|code|cookie|authorization|credential/i

export interface AuditEntry {
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | number | null
  metadata?: Record<string, unknown> | null
  ipHash?: string | null
}

/** Structural subset of PrismaClient, so it also accepts a transaction client. */
export interface AuditWriter {
  auditLog: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>
  }
}

export function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY.test(key)) continue
    if (typeof value === 'string' && value.length > 500) {
      safe[key] = `${value.slice(0, 500)}…`
      continue
    }
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
      safe[key] = value
    }
  }
  return JSON.stringify(safe)
}

export async function writeAudit(writer: AuditWriter, entry: AuditEntry): Promise<void> {
  await writer.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ? String(entry.entityId) : null,
      metadata: sanitizeMetadata(entry.metadata),
      ipHash: entry.ipHash ?? null,
    },
  })
}
