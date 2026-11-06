<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'

interface DistributionItem {
  label: string
  value: number
  color?: string
}

const props = defineProps<{ items: DistributionItem[]; total?: number }>()
const { formatNumber } = useFormat()

const maxValue = computed(() => Math.max(1, ...props.items.map((item) => item.value)))
</script>

<template>
  <ul class="space-y-3.5">
    <li v-for="item in props.items" :key="item.label" class="space-y-1.5">
      <div class="flex items-center justify-between gap-3 text-xs">
        <span class="text-foreground">{{ item.label }}</span>
        <span class="tabular text-muted-foreground">
          {{ formatNumber(item.value) }}
          <span v-if="props.total" class="text-[10px]">
            ({{ formatNumber(Math.round((item.value / Math.max(1, props.total)) * 100)) }}٪)
          </span>
        </span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div
          class="h-full rounded-full transition-[width] duration-500"
          :class="item.color ?? 'bg-primary'"
          :style="{ width: `${Math.max(item.value > 0 ? 3 : 0, (item.value / maxValue) * 100)}%` }"
        />
      </div>
    </li>
  </ul>
</template>
