<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '~/lib/utils'

const props = defineProps<{ name: string; class?: string }>()

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '؟'
  if (parts.length === 1) return parts[0]!.slice(0, 2)
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`
})
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex size-9 shrink-0 select-none items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary',
        props.class,
      )
    "
    aria-hidden="true"
  >
    {{ initials }}
  </span>
</template>
