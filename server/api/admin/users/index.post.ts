import { setResponseStatus } from 'h3'
import { createStaffUser } from '../../../services/admin.service'
import {
  defineApiHandler,
  requirePermission,
  requireStepUp,
} from '../../../utils/http'

export default defineApiHandler(async (event, context) => {
  const auth = requirePermission(context, 'users:roles')
  requireStepUp(context)
  // The server generates the secret; the request carries no credentials.
  const created = await createStaffUser(auth.user, context.ipHash)
  setResponseStatus(event, 201)
  return { data: created }
})
