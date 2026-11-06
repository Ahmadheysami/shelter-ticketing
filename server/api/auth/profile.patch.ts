import { staffProfileSchema } from '../../../shared/validation'
import { completeStaffProfile } from '../../services/auth.service'
import { defineApiHandler, readJsonBody, requireAuth } from '../../utils/http'

// Staff complete the identity that was intentionally left blank at creation.
export default defineApiHandler(async (event, context) => {
  const auth = requireAuth(context)
  const input = await readJsonBody(event, staffProfileSchema)
  await completeStaffProfile({
    userId: auth.user.id,
    name: input.name,
    email: input.email,
    ipHash: context.ipHash,
  })
  return { data: { success: true } }
})
