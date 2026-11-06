<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { useFormat } from '~/composables/useFormat'

const props = defineProps<{ page: number; totalPages: number; total: number }>()
const emit = defineEmits<{ 'update:page': [number] }>()
const { formatNumber } = useFormat()
</script>

<template>
  <nav class="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="صفحه‌بندی">
    <p class="text-xs text-muted-foreground">
      {{ formatNumber(props.total) }} مورد · صفحه {{ formatNumber(props.page) }} از
      {{ formatNumber(props.totalPages) }}
    </p>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        :disabled="props.page <= 1"
        aria-label="صفحه قبل"
        @click="emit('update:page', props.page - 1)"
      >
        <ChevronRight class="size-4" />
        قبلی
      </Button>
      <Button
        variant="outline"
        size="sm"
        :disabled="props.page >= props.totalPages"
        aria-label="صفحه بعد"
        @click="emit('update:page', props.page + 1)"
      >
        بعدی
        <ChevronLeft class="size-4" />
      </Button>
    </div>
  </nav>
</template>
