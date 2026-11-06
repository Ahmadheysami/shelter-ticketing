<script setup lang="ts">
import { cn } from '~/lib/utils'
const props = defineProps<{ class?: string }>()
</script>

<template>
  <div class="w-full overflow-x-auto scrollbar-thin">
    <table :class="cn('w-full caption-bottom border-collapse text-sm', props.class)">
      <slot />
    </table>
  </div>
</template>
