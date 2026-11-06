<script setup lang="ts">
import { Plus, RefreshCw, Ticket } from 'lucide-vue-next'
import type { Paginated, TicketSummary } from '~~/shared/types/api'
import { Button } from '~/components/ui/button'
import { Alert } from '~/components/ui/alert'
import { Skeleton } from '~/components/ui/skeleton'
import { Card, CardContent } from '~/components/ui/card'
import type { TicketFilterState } from '~/types/ui'

definePageMeta({ layout: 'app', requiresAuth: true })
useHead({ title: 'تیکت‌های من | تیکت‌یار', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const request = useRequestFetch()
const page = ref(1)
const filters = ref<TicketFilterState>({
  q: '',
  status: 'all',
  priority: 'all',
  category: 'all',
  sort: 'updated',
  scope: 'all',
})

const query = computed(() => {
  const params = new URLSearchParams({
    page: String(page.value),
    pageSize: '10',
    sort: filters.value.sort || 'updated',
  })
  if (filters.value.q) params.set('q', filters.value.q)
  if (filters.value.status !== 'all') params.set('status', filters.value.status)
  if (filters.value.priority !== 'all') params.set('priority', filters.value.priority)
  if (filters.value.category !== 'all') params.set('category', filters.value.category)
  return params.toString()
})

const { data, pending, error, refresh } = await useAsyncData(
  'my-tickets',
  () => request<{ data: Paginated<TicketSummary> }>(`/api/tickets?${query.value}`),
  { watch: [query] },
)

const result = computed(() => data.value?.data)
const tickets = computed(() => result.value?.items ?? [])

const { changed } = useRealtimeFeed()
let refreshTimer: ReturnType<typeof setTimeout> | null = null
watch(changed, () => {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => refresh(), 300)
})
onBeforeUnmount(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
})

function applyFilters(): void {
  page.value = 1
}

function goToPage(next: number): void {
  page.value = next
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="تیکت‌های من" description="همه درخواست‌های ثبت‌شده و وضعیت فعلی آن‌ها.">
      <template #actions>
        <Button variant="outline" :disabled="pending" @click="refresh()">
          <RefreshCw class="size-4" :class="pending ? 'animate-spin' : ''" />
          به‌روزرسانی
        </Button>
        <Button as-child>
          <NuxtLink to="/tickets/new">
            <Plus class="size-4" />
            ثبت تیکت جدید
          </NuxtLink>
        </Button>
      </template>
    </PageHeader>

    <TicketFilters v-model:filters="filters" @apply="applyFilters" />

    <Alert v-if="error" variant="destructive" title="دریافت فهرست انجام نشد">
      اتصال به سرور برقرار نشد.
      <button type="button" class="font-medium underline underline-offset-4" @click="refresh()">تلاش دوباره</button>
    </Alert>

    <Card>
      <CardContent class="p-0 sm:p-2">
        <div v-if="pending" class="space-y-3 p-4">
          <Skeleton v-for="index in 5" :key="index" class="h-14 w-full" />
        </div>
        <div v-else-if="tickets.length === 0" class="p-4">
          <EmptyState
            :icon="Ticket"
            title="تیکتی با این فیلترها پیدا نشد"
            description="می‌توانید فیلترها را پاک کنید یا یک درخواست جدید ثبت کنید."
          >
            <Button size="sm" as-child><NuxtLink to="/tickets/new">ثبت تیکت</NuxtLink></Button>
          </EmptyState>
        </div>
        <template v-else>
          <TicketTable :tickets="tickets" />
        </template>
      </CardContent>
    </Card>

    <AppPagination
      v-if="result && result.total > 0"
      :page="result.page"
      :total-pages="result.totalPages"
      :total="result.total"
      @update:page="goToPage"
    />
  </div>
</template>
