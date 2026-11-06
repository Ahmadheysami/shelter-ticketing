<script setup lang="ts">
import { cn } from '~/lib/utils'

defineOptions({ inheritAttrs: false })
const model = defineModel<string>()
const props = defineProps<{ class?: string }>()
</script>

<template>
  <textarea
    v-model="model"
    :class="
      cn(
        'flex min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-7 shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive',
        props.class,
      )
    "
    v-bind="$attrs"
  />
</template>
