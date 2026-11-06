<script setup lang="ts">
import { Inbox, RefreshCw } from 'lucide-vue-next'
import type { Paginated, TicketSummary } from '~~/shared/types/api'
import { Alert } from '~/components/ui/alert'
import { Card, CardContent } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import type { TicketFilterState } from '~/types/ui'

definePageMeta({ layout: 'app', requiresAuth: true, role: 'ADMIN' })
useHead({ title: 'صف تیکت‌ها | تیکت‌یار', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

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
    pageSize: '12',
    sort: filters.value.sort || 'updated',
  })
  if (filters.value.q) params.set('q', filters.value.q)
  if (filters.value.status !== 'all') params.set('status', filters.value.status)
  if (filters.value.priority !== 'all') params.set('priority', filters.value.priority)
  if (filters.value.category !== 'all') params.set('category', filters.value.category)
  if (filters.value.scope !== 'all') params.set('scope', filters.value.scope)
  return params.toString()
})

const { data, pending, error, refresh } = await useAsyncData(
  'admin-ticket-queue',
  () => request<{ data: Paginated<TicketSummary> }>(`/api/tickets?${query.value}`),
  { watch: [query] },
)

const result = computed(() => data.value?.data)
const tickets = computed(() => result.value?.items ?? [])

// Statuses, priorities, and assignments change from the ticket detail page or
// another staff session. Refetch the queue when the server announces a change.
const { connected, changed } = useRealtimeFeed()
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
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="صف تیکت‌ها"
      description="جستجو، فیلتر و پیگیری همه درخواست‌های ثبت‌شده. برای تخصیص و تغییر وضعیت، تیکت را باز کنید."
    >
      <template #actions>
        <span
          class="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
          :title="connected ? 'دریافت تغییرات به‌صورت لحظه‌ای' : 'اتصال لحظه‌ای برقرار نیست'"
        >
          <span
            class="size-1.5 rounded-full"
            :class="connected ? 'bg-emerald-500' : 'bg-muted-foreground/40'"
            aria-hidden="true"
          />
          {{ connected ? 'به‌روزرسانی لحظه‌ای' : 'به‌روزرسانی دستی' }}
        </span>
        <Button variant="outline" :disabled="pending" @click="refresh()">
          <RefreshCw class="size-4" :class="pending ? 'animate-spin' : ''" />
          به‌روزرسانی
        </Button>
      </template>
    </PageHeader>

    <TicketFilters v-model:filters="filters" show-scope @apply="applyFilters" />

    <Alert v-if="error" variant="destructive">
      دریافت صف تیکت‌ها انجام نشد.
      <button type="button" class="font-medium underline underline-offset-4" @click="refresh()">تلاش دوباره</button>
    </Alert>

    <Card>
      <CardContent class="p-0 sm:p-2">
        <div v-if="pending" class="space-y-3 p-4">
          <Skeleton v-for="index in 6" :key="index" class="h-14 w-full" />
        </div>
        <div v-else-if="tickets.length === 0" class="p-4">
          <EmptyState :icon="Inbox" title="تیکتی پیدا نشد" description="فیلترها را تغییر دهید یا از محدوده «همه تیکت‌ها» استفاده کنید." />
        </div>
        <TicketTable v-else :tickets="tickets" show-requester />
      </CardContent>
    </Card>

    <AppPagination
      v-if="result && result.total > 0"
      :page="result.page"
      :total-pages="result.totalPages"
      :total="result.total"
      @update:page="page = $event"
    />
  </div>
</template>
