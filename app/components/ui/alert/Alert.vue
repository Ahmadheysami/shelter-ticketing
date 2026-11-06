<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '~/lib/utils'

const alertVariants = cva('flex gap-3 rounded-lg border p-4 text-sm leading-6', {
  variants: {
    variant: {
      info: 'border-sky-500/30 bg-sky-500/5 text-sky-900 dark:text-sky-200',
      success: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200',
      warning: 'border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200',
      destructive: 'border-destructive/30 bg-destructive/5 text-destructive',
      default: 'border-border bg-muted/50 text-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

const props = defineProps<{
  variant?: VariantProps<typeof alertVariants>['variant']
  title?: string
  class?: string
}>()
</script>

<template>
  <div role="alert" :class="cn(alertVariants({ variant: props.variant }), props.class)">
    <slot name="icon" />
    <div class="min-w-0 flex-1">
      <p v-if="props.title" class="font-semibold">{{ props.title }}</p>
      <div :class="props.title ? 'mt-0.5' : ''"><slot /></div>
    </div>
  </div>
</template>
