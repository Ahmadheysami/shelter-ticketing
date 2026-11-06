import { userListQuerySchema } from '../../../../shared/validation'
import { listUsers } from '../../../services/admin.service'
import {
  defineApiHandler,
  parseQuery,
  requirePermission,
} from '../../../utils/http'

export default defineApiHandler(async (event, context) => {
  const auth = requirePermission(context, 'users:read')
  const query = parseQuery(event, userListQuerySchema)
  const data = await listUsers(auth.user, query)
  return { data }
})
