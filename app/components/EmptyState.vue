<script setup lang="ts">
import type { Component } from 'vue'
import { Inbox } from 'lucide-vue-next'

const props = defineProps<{
  title: string
  description?: string
  icon?: Component
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
    <span class="inline-flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <component :is="props.icon ?? Inbox" class="size-5" aria-hidden="true" />
    </span>
    <h2 class="text-sm font-semibold text-foreground">{{ props.title }}</h2>
    <p v-if="props.description" class="max-w-sm text-sm leading-6 text-muted-foreground">
      {{ props.description }}
    </p>
    <div v-if="$slots.default" class="mt-1"><slot /></div>
  </div>
</template>
