<script setup lang="ts">
import type { NuxtError } from '#app'
import { Button } from '~/components/ui/button'

const props = defineProps<{ error: NuxtError }>()
useHead({ title: 'خطا | تیکت‌یار', htmlAttrs: { lang: 'fa', dir: 'rtl' } })

const isNotFound = computed(() => props.error.statusCode === 404)
const title = computed(() => (isNotFound.value ? 'صفحه پیدا نشد' : 'مشکلی پیش آمد'))
const description = computed(() =>
  isNotFound.value
    ? 'نشانی واردشده وجود ندارد یا دسترسی به آن مجاز نیست.'
    : 'درخواست شما انجام نشد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.',
)
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
    <span class="text-7xl font-bold tracking-tight text-muted-foreground/40">
      {{ error.statusCode }}
    </span>
    <h1 class="text-2xl font-bold">{{ title }}</h1>
    <p class="max-w-md text-sm leading-7 text-muted-foreground">{{ description }}</p>
    <Button @click="clearError({ redirect: '/' })">بازگشت به صفحه اصلی</Button>
  </div>
</template>
