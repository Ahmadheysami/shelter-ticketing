# Project Brief & Execution Context

## نقش تو

تو یک تیم مهندسی محصول و نرم‌افزار هستی که باید یک سامانه تیکتینگ واقعی،
امن، قابل توسعه و آماده استقرار بسازی؛ نه صرفاً یک UI نمایشی. مانند یک
Senior Full-Stack Engineer، Security Engineer، UI/UX Designer، Database
Designer و QA عمل کن. قبل از تغییرات، فایل `AGENTS.md` را کامل بخوان و
در تمام مراحل رعایت کن.

## هدف محصول

ساخت یک سامانه مدیریت درخواست و پشتیبانی (Ticket Management System) برای
کاربرانی که می‌خواهند مشکلات، درخواست‌ها و سوالات خود را ثبت و پیگیری
کنند. کاربر باید حساب کاربری داشته باشد، وارد شود و سپس درخواست‌های خودش
را مدیریت کند. مدیران از پنل مدیریت درخواست‌ها را بررسی، دسته‌بندی، ارجاع،
پاسخ‌دهی و تعیین وضعیت می‌کنند. مالک اصلی سیستم (`OWNER`) کنترل کامل
مدیریتی و امنیتی دارد.

کیفیت معماری، امنیت، عملکرد واقعی امکانات، تجربه کاربری، تست‌پذیری،
مستندات و قابلیت توسعه از سرعت تولید کد مهم‌تر هستند.

## پشته فنی اجباری

-   Nuxt 3 + Vue 3 + TypeScript + Nitro
-   Tailwind CSS
-   shadcn-vue (نسخه/پکیج سازگار با Vue و Nuxt؛ منظور shadcn مخصوص React
    نیست)
-   Prisma ORM
-   SQLite
-   Socket.IO برای به‌روزرسانی‌های لحظه‌ای
-   اعتبارسنجی سمت سرور با Zod یا Valibot
-   تست واحد، یکپارچه‌سازی و E2E متناسب با معماری

از pnpm استفاده کن، مگر اینکه repository از قبل package manager دیگری
داشته باشد. نسخه پکیج‌ها را با سازگاری Nuxt و یکدیگر بررسی کن؛ نصب
کورکورانه و استفاده از پکیج‌های منسوخ ممنوع است.

## دستور مهم درباره Skillها

قبل از پیاده‌سازی، فهرست Skillهای واقعاً در دسترس Freebuff را بررسی کن و
Skillهای مرتبط را پیدا کرده و دستورالعملشان را بخوان. در اولویت:

1.  Nuxt 3 / Vue 3 architecture و best practices
2.  TypeScript و clean architecture
3.  Tailwind CSS و shadcn-vue component design
4.  Prisma ORM و SQLite data modeling / migrations
5.  Web application security، authentication، authorization و OWASP
6.  Session management، MFA/TOTP و secure cookies
7.  Socket.IO، realtime architecture و event authorization
8.  SEO فنی Nuxt و SSR
9.  Accessibility و responsive design
10. Automated testing، Playwright، API integration testing و code review

اگر Skill مشخصی موجود نیست، نزدیک‌ترین Skill واقعی را انتخاب کن یا بدون
ادعای استفاده از Skill، مستندات رسمی و دانش فنی را مبنا قرار بده. نام
Skill خیالی نساز. در گزارش نهایی، Skillهای واقعاً استفاده‌شده را ذکر کن.

## تجربه و طراحی محصول

رابط کاربری باید مینیمال، مدرن، حرفه‌ای و در سطح داشبوردهای SaaS معتبر
باشد:

-   فضای سفید کافی، تایپوگرافی خوانا، مرزبندی ظریف، رنگ‌های محدود و
    هماهنگ
-   کامپوننت‌های یکپارچه و قابل استفاده مجدد
-   طراحی کاملاً Responsive برای موبایل، تبلت و دسکتاپ
-   حالت‌های Light و Dark در صورت پیاده‌سازی کامل و یکپارچه
-   دسترس‌پذیری: کنتراست مناسب، فوکوس واضح، پشتیبانی صفحه‌کلید، label و
    پیام خطای قابل فهم
-   skeleton، loading، empty state، error state و feedback مناسب
-   جدول‌های حرفه‌ای با فیلتر، جستجو، مرتب‌سازی و pagination
-   نمودارهای آماری واقعی با داده دیتابیس؛ استفاده از داده ساختگی در
    مسیر production ممنوع
-   طراحی RTL و زبان فارسی را از ابتدا قابل پشتیبانی در نظر بگیر؛ متن‌ها،
    جهت و فرمت تاریخ را به یک زبان یا جهت ثابت قفل نکن.

از شلوغی، گرادیان‌های افراطی، سایه‌های سنگین، انیمیشن‌های بی‌دلیل و کارت‌های
تکراری پرهیز کن.

## صفحات و جریان‌های اصلی

### 1. Landing Page عمومی

یک صفحه اصلی تمیز و حرفه‌ای برای معرفی سامانه بساز. کاربر در چند ثانیه
متوجه شود سامانه برای ثبت و پیگیری مشکلات و درخواست‌هاست.

بخش‌های پیشنهادی: - هدر ساده با لوگو/نام محصول و لینک ورود و ثبت‌نام -
Hero با تیتر روشن، توضیح کوتاه و CTA ثبت درخواست / ورود - معرفی مزایا:
ثبت ساختاریافته، پیگیری وضعیت، مکاتبه در یک مکان، پاسخ‌گویی شفاف - توضیح
روند کار در ۳ مرحله: ثبت‌نام، ثبت تیکت، پیگیری و دریافت پاسخ - معرفی
قابلیت‌ها بدون ادعاهای غیرواقعی - FAQ کوتاه - CTA پایانی و فوتر

SEO عمومی را رعایت کن: title، description، Open Graph، canonical و
ساختار heading معنایی. محتوای خصوصی نباید index شود.

### 2. ثبت‌نام و ورود

-   ثبت‌نام با اطلاعات ضروری و اعتبارسنجی دقیق
-   ورود امن و پیام خطای عمومی برای جلوگیری از تشخیص وجود حساب
-   خروج از حساب
-   فراموشی و بازیابی رمز عبور با توکن یک‌بارمصرف و منقضی‌شونده، در صورت
    پیاده‌سازی سرویس ارسال
-   تأیید ایمیل، در صورت فراهم بودن زیرساخت ارسال
-   MFA برای مدیران و به‌ویژه OWNER
-   مدیریت نشست‌ها و ابطال نشست‌ها
-   محدودیت تلاش و rate limit

در فرم ثبت‌نام هیچ گزینه‌ای برای انتخاب نقش ADMIN یا OWNER وجود نداشته
باشد.

### 3. داشبورد کاربر

-   خلاصه وضعیت تیکت‌ها و آمار شخصی واقعی
-   فهرست تیکت‌های اخیر
-   فیلتر وضعیت و اولویت
-   جستجو، مرتب‌سازی و pagination
-   دکمه واضح «ثبت تیکت جدید»
-   نمایش آخرین پاسخ و زمان به‌روزرسانی
-   دسترسی فقط به تیکت‌های مجاز همان کاربر

### 4. ثبت تیکت

فرم ثبت تیکت با جزئیات و UX مناسب: - عنوان کوتاه و واضح - دسته‌بندی
موضوع - شرح کامل مشکل با راهنمای نوشتن اطلاعات مفید - اولویت (LOW /
NORMAL / HIGH / URGENT) با توضیح اینکه اولویت فوری برای موارد واقعاً
اضطراری است - فایل پیوست اختیاری، فقط در صورت پیاده‌سازی امن - نمایش
خطاهای inline و خلاصه خطا - جلوگیری از ارسال چندباره و نمایش وضعیت ثبت -
پس از ثبت، نمایش شماره/شناسه تیکت و هدایت به جزئیات آن

### 5. جزئیات تیکت

-   مشخصات و وضعیت تیکت
-   تاریخ ایجاد و آخرین به‌روزرسانی
-   مکالمه به ترتیب زمانی
-   پاسخ کاربر و پاسخ پشتیبانی
-   نمایش نشانگر پیام جدید و به‌روزرسانی لحظه‌ای
-   وضعیت خوانده‌شدن در صورت پیاده‌سازی
-   امکان ویرایش/بستن/بازگشایی طبق policy مشخص
-   پیوست‌ها با کنترل دسترسی
-   نمایش خطا و وضعیت قطع ارتباط لحظه‌ای؛ در قطع اتصال امکان
    refresh/refetch امن وجود داشته باشد

### 6. پنل مدیریت

-   داشبورد آماری: تعداد کل، باز، درحال بررسی، منتظر کاربر، حل‌شده و
    بسته‌شده
-   نمودار روند ثبت و حل تیکت‌ها در بازه‌های زمانی
-   توزیع تیکت بر اساس وضعیت، اولویت و دسته‌بندی
-   صف تیکت‌های جدید و فوری
-   جستجو و فیلتر پیشرفته
-   مشاهده جزئیات و مکالمه
-   پاسخ عمومی به کاربر و یادداشت داخلی محرمانه
-   تغییر وضعیت و اولویت
-   تخصیص تیکت به مدیر
-   ثبت رویدادهای مدیریتی
-   مدیریت کاربران و نقش‌ها بر اساس مجوز
-   همه آمارها باید از Query واقعی و محدودشده به بازه زمانی به دست
    بیایند.

### 7. پنل OWNER

OWNER بالاترین سطح دسترسی است و باید بتواند: - مدیر ایجاد/تعلیق کند و
نقش‌ها را مدیریت کند - دسترسی‌ها و سیاست‌های امنیتی را مدیریت کند -
رخدادهای audit را مشاهده کند - نشست‌های فعال را بررسی و در صورت نیاز باطل
کند - MFA و recovery code خود را مدیریت کند - برای عملیات حساس احراز
هویت مجدد (step-up authentication) انجام دهد

ورود OWNER: - ترکیب رمز عبور قوی + MFA مبتنی بر TOTP یا روش امن
پشتیبانی‌شده - راه‌اندازی اولیه OWNER فقط از طریق دستور CLI یا bootstrap
امن سمت سرور - secret اولیه فقط در محیط سرور و خارج از repository
نگهداری شود - secret به هیچ عنوان در frontend، localStorage، URL، log یا
API response قرار نگیرد - secret به تنهایی روش ورود یا جایگزین MFA
نیست - مسیر مخفی، query parameter مخفی یا نام route غیرقابل حدس، کنترل
امنیتی محسوب نمی‌شود.

## مدل داده پیشنهادی

با Prisma schema طراحی کن و قبل از migration نهایی روابط را بررسی کن.
حداقل مدل‌ها:

-   User: شناسه، نام نمایشی، ایمیل unique، passwordHash، role، وضعیت
    حساب، زمان ایجاد/به‌روزرسانی
-   Session: شناسه، userId، hash شناسه/توکن نشست، زمان انقضا، metadata
    حداقلی و زمان ابطال
-   Ticket: شناسه عمومی قابل نمایش، subject، description یا پیام آغازین،
    category، status، priority، requesterId، assigneeId اختیاری،
    timestamps
-   TicketMessage: ticketId، authorId، body، visibility (PUBLIC /
    INTERNAL)، createdAt، editedAt اختیاری
-   TicketAttachment: ticketId/messageId، storageKey تصادفی، نام اصلی
    پاک‌سازی‌شده، MIME/type تشخیص‌داده‌شده، size، uploaderId
-   MfaCredential: userId، نوع، secret رمزگذاری‌شده در صورت نیاز،
    فعال/تأییدشده، زمان ایجاد
-   RecoveryCode: hash، مصرف‌شده/زمان مصرف
-   AuditLog: actorId، action، entityType، entityId، metadata پالایش‌شده،
    timestamp
-   PasswordResetToken / EmailVerificationToken در صورت نیاز: فقط hash
    توکن، انقضا و مصرف

نکات: - relationها، indexها، unique constraintها و onDelete behavior
دقیق باشند. - زمان‌ها UTC ذخیره شوند. - عملیات چندمرحله‌ای مهم در
transaction انجام شوند. - حذف کاربر نباید تاریخچه و یکپارچگی تیکت‌ها را
ناخواسته خراب کند؛ سیاست حذف/ناشناس‌سازی را مستند کن. - SQLite
محدودیت‌هایی در concurrency و استقرار دارد؛ فایل DB باید روی storage
پایدار باشد.

## وضعیت‌ها و قواعد گردش کار

وضعیت‌های پیشنهادی: - OPEN - IN_PROGRESS - WAITING_FOR_USER - RESOLVED -
CLOSED

اولویت‌ها: - LOW - NORMAL - HIGH - URGENT

قواعد transition را در service layer تعریف و تست کن. برای مثال تیکت
بسته‌شده فقط طبق policy قابل بازگشایی باشد. نقش USER نتواند یادداشت داخلی
را ببیند یا با payload دستکاری‌شده پیام داخلی بسازد. تغییرات مهم status،
priority و assignment در audit ثبت شوند.

## معماری و API

ساختار پیشنهادی را با نیاز واقعی پروژه تطبیق بده:

-   `pages/` صفحات و routeها
-   `components/` کامپوننت‌های دامنه‌ای و عمومی
-   `layouts/` layoutهای عمومی، کاربر و مدیریت
-   `composables/` منطق قابل استفاده در client
-   `server/api/` endpointها
-   `server/services/` use case و business logic
-   `server/repositories/` لایه دسترسی داده در صورت نیاز
-   `server/middleware/` middlewareهای سرور
-   `server/utils/` ابزارهای server-only
-   `shared/` schemaها و typeهای امن و مشترک
-   `prisma/` schema، migrations و seed
-   `tests/` تست‌ها
-   `docs/` معماری، امنیت و deployment

APIها باید: - ورودی را سمت سرور validate کنند - authentication و
authorization داشته باشند - response shape ثابت و تایپ‌شده داشته باشند -
pagination و limit داشته باشند - خطاهای داخلی را افشا نکنند - مجوز
object-level را در هر درخواست بررسی کنند

از mass assignment جلوگیری کن. داده دریافتی را مستقیم به Prisma پاس نده؛
فیلدهای مجاز را صریح انتخاب کن.

## Socket.IO و real-time

-   هویت اتصال از session معتبر سمت سرور استخراج شود.
-   هر room join و هر event مجوزسنجی شود.
-   client حق ندارد با ارسال ticketId به room خصوصی ملحق شود مگر سرور
    مالکیت/دسترسی را بررسی کرده باشد.
-   پیام ابتدا در دیتابیس ثبت شود، سپس event ارسال شود.
-   eventهای خصوصی فقط برای کاربران مجاز ارسال شوند.
-   payloadها validate و rate-limit شوند.
-   هنگام reconnect، کلاینت داده معتبر را مجدداً از API بگیرد تا event
    ازدست‌رفته باعث ناسازگاری نشود.
-   logout، انقضای session، تعلیق کاربر یا تغییر نقش باید اتصال مرتبط را
    بی‌اعتبار کند.
-   Socket نباید منبع اصلی داده باشد؛ دیتابیس منبع حقیقت است.

## امنیت --- الزام غیرقابل مذاکره

تهدیدهای OWASP را مبنا قرار بده. حداقل: - Password hashing استاندارد
(ترجیحاً Argon2id) - Session امن و قابل ابطال با cookieهای HttpOnly،
Secure در production و SameSite مناسب - CSRF protection برای درخواست‌های
مبتنی بر cookie - XSS prevention؛ از v-html بدون sanitizer استفاده نکن -
جلوگیری از SQL injection؛ فقط Prisma query امن یا پارامترگذاری صحیح -
CORS محدود به originهای مجاز - CSP و security headers - rate limiting
برای login، register، reset، ticket و socket events - محدودیت حجم body،
تعداد نتایج و فایل‌های آپلودی - جلوگیری از IDOR و privilege escalation -
خطای عمومی در production؛ بدون stack trace و جزئیات DB - عدم ثبت رمز،
session، cookie، MFA secret یا محتوای محرمانه در log - secretها فقط در
environment/secret manager - audit log برای ورود، تغییر نقش، MFA، عملیات
حساس و تغییرات تیکت - TLS در production - dependency review و بررسی
آسیب‌پذیری‌ها

امنیت مطلق قابل تضمین نیست؛ هدف، طراحی دفاع چندلایه، تست و مستندسازی
ریسک‌های باقی‌مانده است.

## SEO و دسترس‌پذیری

-   Landing page و صفحات عمومی SSR و SEO-friendly باشند.
-   برای صفحات عمومی title، description، canonical و OG metadata یکتا
    تعریف کن.
-   صفحات داشبورد، تیکت، پروفایل و auth نباید index شوند.
-   robots.txt به‌تنهایی کنترل دسترسی نیست.
-   HTML معنایی، label فرم، keyboard navigation، focus state و کنتراست
    رعایت شود.
-   داده خصوصی در SSR cache عمومی قرار نگیرد.

## تست و معیار پذیرش

قبل از اتمام: 1. تست ثبت‌نام، ورود، خروج و session expiry 2. تست MFA مدیر
و OWNER 3. تست جلوگیری از انتخاب نقش privileged در signup 4. تست عدم
دسترسی کاربر A به تیکت کاربر B (خواندن/ویرایش/حذف/پیام/پیوست) 5. تست عدم
دسترسی USER به internal note 6. تست role escalation و endpointهای
admin/owner 7. تست status transition و audit log 8. تست socket
authentication و room authorization 9. تست عدم نشت event بین دو کاربر
10. تست validation و rate limit 11. تست layout در mobile/tablet/desktop
12. اجرای lint، typecheck، migration و تست‌ها

هیچ قابلیت اصلی را با mock یا placeholder تحویل نده. اگر بخشی به سرویس
خارجی مثل ایمیل نیاز دارد و credential موجود نیست، integration و
interface را اصولی بساز، وضعیت نیازمند تنظیم را در README شفاف اعلام کن
و ادعای ارسال واقعی نکن.

## مستندات و تحویل

موارد تحویلی: - سورس کامل و ساختار Git تمیز - README فارسی یا دوزبانه،
دقیق و قابل اجرا - `.env.example` بدون secret واقعی - توضیح معماری و
ساختار پوشه‌ها - Prisma schema و migrationها - راهنمای اجرای development
و build - راهنمای deploy و TLS - backup و restore برای SQLite - مستند
امنیت، نقش‌ها، MFA و threat model - تست‌های قابل اجرا و گزارش نتیجه - نسخه
deploy شده فقط پس از تست واقعی و تأیید تنظیمات محیط

## روش اجرای کار

کار را مرحله‌ای انجام بده:

### فاز صفر --- بررسی و طراحی

1.  repository و فایل‌های موجود را بررسی کن.
2.  Skillهای مرتبط را جستجو و دستورالعملشان را بخوان.
3.  نسخه‌ها و سازگاری Nuxt، shadcn-vue، Prisma و Socket.IO را بررسی کن.
4.  تصمیم‌های معماری، threat model اولیه، ERD و برنامه فازها را در
    `docs/` بنویس.
5.  قبل از ادامه، ریسک‌های SQLite و مدل استقرار را مشخص کن.

### فاز یک --- پایه پروژه

Nuxt، TypeScript، Tailwind، shadcn-vue، lint، formatting، env validation
و ساختار پوشه‌ها را آماده کن.

### فاز دو --- دیتابیس و هویت

Prisma schema، migration، session auth، registration/login/logout، role
model، owner bootstrap و MFA را پیاده کن و تست بزن.

### فاز سه --- تجربه کاربر

Landing، auth pages، user dashboard، ticket list، ticket create و ticket
detail را کامل کن.

### فاز چهار --- پنل مدیریت

Admin dashboard، آمار واقعی، queue، filters، assignment، replies،
internal notes، role management و audit log را بساز.

### فاز پنج --- real-time

Socket.IO را با احراز هویت و authorization کامل اضافه کن؛ eventها و
reconnect را تست کن.

### فاز شش --- سخت‌سازی و کیفیت

Threat-model review، تست امنیتی، responsive/accessibility، performance،
SEO، error handling و dependency review.

### فاز هفت --- مستندات و تحویل

README، معماری، امنیت، deployment، backup/restore و گزارش نهایی را کامل
کن.

در هر فاز: - ابتدا plan کوتاه ارائه کن. - تغییرات کوچک و قابل بازبینی
انجام بده. - تست مرتبط را اجرا کن. - خطاها را رفع کن، نه اینکه تست را
خاموش کنی. - تصمیم‌های مهم را مستند کن.

## تعریف خروجی نهایی

در پایان، گزارشی دقیق بده که شامل این موارد باشد: - امکاناتی که واقعاً
پیاده‌سازی شده‌اند - ساختار معماری و مدل دیتابیس - Skillهای واقعاً
استفاده‌شده - دستورات setup و run - دستورات migration و test - تست‌هایی که
اجرا شده و نتیجه واقعی آن‌ها - وضعیت deploy و لینک واقعی در صورت deploy
موفق - متغیرهای محیطی موردنیاز - محدودیت‌ها و ریسک‌های باقی‌مانده

هیچ‌وقت قابلیت ناقص را کامل، تست اجرا‌نشده را موفق، یا امنیت بررسی‌نشده را
تضمین‌شده معرفی نکن.


## 20. Language, Localization, RTL, and Typography Requirements

These requirements are mandatory and take precedence over any generic language or localization guidance elsewhere in this document.

### Application language

- The main application language must be **Persian (Farsi)**.
- All authenticated product areas must use natural, professionally written Persian UI copy, including registration, login, user dashboard, ticket creation, ticket details, admin dashboard, owner dashboard, settings, validation messages, notifications, dialogs, and empty/error states.
- The authenticated application must use **RTL layout** by default.
- Set the document language and direction correctly for Persian pages (for example, `lang="fa"` and `dir="rtl"`).
- Use Persian-friendly date, number, and currency formatting where relevant. Store timestamps in UTC and localize only at presentation time.
- Do not mix English labels into Persian UI unnecessarily. Technical identifiers, email addresses, URLs, ticket references, and code snippets may retain their natural LTR direction.
- Ensure mixed Persian/English text, numbers, punctuation, form fields, tables, charts, and code-like values render correctly. Apply LTR direction selectively to values such as email addresses and ticket IDs rather than changing the whole page direction.

### Landing page language

- The **public landing page must be in English**.
- Write polished, concise, natural English marketing copy appropriate for a professional SaaS support/ticketing product.
- The landing page must use LTR layout (`lang="en"` and `dir="ltr"`).
- Landing-page navigation, hero headline, feature descriptions, calls to action, FAQ, footer, metadata, and SEO content must all be in English.
- Do not translate the landing page into Persian unless a separate language-switching feature is explicitly requested later.
- Authentication and all private application pages remain Persian/RTL even though the public landing page is English.

### Typography and font system

Use a deliberate font system rather than applying one font indiscriminately:

**Persian application font**
- Use **Vazirmatn** as the primary font for all Persian application interfaces.
- Load it efficiently using a reliable, production-appropriate method. Prefer self-hosted optimized WOFF2 files when licensing and project setup permit; otherwise use a reputable font source.
- Include appropriate font weights (at least regular, medium, and bold) and avoid loading unnecessary weights.
- Apply Vazirmatn consistently to Persian navigation, forms, tables, dialogs, dashboard labels, charts, buttons, and notifications.
- Define a robust Persian-capable fallback stack.

**English landing-page font**
- Select a visually attractive, high-quality Latin typeface specifically suited to a modern SaaS marketing landing page. Do not use Vazirmatn as the landing page's primary Latin font.
- Choose a font with excellent readability and a polished editorial/marketing feel, such as **Manrope**, **Plus Jakarta Sans**, or another suitable contemporary sans-serif. Inspect the visual design and select one coherent family rather than combining several decorative fonts.
- Use a clear typographic scale and intentional weight hierarchy for the hero headline, section headings, body copy, navigation, and calls to action.
- The landing-page font must be scoped to the public landing layout so it does not unintentionally replace Vazirmatn in the Persian application.

### Implementation guidance

- Define centralized font-family tokens and apply them through Tailwind/CSS variables.
- Keep the public landing layout and authenticated application layout separate enough to support their different languages, directions, and font systems.
- Avoid layout hacks that reverse the entire interface while leaving text alignment incorrect.
- Test Persian typography on desktop and mobile, including long labels, numbers, mixed-direction text, validation messages, and dense admin tables.
- Test the English landing page independently for LTR alignment, heading wrapping, responsive typography, and SEO metadata.
- Ensure charts and data visualizations use readable Persian labels in the application while preserving correct numeric direction and formatting.

## Language, Direction, and Typography Requirements (Authoritative)

The entire product must be Persian (Farsi), including the public landing page and every other screen. This applies to all visible UI and product content: navigation, hero section, feature descriptions, calls to action, forms, validation messages, authentication pages, dashboards, ticket pages, admin and owner panels, FAQs, footer, notifications, empty states, and system messages.

- Use natural, polished, professional Persian throughout the application.
- Set the document language to `fa` and direction to `rtl` by default (`lang="fa"` and `dir="rtl"`).
- The landing page must also be fully Persian and RTL. Do not create an English-language landing page.
- Use **Vazirmatn** as the primary font throughout the entire product, including the landing page, authentication screens, dashboards, and all admin/owner interfaces.
- Prefer optimized, self-hosted Vazirmatn WOFF2 font files with the required weights (at minimum 400, 500, 600, and 700). Provide a suitable Persian sans-serif fallback stack.
- Define font families and weights centrally through CSS variables/design tokens and configure Tailwind to use them consistently.
- Ensure mixed Persian/English text, email addresses, URLs, numbers, and technical identifiers render correctly using appropriate local direction handling such as `dir="auto"` where needed.
- Verify RTL layout, typography, spacing, charts, tables, forms, dialogs, menus, and responsive behavior across mobile, tablet, and desktop.

Important distinction: **The project context/instructions file (`FREEBUFF_CONTEXT.md`) is written in English for the coding agent, but the actual application that the agent builds must be entirely Persian and RTL.** Do not interpret the English language of this specification as a requirement for English UI.

These requirements supersede any earlier language or typography instructions in this document that conflict with them.
