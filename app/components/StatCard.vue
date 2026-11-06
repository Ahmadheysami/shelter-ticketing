<script setup lang="ts">
import type { Component } from 'vue'

const props = defineProps<{
  label: string
  value: string | number
  icon?: Component
  hint?: string
  tone?: 'default' | 'primary' | 'warning' | 'success' | 'destructive'
}>()

const tones: Record<string, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  destructive: 'bg-destructive/10 text-destructive',
}
</script>

<template>
  <div class="rounded-xl border border-border/80 bg-card p-5 shadow-xs">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-xs font-medium text-muted-foreground">{{ props.label }}</p>
        <p class="mt-2 text-2xl font-bold tabular text-foreground">{{ props.value }}</p>
        <p v-if="props.hint" class="mt-1 text-xs leading-5 text-muted-foreground">{{ props.hint }}</p>
      </div>
      <span
        v-if="props.icon"
        :class="['inline-flex size-9 shrink-0 items-center justify-center rounded-lg', tones[props.tone ?? 'default']]"
        aria-hidden="true"
      >
        <component :is="props.icon" class="size-4.5" />
      </span>
    </div>
  </div>
</template>
