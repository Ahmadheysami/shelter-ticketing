<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '~/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        success: 'border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        warning: 'border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-300',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
        info: 'border-transparent bg-sky-500/10 text-sky-700 dark:text-sky-300',
        muted: 'border-transparent bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

type BadgeVariants = VariantProps<typeof badgeVariants>
const props = defineProps<{ variant?: BadgeVariants['variant']; class?: string }>()
</script>

<template>
  <span :class="cn(badgeVariants({ variant: props.variant }), props.class)"><slot /></span>
</template>
