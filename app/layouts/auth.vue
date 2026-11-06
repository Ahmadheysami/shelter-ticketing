<script setup lang="ts">
import { CheckCircle2 } from 'lucide-vue-next'

const benefits = [
  'ثبت ساختارمند درخواست با دسته‌بندی و اولویت',
  'پیگیری وضعیت و مکالمه در یک‌جا',
  'پاسخ شفاف تیم پشتیبانی و تاریخچه کامل',
  'ورود دومرحله‌ای برای حساب‌های مدیریتی',
]
</script>

<template>
  <div class="grid min-h-dvh lg:grid-cols-[1fr_0.9fr]">
    <div class="flex flex-col px-5 py-6 sm:px-10">
      <BrandLogo />
      <main class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <slot />
      </main>
      <p class="text-[11px] leading-6 text-muted-foreground">
        با ورود، قوانین استفاده و سیاست حفظ حریم خصوصی را می‌پذیرید.
      </p>
    </div>

    <aside class="relative hidden overflow-hidden bg-slate-950 p-10 text-slate-100 lg:flex lg:flex-col lg:justify-between">
      <div
        class="pointer-events-none absolute -start-20 -top-24 size-80 rounded-full bg-indigo-500/20 blur-3xl"
        aria-hidden="true"
      />
      <div class="relative">
        <p class="text-xs font-medium tracking-wide text-indigo-300">تیکت‌یار</p>
        <h2 class="mt-4 max-w-sm text-2xl font-bold leading-relaxed text-balance">
          هر درخواست، یک مسیر روشن تا حل شدن.
        </h2>
        <p class="mt-3 max-w-sm text-sm leading-7 text-slate-400">
          تیم پشتیبانی و کاربران در یک فضای مشترک، با تاریخچه کامل و بدون پیگیری‌های پراکنده.
        </p>
      </div>
      <ul class="relative space-y-3 text-sm text-slate-300">
        <li v-for="benefit in benefits" :key="benefit" class="flex items-start gap-2.5">
          <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-indigo-400" aria-hidden="true" />
          {{ benefit }}
        </li>
      </ul>
      <div class="relative rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-6 text-slate-400">
        هر درخواست فقط برای شما و تیم پشتیبانی قابل مشاهده است.
      </div>
    </aside>
  </div>
</template>
