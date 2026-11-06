<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  CreditCard,
  Headset,
  MessageCircle,
  UserRound,
  Wrench,
} from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import StatusBadge from '~/components/StatusBadge.vue'

definePageMeta({ layout: 'default' })

const appUrl = useRuntimeConfig().public.appUrl

useSeoMeta({
  title: 'تیکت‌یار | مرکز پشتیبانی سرویس',
  description:
    'مرکز پشتیبانی سرویس؛ درخواست خود را ثبت کنید، وضعیت آن را پیگیری کنید و پاسخ تیم پشتیبانی را در همان صفحه دریافت کنید.',
  ogTitle: 'مرکز پشتیبانی سرویس | تیکت‌یار',
  ogDescription:
    'برای گزارش مشکل، دریافت راهنما یا پیگیری درخواست وارد حساب خود شوید. همه چیز در یک مسیر ساده و قابل پیگیری.',
  ogType: 'website',
  ogUrl: appUrl,
  ogLocale: 'fa_IR',
  twitterCard: 'summary_large_image',
  robots: 'index, follow',
})

// Escape `<` so an unexpected APP_URL value can never terminate the
// application/ld+json script element early.
const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'مرکز پشتیبانی تیکت‌یار',
  url: appUrl,
  description: 'مرکز پشتیبانی سرویس برای ثبت درخواست، پیگیری وضعیت و گفتگو با تیم پشتیبانی.',
  inLanguage: 'fa-IR',
}).replace(/</g, '\\u003c')

useHead({
  link: [{ rel: 'canonical', href: appUrl }],
  script: [{ type: 'application/ld+json', innerHTML: jsonLd }],
})

const topics = [
  {
    icon: UserRound,
    title: 'حساب و ورود',
    text: 'ورود، ثبت‌نام، تأیید ایمیل یا بازیابی رمز عبور.',
  },
  {
    icon: CreditCard,
    title: 'پرداخت و اشتراک',
    text: 'صورتحساب، تمدید اشتراک یا سوال‌های مرتبط با پرداخت.',
  },
  {
    icon: Wrench,
    title: 'مشکل فنی',
    text: 'خطا، کندی یا رفتار غیرمنتظره‌ای که در سرویس دیده‌اید.',
  },
  {
    icon: MessageCircle,
    title: 'درخواست و پیشنهاد',
    text: 'ایده یک قابلیت جدید یا بازخورد درباره تجربه استفاده.',
  },
]

const steps = [
  {
    number: '۱',
    title: 'وارد حساب شوید',
    text: 'با ایمیل و رمز عبور خود وارد شوید تا درخواست‌هایتان قابل پیگیری باشند.',
  },
  {
    number: '۲',
    title: 'درخواست را ثبت کنید',
    text: 'موضوع را انتخاب کنید و مشکل یا سوال خود را با جزئیات کافی توضیح دهید.',
  },
  {
    number: '۳',
    title: 'پاسخ را پیگیری کنید',
    text: 'وضعیت درخواست و پاسخ تیم پشتیبانی را در همان صفحه ببینید و ادامه دهید.',
  },
]

const faqs = [
  {
    q: 'چطور درخواستم را پیگیری کنم؟',
    a: 'پس از ثبت، درخواست در بخش «تیکت‌های من» قرار می‌گیرد. وضعیت، پاسخ‌ها و تاریخچه کامل را همان‌جا می‌بینید.',
  },
  {
    q: 'چه اطلاعاتی در توضیح درخواست بنویسم؟',
    a: 'مرحله‌هایی که انجام داده‌اید، متن خطا و مرورگر یا دستگاه خود را بنویسید. هرچه توضیح دقیق‌تر باشد، بررسی سریع‌تر پیش می‌رود.',
  },
  {
    q: 'چه مدت تا دریافت پاسخ طول می‌کشد؟',
    a: 'زمان پاسخ به نوع و اولویت درخواست بستگی دارد. وضعیت درخواست همیشه در حساب شما قابل مشاهده است و می‌توانید پاسخ اضافه کنید.',
  },
  {
    q: 'آیا درخواست من برای دیگران قابل مشاهده است؟',
    a: 'خیر. هر درخواست فقط برای شما و تیم پشتیبانی قابل مشاهده است.',
  },
]
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <header class="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
      <div class="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <BrandLogo />
        <nav class="ms-6 hidden items-center gap-1 md:flex" aria-label="ناوبری مرکز پشتیبانی">
          <a href="#topics" class="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">موضوع‌ها</a>
          <a href="#how" class="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">روند کار</a>
          <a href="#faq" class="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">پرسش‌ها</a>
        </nav>
        <div class="ms-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" as-child>
            <NuxtLink to="/login">ورود</NuxtLink>
          </Button>
          <Button size="sm" as-child>
            <NuxtLink to="/register">ثبت‌نام</NuxtLink>
          </Button>
        </div>
      </div>
    </header>

    <main>
      <section class="relative overflow-hidden">
        <div class="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-72 max-w-4xl rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
        <div class="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-24">
          <div>
            <Badge variant="secondary" class="mb-5">مرکز پشتیبانی سرویس</Badge>
            <h1 class="text-3xl font-extrabold leading-[1.35] tracking-tight text-balance sm:text-4xl lg:text-[2.75rem]">
              هر درخواست، یک مسیر روشن تا حل شدن.
            </h1>
            <p class="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
              اینجا مرکز پشتیبانی سرویس شماست. برای گزارش مشکل، دریافت راهنما یا پیگیری
              درخواست وارد حساب خود شوید؛ همه چیز در یک صفحه و بدون پیگیری‌های پراکنده.
            </p>
            <div class="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" as-child>
                <NuxtLink to="/register">
                  ثبت درخواست
                  <ArrowLeft class="size-4" />
                </NuxtLink>
              </Button>
              <Button size="lg" variant="outline" as-child>
                <NuxtLink to="/login">پیگیری درخواست</NuxtLink>
              </Button>
            </div>
            <ul class="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <li class="flex items-center gap-2"><Check class="size-4 text-primary" /> ثبت ساده در چند دقیقه</li>
              <li class="flex items-center gap-2"><Check class="size-4 text-primary" /> پیگیری آنلاین وضعیت</li>
              <li class="flex items-center gap-2"><Check class="size-4 text-primary" /> پاسخ تیم در همان صفحه</li>
              <li class="flex items-center gap-2"><Check class="size-4 text-primary" /> دسترسی امن با حساب کاربری</li>
            </ul>
          </div>

          <div class="relative">
            <div class="absolute -inset-4 rounded-3xl bg-primary/5" aria-hidden="true" />
            <div class="relative rounded-2xl border border-border/80 bg-card p-5 shadow-lg">
              <div class="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
                <div class="flex items-center gap-2.5">
                  <span class="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Headset class="size-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <p class="text-[11px] text-muted-foreground">شماره پیگیری</p>
                    <p class="font-mono text-xs font-medium" dir="ltr">TK-00142</p>
                  </div>
                </div>
                <StatusBadge status="IN_PROGRESS" />
              </div>

              <div class="py-4">
                <p class="text-[11px] text-muted-foreground">موضوع درخواست</p>
                <h2 class="mt-1 text-sm font-semibold">عدم امکان ورود به حساب</h2>
                <p class="mt-1 text-[11px] text-muted-foreground">حساب کاربری · اولویت زیاد</p>
              </div>

              <div class="space-y-3 border-t border-border/70 pt-4">
                <div class="rounded-lg bg-muted/50 p-3">
                  <p class="text-[11px] font-medium text-muted-foreground">شما · ۱۰:۲۴</p>
                  <p class="mt-1 text-sm leading-6">بعد از تغییر رمز، وارد حساب نمی‌شوم و پیام خطا دریافت می‌کنم.</p>
                </div>
                <div class="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p class="text-[11px] font-medium text-primary">تیم پشتیبانی · ۱۰:۴۱</p>
                  <p class="mt-1 text-sm leading-6">سلام، لطفاً یک‌بار از مرورگر دیگر تلاش کنید. راهنمای بازیابی رمز را هم برایتان بررسی کردیم.</p>
                </div>
              </div>

              <div class="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-[11px] text-muted-foreground">
                <span>در حال بررسی توسط تیم</span>
                <span>آخرین پاسخ: چند لحظه پیش</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="topics" class="border-t border-border/60 bg-muted/20 py-16 lg:py-20">
        <div class="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div class="max-w-2xl">
            <p class="text-xs font-semibold text-primary">از کجا شروع کنم؟</p>
            <h2 class="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">چه کمکی نیاز دارید؟</h2>
            <p class="mt-3 text-sm leading-7 text-muted-foreground">
              موضوع درخواست را انتخاب کنید تا سریع‌تر به تیم درست برسد. اگر مطمئن نیستید،
              «مشکل فنی» را انتخاب کنید و جزئیات را بنویسید.
            </p>
          </div>
          <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NuxtLink
              v-for="topic in topics"
              :key="topic.title"
              :to="{ path: '/login', query: { redirect: '/tickets/new' } }"
              class="group rounded-xl border border-border/80 bg-card p-5 shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span class="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <component :is="topic.icon" class="size-5" aria-hidden="true" />
              </span>
              <h3 class="mt-4 text-sm font-semibold">{{ topic.title }}</h3>
              <p class="mt-2 text-sm leading-7 text-muted-foreground">{{ topic.text }}</p>
              <span class="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
                ثبت درخواست
                <ArrowLeft class="size-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
              </span>
            </NuxtLink>
          </div>
        </div>
      </section>

      <section id="how" class="py-16 lg:py-20">
        <div class="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div class="max-w-xl">
            <p class="text-xs font-semibold text-primary">روند کار</p>
            <h2 class="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">سه قدم تا پاسخ روشن</h2>
            <p class="mt-3 text-sm leading-7 text-muted-foreground">
              نه فرم پیچیده، نه کانال‌های متعدد. مسیر از ثبت تا حل در همان صفحه قابل پیگیری است.
            </p>
          </div>
          <ol class="mt-10 grid gap-4 md:grid-cols-3">
            <li v-for="step in steps" :key="step.number" class="rounded-xl border border-border/80 bg-card p-6">
              <span class="inline-flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{{ step.number }}</span>
              <h3 class="mt-4 text-base font-semibold">{{ step.title }}</h3>
              <p class="mt-2 text-sm leading-7 text-muted-foreground">{{ step.text }}</p>
            </li>
          </ol>
        </div>
      </section>

      <section id="faq" class="border-y border-border/60 bg-muted/20 py-16 lg:py-20">
        <div class="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p class="text-xs font-semibold text-primary">پرسش‌های متداول</p>
            <h2 class="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">پاسخ به سوال‌های رایج</h2>
            <p class="mt-3 text-sm leading-7 text-muted-foreground">
              اگر پاسخ خود را پیدا نکردید، پس از ورود می‌توانید یک درخواست جدید ثبت کنید.
            </p>
          </div>
          <div class="divide-y divide-border rounded-xl border border-border/80 bg-card">
            <details v-for="faq in faqs" :key="faq.q" class="group p-5">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                {{ faq.q }}
                <span class="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p class="mt-3 text-sm leading-7 text-muted-foreground">{{ faq.a }}</p>
            </details>
          </div>
        </div>
      </section>

      <section class="py-16 lg:py-20">
        <div class="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col items-start justify-between gap-6 rounded-2xl bg-slate-950 p-8 text-white sm:p-10 lg:flex-row lg:items-center">
            <div>
              <h2 class="text-xl font-bold sm:text-2xl">درخواست خود را ثبت کنید</h2>
              <p class="mt-2 max-w-xl text-sm leading-7 text-slate-400">
                حساب بسازید یا وارد شوید، موضوع را انتخاب کنید و پاسخ تیم پشتیبانی را در همان صفحه پیگیری کنید.
              </p>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" as-child>
                <NuxtLink to="/register">ساخت حساب</NuxtLink>
              </Button>
              <Button size="lg" variant="outline" class="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" as-child>
                <NuxtLink to="/login">ورود به مرکز پشتیبانی</NuxtLink>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-border/60 py-8">
      <div class="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <div class="flex items-center gap-2">
          <Headset class="size-4" aria-hidden="true" />
          <span>تیکت‌یار · مرکز پشتیبانی سرویس</span>
        </div>
        <div class="flex items-center gap-4">
          <NuxtLink to="/login" class="hover:text-foreground">ورود</NuxtLink>
          <NuxtLink to="/register" class="hover:text-foreground">ثبت‌نام</NuxtLink>
          <span dir="ltr" class="font-mono">{{ new Date().getFullYear() }} ©</span>
        </div>
      </div>
    </footer>
  </div>
</template>
