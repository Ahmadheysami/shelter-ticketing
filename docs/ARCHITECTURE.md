# معماری تیکت‌یار

این سند معماری واقعی پیاده‌سازی‌شده را توصیف می‌کند. هدف، مرزبندی روشن بین
UI، HTTP، قواعد کسب‌وکار، احراز هویت و داده است.

## نمای کلی

```text
Browser (Vue 3 / Nuxt)
  │  HTML + hydration payload (SSR)
  │  fetch JSON + CSRF header
  │  Socket.IO (same-origin, session cookie)
  ▼
Nitro server
  ├─ server/middleware/00-security.ts   headers, CSRF cookie, coarse IP limit
  ├─ server/api/**                      thin HTTP adapters
  ├─ server/services/**                 authorization + use cases + Prisma
  ├─ server/utils/**                    session, crypto, MFA, audit, realtime
  └─ server/plugins/**                  env validation, Socket.IO attachment
  ▼
Prisma 7 + better-sqlite3
  ▼
data/app.db (SQLite)
```

Nuxt در حالت SSR اجرا می‌شود. صفحات عمومی (landing، ورود، ثبت‌نام) HTML
قابل crawl تولید می‌کنند؛ صفحات خصوصی با `X-Robots-Tag` و middleware
مسیر محافظت می‌شوند.

## مرزها و مسئولیت‌ها

| مسیر | مسئولیت |
| --- | --- |
| `app/pages` | routeها و composition صفحه؛ بدون دسترسی مستقیم به دیتابیس |
| `app/components` | UI خالص و کامپوننت‌های دامنه‌ای |
| `app/composables` | وضعیت مشترک کلاینت، fetch، realtime، theme، toast |
| `app/layouts` | layout عمومی، auth، داشبورد |
| `app/middleware` | redirectهای UX؛ جایگزین authorization سرور نیست |
| `server/api` | parse ورودی، فراخوانی service، تبدیل خروجی به DTO |
| `server/services` | قواعد کسب‌وکار، مجوز، تراکنش و audit |
| `server/utils` | session، رمز، MFA، rate limit، mail، realtime، env |
| `shared` | انواع دامنه، ماتریس مجوز، schemaهای Zod و DTOهای API |
| `prisma` | schema، migration، seed و client تولیدشده |
| `tests` | unit، integration و e2e |

**درباره `server/repositories`:** لایه repository جداگانه ساخته نشد. کوئری‌های
Prisma در serviceها متمرکزند و هر use case مرز تراکنش و مجوز خود را دارد.
افزودن یک لایه پاس‌دهنده بدون نیاز واقعی، پیچیدگی بی‌فایده ایجاد می‌کرد.
اگر دیتابیس یا تعداد مصرف‌کننده‌ها رشد کند، استخراج repositoryها گام طبیعی
بعدی است.

## جریان یک درخواست API

هر route با `defineApiHandler` بسته می‌شود:

1. `requestId` تصادفی برای correlation در log ساخته می‌شود.
2. اگر متد تغییردهنده باشد، `Origin` با `APP_URL` مقایسه می‌شود.
3. توکن CSRF از کوکی `tm_csrf` و هدر `x-csrf-token` مقایسه می‌شود.
4. نشست از کوکی `tm_session` خوانده، هش آن در دیتابیس جستجو و انقضا/ابطال
   بررسی می‌شود.
5. `requireAuth` / `requirePermission` / `requireStepUp` مجوز را اعمال
   می‌کند.
6. handler ورودی را با Zod parse می‌کند (بدنه حداکثر ۶۴KB) و service را
   صدا می‌زند.
7. پاسخ موفق `{ data: ... }` و خطا `{ error: { code, message, fields? } }`
   است. خطاهای ناشناخته فقط پیام عمومی برمی‌گردانند و جزئیات در log سرور
   می‌ماند.

`requireAuth` به‌طور پیش‌فرض نشستِ واردشده اما تأییدنشده را مسدود می‌کند:

- `MFA_SETUP_REQUIRED`: فقط برای حساب‌های قدیمی کارکنان بدون کلید امنیتی.
- `MFA_REQUIRED`: نشست کاربر عادی که چالش دومرحله‌ای را تأیید نکرده است.

## احراز هویت و نشست

- رمز کاربران با Argon2id (`@node-rs/argon2`) هش می‌شود.
- کارکنان (`ADMIN`/`OWNER`) فقط با کلید امنیتی وارد می‌شوند؛ کلید با
  SHA-256 در `User.staffSecretHash` ذخیره و با lookup مستقیم پیدا می‌شود.
- توکن نشست ۳۲ بایت تصادفی است؛ فقط SHA-256 آن در `Session.tokenHash`
  ذخیره می‌شود.
- TTL همه نشست‌ها یک ساعت است و نشست منقضی در سرور رد می‌شود. چالش MFA
  ۱۵ دقیقه اعتبار دارد و پس از تأیید، نشست یک‌ساعته می‌شود.
- `mfaSatisfied` و `reauthenticatedAt` روی نشست نگهداری می‌شوند.
- نشست در logout، تغییر رمز، reset رمز و اقدامات مدیریتی مرتبط باطل می‌شود.
- ورود مجدد با `previousToken` نشست قبلی همان مرورگر را باطل می‌کند.
- کوکی‌ها: `tm_session` (HttpOnly, SameSite=Lax, Secure در production) و
  `tm_csrf` (قابل خواندن توسط JS برای double-submit).

مسیرهای auth:

- `POST /api/auth/register` — همیشه پاسخ یکسان، بدون انتخاب نقش
- `POST /api/auth/login` — فقط کاربران عادی؛ پیام خطای عمومی
- `POST /api/auth/staff-login` — ورود مدیر/مالک با کلید امنیتی
- `PATCH /api/auth/profile` — تکمیل نام/ایمیل کارکنان
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/mfa/setup`، `enable`، `verify`، `disable`
- `POST /api/auth/reauth` — step-up
- `POST /api/auth/change-password`
- `POST /api/auth/forgot-password`، `reset-password`
- `POST /api/auth/verify-email`، `resend-verification`
- `GET /api/auth/sessions`، `DELETE /api/auth/sessions/:id`

## مدل داده

SQLite در Prisma از enum پشتیبانی نمی‌کند؛ بنابراین role، status،
priority، category و visibility به‌صورت `String` ذخیره و در
`shared/domain.ts` و Zod اعتبارسنجی می‌شوند. این تصمیم در همه مرزها یکسان
اعمال می‌شود.

| مدل | فیلدهای کلیدی | نکته |
| --- | --- | --- |
| `User` | `id` cuid، `email` unique، `passwordHash`، `staffSecretHash` unique، `profileCompletedAt`، `role`، `status` | حذف سخت کاربر استفاده نمی‌شود |
| `Session` | `tokenHash` unique، `userId`، `mfaSatisfied`، `expiresAt`، `revokedAt` | هش توکن، نه توکن خام |
| `MfaCredential` | `userId` unique، `secretCiphertext`، `confirmedAt` | secret با AES-256-GCM رمز می‌شود |
| `RecoveryCode` | `codeHash` unique، `usedAt` | یک‌بارمصرف |
| `PasswordResetToken` | `tokenHash` unique، `expiresAt`، `usedAt` | TTL یک ساعت |
| `EmailVerificationToken` | `tokenHash` unique، `expiresAt`، `usedAt` | TTL ۲۴ ساعت |
| `Ticket` | `id` autoincrement، `subject`، `description`، `status`، `priority`، `requesterId`، `assigneeId` | شماره عمومی از id ساخته می‌شود |
| `TicketMessage` | `ticketId`، `authorId`، `body`، `visibility` | `PUBLIC` یا `INTERNAL` |
| `AuditLog` | `actorId`، `action`، `entityType`، `entityId`، `metadata`، `ipHash` | metadata پاک‌سازی‌شده |

روابط حساس:

- `Ticket.requester` با `onDelete: Restrict` از حذف کاربری که تیکت دارد
  جلوگیری می‌کند.
- `Ticket.assignee` با `onDelete: SetNull` تیکت را با حذف مدیر orphan
  نمی‌کند.
- `TicketMessage.ticket` با `onDelete: Cascade` است.
- `AuditLog.actor` با `onDelete: SetNull` تاریخچه را حفظ می‌کند.

ایندکس‌ها برای صف‌های رایج اضافه شده‌اند: `(assigneeId, status)`،
`(status, priority, updatedAt)`، `(requesterId, updatedAt)`،
`(createdAt)` و ایندکس‌های audit/action.

## ماتریس مجوز

مجوزها در `shared/domain.ts` تعریف شده‌اند و سرور از `can(role, permission)`
استفاده می‌کند. پنهان‌کردن UI مجوز نیست.

| مجوز | USER | ADMIN | OWNER |
| --- | :---: | :---: | :---: |
| `tickets:create` | ✓ | ✓ | ✓ |
| `tickets:read:own` | ✓ | ✓ | ✓ |
| `tickets:reply:public` | ✓ | ✓ | ✓ |
| `tickets:read:all` | — | ✓ | ✓ |
| `tickets:note:internal` | — | ✓ | ✓ |
| `tickets:manage` | — | ✓ | ✓ |
| `dashboard:admin` | — | ✓ | ✓ |
| `users:read` / `users:manage` | — | ✓ | ✓ |
| `users:roles` | — | — | ✓ |
| `audit:read` | — | — | ✓ |
| `security:manage` | — | — | ✓ |
| `sessions:read:all` | — | — | ✓ |

علاوه بر نقش، هر تیکت و پیام به‌صورت object-level بررسی می‌شود:
`requesterId === actor.id` یا نقش کارکنی. یادداشت داخلی فقط برای کارکنان
قابل مشاهده و ایجاد است. تلاش برای خواندن تیکت دیگران با ۴۰۴/۴۰۳ پاسخ
داده می‌شود، نه با نشت وجود رکورد.

## چرخه وضعیت

قواعد در `shared/domain.ts` متمرکز شده‌اند:

| از | مقصدهای مجاز کارکنان |
| --- | --- |
| `OPEN` | `IN_PROGRESS`، `WAITING_FOR_USER`، `RESOLVED`، `CLOSED` |
| `IN_PROGRESS` | `OPEN`، `WAITING_FOR_USER`، `RESOLVED`، `CLOSED` |
| `WAITING_FOR_USER` | `OPEN`، `IN_PROGRESS`، `RESOLVED`، `CLOSED` |
| `RESOLVED` | `OPEN`، `IN_PROGRESS`، `CLOSED` |
| `CLOSED` | `OPEN` |

قواعد کاربر:

- کاربر می‌تواند تیکت غیربسته را ببندد (cancel).
- بازگشایی `RESOLVED`/`CLOSED` فقط تا ۱۴ روز پس از `closedAt` یا
  `resolvedAt` مجاز است.
- با بازگشایی، `closedAt` و `resolvedAt` پاک می‌شوند و وضعیت `OPEN`
  می‌شود.
- تغییر وضعیت، اولویت و تخصیص توسط کارکنان در audit ثبت می‌شود.
- ارسال پاسخ عمومی در تیکت `CLOSED` مجاز نیست.

## API تیکت و مدیریت

- `GET /api/tickets` — فیلتر status/priority/category/assignee/scope،
  جستجو، sort و pageSize حداکثر ۵۰
- `POST /api/tickets` — فقط نقش `USER`/کاربر مجاز؛ نقش از session
- `GET /api/tickets/:id` — جزئیات + پیام‌های مجاز + `can` flags
- `PATCH /api/tickets/:id` — تغییر status/priority/assignee برای staff یا
  close/reopen برای requester
- `POST /api/tickets/:id/messages` — پاسخ عمومی/یادداشت داخلی با مجوز
- `GET /api/dashboard/stats` — آمار شخصی واقعی
- `GET /api/admin/stats` — آمار بازه ۷ تا ۹۰ روز، trend و نرخ حل
- `GET /api/admin/tickets` — صف مدیریتی
- `GET/POST /api/admin/users`، `PATCH /api/admin/users/:id`
- `GET /api/admin/audit`، `GET /api/admin/sessions`
- `GET /api/health` — liveness ساده

هیچ endpoint فهرست بدون سقف وجود ندارد. آمار از `prisma.groupBy`/`count`
روی داده واقعی ساخته می‌شود و بازه زمانی را از query می‌گیرد.

## Real-time

Socket.IO روی همان HTTP server Nitro سوار می‌شود. Nitro 3/2 هوک `listen`
ندارد، بنابراین `server/plugins/02-socket.ts` از هوک `request` استفاده
می‌کند و server را از `event.node.req.socket.server` می‌گیرد. اتصال با
`Symbol` روی server علامت‌گذاری می‌شود تا HMR باعث اتصال تکراری نشود.

جریان:

1. کلاینت با کوکی نشست همان origin وصل می‌شود.
2. `allowRequest` origin را بررسی می‌کند.
3. middleware سوکت توکن را از cookie می‌خواند، session را از دیتابیس
   می‌گیرد، وضعیت `ACTIVE` و `mfaSatisfied` را بررسی می‌کند.
4. کاربر به room شخصی `user:<id>` می‌پیوندد.
5. برای `ticket:subscribe`، شناسه عددی validate و دسترسی با
   `canAccessTicket` بررسی می‌شود؛ سپس `ticket:<id>` join می‌شود.
6. رویدادهای `ticket:subscribe` rate-limit دارند (۶۰ در دقیقه برای هر
   سوکت).

سمت سرور، ابتدا تراکنش دیتابیس commit می‌شود و سپس
`emitTicketEvent` رویداد `ticket:changed` را به room تیکت، room درخواست‌کننده
و room assignee می‌فرستد. هیچ event خصوصی به room عمومی broadcast نمی‌شود.

کلاینت (`app/composables/useRealtime.ts`) پس از هر رویداد، داده معتبر را
دوباره از API می‌گیرد. Socket منبع حقیقت نیست؛ reconnect و event گم‌شده با
refetch جبران می‌شوند. logout و تغییر نقش/رمز، سوکت‌های کاربر را قطع
می‌کنند.

## امنیت لایه‌ها

- `server/middleware/00-security.ts` هدرهای امنیتی، CSP، HSTS تولیدی،
  کوکی CSRF و rate limit عمومی API (۳۰۰ درخواست در دقیقه به ازای IP هش‌شده)
  را اعمال می‌کند.
- `server/utils/http.ts` مرز CSRF/Origin/auth/validation/error است.
- `server/services` تنها لایه‌ای است که تصمیم مجوز حساس می‌گیرد.
- `server/utils/audit.ts` کلیدهای حساس را حذف و رشته‌های طولانی را کوتاه
  می‌کند.

## تصمیم‌های مهم

| تصمیم | دلیل |
| --- | --- |
| Nuxt 4 به‌جای Nuxt 3 | نسخه stable فعلی و سازگار با Vue 3.5 |
| npm به‌جای pnpm | repository از قبل `package-lock.json` داشت |
| کامپوننت‌های محلی با `reka-ui` | کنترل کامل RTL/دسترس‌پذیری و سازگاری Nuxt؛ shadcn-vue React استفاده نشد |
| SQLite + Prisma adapter | استقرار ساده و migration واقعی؛ محدودیت concurrency مستند شد |
| session cookie به‌جای JWT مرورگری | ابطال فوری و rotation ساده‌تر |
| TOTP + recovery codes | بدون وابستگی به سرویس خارجی و قابل self-host |
| Socket.IO فقط به‌عنوان delivery | جلوگیری از ناسازگاری و نشت داده |
| `id` عددی تیکت + `TK-xxxxx` | سازگاری SQLite autoincrement و شناسه خوانا |

## مقیاس‌پذیری

معماری فعلی برای یک Node instance و SQLite طراحی شده است. برای چند
instance باید:

1. rate limit به store مشترک (Redis) منتقل شود.
2. Socket.IO adapter مشترک اضافه شود.
3. SQLite با PostgreSQL جایگزین شود.
4. session store مشترک یا دیتابیس مشترک تضمین شود.

هیچ‌کدام از این‌ها ادعا نمی‌شود که پیاده‌سازی شده‌اند.
