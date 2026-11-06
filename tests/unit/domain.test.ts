import { describe, expect, it } from 'vitest'
import {
  can,
  canRequesterTransition,
  canStaffTransition,
  isStaff,
  permissionsFor,
  ticketReference,
} from '../../shared/domain'

describe('permission matrix', () => {
  it('grants users only their own ticket capabilities', () => {
    expect(can('USER', 'tickets:create')).toBe(true)
    expect(can('USER', 'tickets:read:own')).toBe(true)
    expect(can('USER', 'tickets:read:all')).toBe(false)
    expect(can('USER', 'tickets:note:internal')).toBe(false)
    expect(can('USER', 'users:manage')).toBe(false)
    expect(can('USER', 'audit:read')).toBe(false)
  })

  it('keeps owner-only capabilities out of the admin role', () => {
    expect(can('ADMIN', 'tickets:manage')).toBe(true)
    expect(can('ADMIN', 'users:read')).toBe(true)
    expect(can('ADMIN', 'users:roles')).toBe(false)
    expect(can('ADMIN', 'audit:read')).toBe(false)
    expect(can('ADMIN', 'security:manage')).toBe(false)
  })

  it('gives the owner the full set without duplicates', () => {
    const permissions = permissionsFor('OWNER')
    expect(permissions).toContain('audit:read')
    expect(new Set(permissions).size).toBe(permissions.length)
    expect(isStaff('OWNER')).toBe(true)
    expect(isStaff('USER')).toBe(false)
  })
})

describe('ticket workflow', () => {
  it('allows documented staff transitions and rejects invalid ones', () => {
    expect(canStaffTransition('OPEN', 'IN_PROGRESS')).toBe(true)
    expect(canStaffTransition('OPEN', 'RESOLVED')).toBe(true)
    expect(canStaffTransition('RESOLVED', 'IN_PROGRESS')).toBe(true)
    expect(canStaffTransition('CLOSED', 'OPEN')).toBe(true)
    expect(canStaffTransition('CLOSED', 'IN_PROGRESS')).toBe(false)
    expect(canStaffTransition('CLOSED', 'RESOLVED')).toBe(false)
  })

  it('limits requester reopen to the 14-day window', () => {
    const now = new Date('2026-06-20T12:00:00Z')
    const recent = new Date('2026-06-18T12:00:00Z')
    const old = new Date('2026-05-01T12:00:00Z')

    expect(canRequesterTransition('RESOLVED', 'OPEN', null, recent, now)).toBe(true)
    expect(canRequesterTransition('CLOSED', 'OPEN', recent, null, now)).toBe(true)
    expect(canRequesterTransition('RESOLVED', 'OPEN', null, old, now)).toBe(false)
    expect(canRequesterTransition('OPEN', 'OPEN', null, null, now)).toBe(false)
    expect(canRequesterTransition('OPEN', 'CLOSED', null, null, now)).toBe(true)
    expect(canRequesterTransition('IN_PROGRESS', 'RESOLVED', null, null, now)).toBe(false)
  })

  it('formats a stable public reference', () => {
    expect(ticketReference(1)).toBe('TK-00001')
    expect(ticketReference(12345)).toBe('TK-12345')
  })
})
