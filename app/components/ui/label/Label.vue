<script setup lang="ts">
import { cn } from '~/lib/utils'

const props = defineProps<{ for?: string; class?: string; required?: boolean }>()
</script>

<template>
  <label :for="props.for" :class="cn('block text-sm font-medium leading-6 text-foreground', props.class)">
    <slot />
    <span v-if="props.required" class="text-destructive" aria-hidden="true">*</span>
  </label>
</template>
