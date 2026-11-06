import { useDb } from '../../server/utils/db'

export async function resetDatabase(): Promise<void> {
  const db = useDb()
  await db.auditLog.deleteMany()
  await db.ticketMessage.deleteMany()
  await db.ticket.deleteMany()
  await db.recoveryCode.deleteMany()
  await db.mfaCredential.deleteMany()
  await db.passwordResetToken.deleteMany()
  await db.emailVerificationToken.deleteMany()
  await db.session.deleteMany()
  await db.user.deleteMany()
}
