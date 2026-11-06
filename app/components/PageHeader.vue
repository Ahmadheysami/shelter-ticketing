<script setup lang="ts">
const props = defineProps<{ title: string; description?: string }>()
</script>

<template>
  <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div class="space-y-1.5">
      <h1 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{{ props.title }}</h1>
      <p v-if="props.description" class="max-w-2xl text-sm leading-7 text-muted-foreground">
        {{ props.description }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
