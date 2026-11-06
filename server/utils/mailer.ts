import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import nodemailer from 'nodemailer'
import { randomToken } from './crypto'
import { getServerEnv } from './env'

// Email is optional. Without SMTP configuration the application never claims
// delivery succeeded; in development the message is printed for testing.

export interface MailMessage {
  to: string
  subject: string
  text: string
  html: string
}

export interface MailResult {
  delivered: boolean
  reason?: 'not_configured' | 'send_failed'
}

type MailTransporter = ReturnType<typeof nodemailer.createTransport>

let transporter: MailTransporter | null = null

function getTransporter(): MailTransporter | null {
  const env = getServerEnv()
  if (!env.smtp) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth:
        env.smtp.user && env.smtp.password
          ? { user: env.smtp.user, pass: env.smtp.password }
          : undefined,
    })
  }
  return transporter
}

/**
 * Writes development mail to a gitignored outbox instead of stdout. Email
 * bodies contain single-use verification/reset tokens, so they must never be
 * written to application logs.
 */
async function writeDevelopmentOutbox(message: MailMessage): Promise<void> {
  try {
    const directory = join(process.cwd(), '.data', 'mail-outbox')
    await mkdir(directory, { recursive: true })
    const file = join(directory, `${Date.now()}-${randomToken(6)}.eml`)
    const content = [
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      '',
      message.text,
      '',
      message.html,
    ].join('\n')
    await writeFile(file, content, 'utf8')
    console.info(`[mail:not-configured] Development message written to ${file}`)
  } catch (error) {
    console.warn(
      '[mail:not-configured] Could not write the development outbox:',
      error instanceof Error ? error.message : 'unknown error',
    )
  }
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const env = getServerEnv()
  const transport = getTransporter()
  if (!transport) {
    if (env.isProduction) {
      console.warn('[mail:not-configured] Email delivery is not configured; message dropped.')
    } else if (process.env.NODE_ENV !== 'test') {
      await writeDevelopmentOutbox(message)
    }
    return { delivered: false, reason: 'not_configured' }
  }
  try {
    await transport.sendMail({
      from: env.smtp!.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    })
    return { delivered: true }
  } catch (error) {
    console.warn('[mail:send_failed]', error instanceof Error ? error.message : 'unknown error')
    return { delivered: false, reason: 'send_failed' }
  }
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escapes user-controlled values before they are inserted into HTML email. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]!)
}

export function verificationEmail(name: string, url: string): MailMessage['html'] {
  return `
    <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.9;color:#0f172a">
      <h2>تأیید ایمیل</h2>
      <p>${escapeHtml(name)} عزیز، برای تأیید ایمیل حساب خود روی لینک زیر بزنید:</p>
      <p><a href="${escapeHtml(url)}">تأیید آدرس ایمیل</a></p>
      <p style="color:#64748b;font-size:13px">این لینک تا ۲۴ ساعت اعتبار دارد. اگر این درخواست از سوی شما نبوده است، نادیده بگیرید.</p>
    </div>`
}
