import { getRouterParam } from 'h3'
import { updateUserSchema } from '../../../../shared/validation'
import { updateUserByAdmin } from '../../../services/admin.service'
import { apiError } from '../../../utils/errors'
import {
  defineApiHandler,
  enforceRateLimit,
  readJsonBody,
  requirePermission,
  requireStepUp,
} from '../../../utils/http'

export default defineApiHandler(async (event, context) => {
  const auth = requirePermission(context, 'users:manage')
  enforceRateLimit(event, `admin:user-update:${auth.user.id}`, 30, 10 * 60 * 1000)
  const targetId = getRouterParam(event, 'id')
  if (!targetId) apiError(404, 'USER_NOT_FOUND', 'کاربر یافت نشد.')
  const input = await readJsonBody(event, updateUserSchema)

  if (input.role !== undefined) requirePermission(context, 'users:roles')
  // Suspending/activating an account and changing a role are both critical
  // administrative actions; require a fresh re-authentication for either.
  requireStepUp(context)

  const result = await updateUserByAdmin(auth.user, targetId, input, context.ipHash)
  return { data: { success: true, ...result } }
})
