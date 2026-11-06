import { useDb } from '../../utils/db'
import { defineApiHandler, requirePermission } from '../../utils/http'

export default defineApiHandler(async (_event, context) => {
  requirePermission(context, 'users:read')
  const staff = await useDb().user.findMany({
    where: { role: { in: ['ADMIN', 'OWNER'] }, status: 'ACTIVE' },
    orderBy: { name: 'asc' },
    take: 50,
    select: { id: true, name: true, role: true },
  })
  return { data: { staff } }
})
