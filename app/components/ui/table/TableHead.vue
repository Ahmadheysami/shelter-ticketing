<script setup lang="ts">
import { cn } from '~/lib/utils'
const props = defineProps<{ class?: string }>()
</script>

<template>
  <th
    scope="col"
    :class="cn('h-11 px-3 text-start align-middle text-xs font-medium text-muted-foreground', props.class)"
  >
    <slot />
  </th>
</template>
