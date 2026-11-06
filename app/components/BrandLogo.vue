<script setup lang="ts">
import { Headset } from 'lucide-vue-next'

defineProps<{ compact?: boolean }>()
</script>

<template>
  <NuxtLink to="/" class="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="تیکت‌یار، صفحه اصلی">
    <span class="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
      <Headset class="size-5" aria-hidden="true" />
    </span>
    <span v-if="!compact" class="flex flex-col leading-tight">
      <span class="text-base font-bold tracking-tight">تیکت‌یار</span>
      <span class="text-[10px] font-medium text-muted-foreground">مرکز پشتیبانی</span>
    </span>
  </NuxtLink>
</template>
