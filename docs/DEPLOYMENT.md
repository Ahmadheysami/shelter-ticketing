# استقرار در محیط تولید

این سند یک topology تک‌instance با SQLite را توصیف می‌کند. پروژه در این
تحویل روی هیچ محیط production مستقر نشده است؛ دستورها باید در محیط خودتان
آزمایش و تأیید شوند.

## پیش‌نیازها

- Linux با Node.js 20.19+ یا 22.12+
- یک دامنه با TLS معتبر
- reverse proxy (نمونه با Nginx)
- volume پایدار و محلی برای SQLite؛ **NFS یا فایل‌سیستم شبکه‌ای
  پشتیبانی نمی‌شود**
- SMTP برای تحویل واقعی ایمیل (اختیاری اما برای reset ضروری)
- کاربر سیستم بدون دسترسی shell تعاملی، مثلاً `ticketing`

## متغیرهای محیط تولید

```bash
NODE_ENV=production
PORT=3000
APP_URL=https://support.example.com
DATABASE_URL="file:/var/lib/ticketing/app.db"
MFA_ENCRYPTION_KEY="<32-byte-base64>"
IP_HASH_SECRET="<32-byte-base64>"
TRUST_PROXY=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM="Support <no-reply@example.com>"
```

- `APP_URL` باید دقیقاً origin عمومی و HTTPS باشد؛ CSRF و لینک‌های ایمیل به
  آن وابسته‌اند.
- `TRUST_PROXY` فقط وقتی `true` شود که برنامه پشت proxy مورد اعتماد است.
  در غیر این صورت `X-Forwarded-For` جعلی می‌تواند rate limit را دور بزند.
- `MFA_ENCRYPTION_KEY` و `IP_HASH_SECRET` را با
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  بسازید و در secret manager نگه دارید. تغییر `MFA_ENCRYPTION_KEY` باعث
  غیرقابل‌خواندن شدن secretهای TOTP موجود می‌شود.
- فایل env را با permission `600` و مالک کاربر سرویس نگه دارید.

`node .output/server/index.mjs` به‌تنهایی `.env` را بارگذاری نمی‌کند.
متغیرها را با systemd، Docker secret یا
`node --env-file=/etc/ticketing/app.env .output/server/index.mjs` تأمین
کنید.

## نصب و build

```bash
sudo mkdir -p /opt/ticketing /var/lib/ticketing /var/backups/ticketing
sudo chown -R ticketing:ticketing /opt/ticketing /var/lib/ticketing /var/backups/ticketing
```

از داخل نسخه deployشده:

```bash
npm ci
set -a
. /etc/ticketing/app.env
set +a
npm run db:deploy
npm run build
```

`npm run build` شامل `prisma generate` است. خروجی در `.output/` قرار
می‌گیرد. `data/` و `prisma/generated/` نباید در git باشند؛ در محیط deploy
دیتابیس در مسیر پایدار خارج از پروژه قرار می‌گیرد.

## اجرا با systemd

```ini
# /etc/systemd/system/ticketing.service
[Unit]
Description=Ticketing
After=network.target

[Service]
Type=simple
User=ticketing
Group=ticketing
WorkingDirectory=/opt/ticketing
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/etc/ticketing/app.env
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/ticketing
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ticketing
sudo systemctl status ticketing
curl -fsS http://127.0.0.1:3000/api/health
```

`ProtectSystem=strict` و `ReadWritePaths` را با مسیر واقعی دیتابیس تطبیق
دهید. اگر فایل env شامل `DATABASE_URL` است، همان مسیر باید قابل نوشتن
باشد.

## reverse proxy و TLS

نمونه Nginx با WebSocket upgrade:

```nginx
server {
    listen 80;
    server_name support.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name support.example.com;

    ssl_certificate     /etc/letsencrypt/live/support.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/support.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 1m;

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 75s;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

نکته‌ها:

- HSTS توسط برنامه در production ارسال می‌شود؛ اگر در proxy هم فعال
  می‌کنید از ارسال تکراری با مقادیر متفاوت خودداری کنید.
- `Host` و `X-Forwarded-Proto` باید حفظ شوند.
- برنامه `connect-src` را بر اساس `APP_URL` می‌سازد؛ دامنه اشتباه باعث
  مسدود شدن WebSocket توسط CSP می‌شود.
- TLS باید در proxy خاتمه یابد؛ `Secure` cookie فقط روی HTTPS کار می‌کند.

## Bootstrap مالک در production

`OWNER_SECRET` را در secret manager تنظیم کنید (حداقل ۳۲ کاراکتر تصادفی).
با اولین اجرای برنامه، اگر هیچ حساب `OWNER` وجود نداشته باشد، یک حساب مالک
ساخته می‌شود. سپس `/admin/login` را باز کنید و با همان کلید وارد شوید؛
برنامه از شما نام و ایمیل می‌خواهد.

مسیر CLI اختیاری (وقتی startup خودکار را نمی‌خواهید):

```bash
cd /opt/ticketing
set -a
. /etc/ticketing/app.env
set +a
npm run bootstrap:owner
```

این دستور در صورت وجود مالک متوقف می‌شود. کلید خام را در تاریخچه shell، log
CI یا فایل عمومی نگه ندارید. پس از تکمیل پروفایل می‌توانید `OWNER_SECRET` را
از env حذف کنید؛ کلید هش‌شده در دیتابیس باقی می‌ماند. هر نشست یک ساعت
اعتبار دارد و پس از آن خودکار بسته می‌شود.

## SMTP

بدون SMTP:

- ثبت‌نام همچنان حساب می‌سازد، اما لینک تأیید تحویل داده نمی‌شود.
- بازیابی رمز توکن می‌سازد، اما کاربر لینک را دریافت نمی‌کند.
- در development پیام در `.data/mail-outbox/` (gitignored) نوشته می‌شود؛
  در production فقط drop شدن پیام بدون محتوا log می‌شود.

برای production واقعی SMTP را تنظیم و با یک حساب آزمایشی، تحویل، SPF/DKIM
و صف ایمیل را تست کنید. ارسال از دامنه‌ای استفاده کند که SPF آن با سرور
SMTP هماهنگ است.

## Migration

هر migration را ابتدا روی staging با کپی دیتابیس تولید آزمایش کنید.

```bash
# 1) backup
sqlite3 /var/lib/ticketing/app.db \
  ".backup '/var/backups/ticketing/pre-migrate-$(date +%F-%H%M).db'"

# 2) اعمال migration
set -a; . /etc/ticketing/app.env; set +a
npm run db:deploy

# 3) restart و health check
sudo systemctl restart ticketing
curl -fsS https://support.example.com/api/health
```

قواعد:

- در production از `prisma migrate deploy` استفاده کنید؛ `db push` ممنوع
  است.
- migrationها را قبل از deploy در repo بررسی کنید.
- اگر migration برگشت‌ناپذیر است، rollback = restore backup، نه حذف دستی
  جدول.
- برنامه را قبل از backup سنگین یا restore متوقف کنید تا نوشتن هم‌زمان
  رخ ندهد.

## Backup

### روش آنلاین با SQLite backup API

```bash
sqlite3 /var/lib/ticketing/app.db \
  ".backup '/var/backups/ticketing/app-$(date +%F-%H%M%S).db'"
sqlite3 /var/backups/ticketing/app-*.db "PRAGMA integrity_check;"
```

`.backup` یک snapshot سازگار می‌سازد و برای دیتابیس در حال استفاده مناسب
است. از `cp` ساده روی فایل در حال نوشتن خودداری کنید.

### روش آفلاین (توقف سرویس)

```bash
sudo systemctl stop ticketing
cp /var/lib/ticketing/app.db /var/backups/ticketing/app-$(date +%F).db
sudo systemctl start ticketing
```

سیاست پیشنهادی:

- backup روزانه + نگهداری ۳۰ روز
- کپی خارج از سرور (object storage با رمزنگاری)
- permission محدود روی backup
- تست restore ماهانه در staging
- ثبت زمان، اندازه و نتیجه `integrity_check`

## Restore

```bash
sudo systemctl stop ticketing

# فایل فعلی را کنار بگذارید، حذف نکنید
sudo mv /var/lib/ticketing/app.db \
  /var/lib/ticketing/app.db.before-restore-$(date +%F-%H%M)

sudo cp /var/backups/ticketing/app-2026-11-06.db /var/lib/ticketing/app.db
sudo chown ticketing:ticketing /var/lib/ticketing/app.db

sqlite3 /var/lib/ticketing/app.db "PRAGMA integrity_check;"
# باید ok برگرداند

sudo systemctl start ticketing
curl -fsS https://support.example.com/api/health
```

پس از restore، ورود و یک تیکت آزمایشی را بررسی کنید. اگر backup قدیمی‌تر
از schema فعلی است، ابتدا migration مربوطه را اجرا کنید.

## Rollback

1. سرویس را متوقف کنید.
2. نسخه قبلی کد را deploy کنید.
3. اگر migration سازگار نیست، backup pre-migrate را restore کنید.
4. سرویس را بالا بیاورید و health/ورود/تیکت را smoke test کنید.

Rollback خودکار migration وجود ندارد. همیشه قبل از migrate backup بگیرید.

## پایش و نگهداری

- `/api/health` را با interval کوتاه monitor کنید (liveness، نه readiness
  کامل).
- فضای دیسک، اندازه دیتابیس و خطاهای `database is locked` را alert کنید.
- `journalctl -u ticketing` را بدون log کردن secret بررسی کنید.
- نسخه Node و dependencyها را دوره‌ای patch کنید؛ پس از patch، build و
  تست‌ها را دوباره اجرا کنید.
- نشست‌های فعال و audit را در پنل OWNER بررسی کنید.

## مقیاس‌پذیری و محدودیت‌ها

این setup برای **یک instance** است:

- SQLite یک نویسنده هم‌زمان دارد و برای بار نوشتن بالا مناسب نیست.
- rate limit در حافظه مشترک نیست.
- Socket.IO بدون adapter مشترک بین instance‌ها کار نمی‌کند.
- sessionها در همان SQLite هستند؛ چند instance با فایل مشترک روی NFS
  پشتیبانی نمی‌شود.

برای scale-out باید PostgreSQL، rate-limit مشترک (Redis) و Socket.IO
adapter اضافه شود. این کارها در این نسخه پیاده‌سازی نشده‌اند.

## چک‌لیست Go-live

- [ ] `APP_URL` نهایی HTTPS است و DNS/TLS درست کار می‌کند.
- [ ] env production با permission محدود و بدون secret در git است.
- [ ] `npm run db:deploy` روی دیتابیس پایدار اجرا شده است.
- [ ] `npm run build` موفق و `.output/server/index.mjs` وجود دارد.
- [ ] reverse proxy، WebSocket و `TRUST_PROXY=true` تست شده‌اند.
- [ ] مالک ساخته شده، MFA فعال و کدهای بازیابی آفلاین ذخیره شده‌اند.
- [ ] SMTP و ایمیل تأیید/بازیابی تست شده است.
- [ ] backup و restore واقعی تست شده‌اند.
- [ ] rate limit و هدرهای امنیتی در HTTPS بررسی شده‌اند.
- [ ] `npm run lint`، `npm run typecheck`، `npm test` و `npm run test:e2e`
      در نسخه deployشده اجرا شده‌اند.
