import { permissionsFor } from '../../../shared/domain'
import type { MeResponse } from '../../../shared/types/api'
import { toCurrentUser } from '../../services/auth.service'
import { defineApiHandler } from '../../utils/http'

export default defineApiHandler(async (_event, context): Promise<{ data: MeResponse }> => {
  if (!context.auth) {
    return { data: { user: null, permissions: [], mfaSatisfied: false, session: null } }
  }
  const { user, session } = context.auth
  return {
    data: {
      user: toCurrentUser(user, user.mfaEnabled),
      permissions: [...permissionsFor(user.role)],
      mfaSatisfied: session.mfaSatisfied,
      session: {
        id: session.id,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      },
    },
  }
})
