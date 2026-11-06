<script setup lang="ts">
import { Search, SlidersHorizontal, X } from 'lucide-vue-next'
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '~~/shared/domain'
import { Input } from '~/components/ui/input'
import { Select } from '~/components/ui/select'
import { Button } from '~/components/ui/button'
import type { TicketFilterState } from '~/types/ui'

const props = defineProps<{
  staffMode?: boolean
  showScope?: boolean
}>()

const filters = defineModel<TicketFilterState>('filters', { required: true })
const emit = defineEmits<{ apply: [] }>()

const searchInput = ref(filters.value.q)

watch(
  () => filters.value.q,
  (value) => {
    searchInput.value = value
  },
)

const statusItems = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  ...TICKET_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
]
const priorityItems = [
  { value: 'all', label: 'همه اولویت‌ها' },
  ...TICKET_PRIORITIES.map((priority) => ({ value: priority, label: PRIORITY_LABELS[priority] })),
]
const categoryItems = [
  { value: 'all', label: 'همه دسته‌ها' },
  ...TICKET_CATEGORIES.map((category) => ({ value: category, label: CATEGORY_LABELS[category] })),
]
const sortItems = [
  { value: 'updated', label: 'آخرین به‌روزرسانی' },
  { value: 'created', label: 'تاریخ ثبت' },
]
const scopeItems = [
  { value: 'all', label: 'همه تیکت‌ها' },
  { value: 'unassigned', label: 'بدون مسئول' },
  { value: 'mine', label: 'ثبت‌شده توسط من' },
]

function update<K extends keyof TicketFilterState>(key: K, value: TicketFilterState[K]): void {
  filters.value = { ...filters.value, [key]: value }
}

function submitSearch(): void {
  update('q', searchInput.value.trim())
  emit('apply')
}

function reset(): void {
  searchInput.value = ''
  filters.value = {
    q: '',
    status: 'all',
    priority: 'all',
    category: 'all',
    sort: 'updated',
    scope: 'all',
  }
  emit('apply')
}

const hasFilters = computed(
  () =>
    Boolean(filters.value.q) ||
    filters.value.status !== 'all' ||
    filters.value.priority !== 'all' ||
    filters.value.category !== 'all' ||
    (props.showScope && filters.value.scope !== 'all'),
)
</script>

<template>
  <form
    class="rounded-xl border border-border/80 bg-card p-4 shadow-xs"
    role="search"
    aria-label="جستجو و فیلتر تیکت‌ها"
    @submit.prevent="submitSearch"
  >
    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-2 sm:flex-row">
        <div class="relative flex-1">
          <Search class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            v-model="searchInput"
            type="search"
            class="ps-9"
            placeholder="جستجو در عنوان یا شماره تیکت…"
            aria-label="جستجوی تیکت"
          />
        </div>
        <Button type="submit" class="sm:w-auto">
          <Search class="size-4" />
          جستجو
        </Button>
      </div>

      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          :model-value="filters.status"
          :items="statusItems"
          aria-label="فیلتر وضعیت"
          @update:model-value="update('status', $event)"
        />
        <Select
          :model-value="filters.priority"
          :items="priorityItems"
          aria-label="فیلتر اولویت"
          @update:model-value="update('priority', $event)"
        />
        <Select
          :model-value="filters.category"
          :items="categoryItems"
          aria-label="فیلتر دسته‌بندی"
          @update:model-value="update('category', $event)"
        />
        <Select
          v-if="props.showScope"
          :model-value="filters.scope"
          :items="scopeItems"
          aria-label="محدوده تیکت‌ها"
          @update:model-value="update('scope', $event)"
        />
        <Select
          v-else
          :model-value="filters.sort"
          :items="sortItems"
          aria-label="ترتیب نمایش"
          @update:model-value="update('sort', $event)"
        />
      </div>

      <div v-if="props.showScope" class="flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <SlidersHorizontal class="size-3.5" />
          ترتیب:
        </span>
        <Select
          :model-value="filters.sort"
          :items="sortItems"
          class="h-8 w-44 text-xs"
          aria-label="ترتیب نمایش"
          @update:model-value="update('sort', $event)"
        />
        <Button v-if="hasFilters" type="button" variant="ghost" size="sm" @click="reset">
          <X class="size-3.5" />
          پاک کردن فیلترها
        </Button>
      </div>
      <div v-else-if="hasFilters" class="flex justify-end">
        <Button type="button" variant="ghost" size="sm" @click="reset">
          <X class="size-3.5" />
          پاک کردن فیلترها
        </Button>
      </div>
    </div>
  </form>
</template>
