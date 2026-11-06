<script setup lang="ts">
import {
  ArrowLeft,
  Clock,
  Inbox,
  Ticket,
  Timer,
  TriangleAlert,
  UserX,
} from 'lucide-vue-next'
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '~~/shared/domain'
import type { AdminStats, Paginated, TicketSummary } from '~~/shared/types/api'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Select } from '~/components/ui/select'
import { Alert } from '~/components/ui/alert'
import { Skeleton } from '~/components/ui/skeleton'
import { useFormat } from '~/composables/useFormat'

definePageMeta({ layout: 'app', requiresAuth: true, role: 'ADMIN' })
useHead({ title: 'نمای کلی پشتیبانی | تیکت‌یار', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const request = useRequestFetch()
const { formatNumber } = useFormat()
const days = ref('30')

const { data: statsResponse, pending, error, refresh } = await useAsyncData(
  'admin-stats',
  () => request<{ data: AdminStats }>(`/api/admin/stats?days=${days.value}`),
  { watch: [days] },
)

const { data: urgentResponse, refresh: refreshUrgent } = await useAsyncData('admin-urgent', () =>
  request<{ data: Paginated<TicketSummary> }>('/api/tickets?priority=URGENT&pageSize=5&sort=updated'),
)
const { data: unassignedResponse, refresh: refreshUnassigned } = await useAsyncData(
  'admin-unassigned',
  () => request<{ data: Paginated<TicketSummary> }>('/api/tickets?scope=unassigned&pageSize=5&sort=updated'),
)

const { changed } = useRealtimeFeed()
let refreshTimer: ReturnType<typeof setTimeout> | null = null
watch(changed, () => {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    void refresh()
    void refreshUrgent()
    void refreshUnassigned()
  }, 300)
})
onBeforeUnmount(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
})

const stats = computed(() => statsResponse.value?.data)
const urgent = computed(() => urgentResponse.value?.data.items ?? [])
const unassigned = computed(() => unassignedResponse.value?.data.items ?? [])

const statusBars = computed(() =>
  stats.value
    ? TICKET_STATUSES.map((status) => ({
        label: STATUS_LABELS[status],
        value: stats.value!.totals[status],
        color:
          status === 'RESOLVED' || status === 'CLOSED'
            ? 'bg-emerald-500'
            : status === 'IN_PROGRESS'
              ? 'bg-amber-500'
              : 'bg-primary',
      }))
    : [],
)

const priorityBars = computed(() =>
  stats.value
    ? TICKET_PRIORITIES.map((priority) => ({
        label: PRIORITY_LABELS[priority],
        value: stats.value!.priority[priority],
        color: priority === 'URGENT' ? 'bg-destructive' : priority === 'HIGH' ? 'bg-amber-500' : 'bg-primary',
      }))
    : [],
)

const categoryBars = computed(() =>
  stats.value
    ? TICKET_CATEGORIES.map((category) => ({
        label: CATEGORY_LABELS[category],
        value: stats.value!.category[category],
        color: 'bg-primary',
      }))
    : [],
)
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="نمای کلی پشتیبانی" description="آمار واقعی صف پشتیبانی و روند ثبت و حل تیکت‌ها.">
      <template #actions>
        <Select
          v-model="days"
          class="w-36"
          aria-label="بازه زمانی آمار"
          :items="[
            { value: '7', label: '۷ روز اخیر' },
            { value: '30', label: '۳۰ روز اخیر' },
            { value: '90', label: '۹۰ روز اخیر' },
          ]"
        />
        <Button variant="outline" as-child>
          <NuxtLink to="/admin/tickets">
            صف تیکت‌ها
            <ArrowLeft class="size-4" />
          </NuxtLink>
        </Button>
      </template>
    </PageHeader>

    <Alert v-if="error" variant="destructive" title="دریافت آمار انجام نشد">
      <button type="button" class="font-medium underline underline-offset-4" @click="refresh()">تلاش دوباره</button>
    </Alert>

    <div v-if="pending || !stats" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton v-for="index in 6" :key="index" class="h-24 w-full" />
    </div>
    <template v-else>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="کل تیکت‌ها" :value="formatNumber(stats.totals.all)" :icon="Ticket" tone="primary" :hint="`${formatNumber(stats.createdToday)} تیکت امروز`" />
        <StatCard label="باز" :value="formatNumber(stats.totals.OPEN)" :icon="Inbox" tone="warning" />
        <StatCard label="در حال بررسی" :value="formatNumber(stats.totals.IN_PROGRESS)" :icon="Clock" tone="warning" />
        <StatCard label="منتظر پاسخ کاربر" :value="formatNumber(stats.totals.WAITING_FOR_USER)" hint="نیازمند پیگیری" />
        <StatCard label="بدون مسئول" :value="formatNumber(stats.unassigned)" :icon="UserX" :tone="stats.unassigned > 0 ? 'destructive' : 'default'" />
        <StatCard label="فوری و باز" :value="formatNumber(stats.urgentOpen)" :icon="TriangleAlert" :tone="stats.urgentOpen > 0 ? 'destructive' : 'success'" />
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader class="pb-2"><CardDescription>نرخ حل‌شدن</CardDescription></CardHeader>
          <CardContent><p class="text-2xl font-bold tabular">{{ formatNumber(stats.resolutionRate) }}٪</p></CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2"><CardDescription>میانگین زمان حل</CardDescription></CardHeader>
          <CardContent>
            <p class="flex items-center gap-2 text-2xl font-bold tabular">
              <Timer class="size-4 text-muted-foreground" aria-hidden="true" />
              {{ stats.averageResolutionHours === null ? '—' : formatNumber(stats.averageResolutionHours) }}
              <span v-if="stats.averageResolutionHours !== null" class="text-xs font-normal text-muted-foreground">ساعت</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2"><CardDescription>حل‌شده / بسته</CardDescription></CardHeader>
          <CardContent>
            <p class="text-2xl font-bold tabular">
              {{ formatNumber(stats.totals.RESOLVED) }} / {{ formatNumber(stats.totals.CLOSED) }}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>روند ثبت و حل تیکت‌ها</CardTitle>
          <CardDescription>
            داده‌های {{ formatNumber(stats.rangeDays) }} روز اخیر؛ بر اساس تاریخ ثبت و تاریخ حل‌شدن.
          </CardDescription>
        </CardHeader>
        <CardContent><TrendChart :data="stats.trend" /></CardContent>
      </Card>

      <div class="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle class="text-sm">توزیع وضعیت</CardTitle></CardHeader>
          <CardContent><DistributionBars :items="statusBars" :total="stats.totals.all" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle class="text-sm">توزیع اولویت</CardTitle></CardHeader>
          <CardContent><DistributionBars :items="priorityBars" :total="stats.totals.all" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle class="text-sm">توزیع دسته‌بندی</CardTitle></CardHeader>
          <CardContent><DistributionBars :items="categoryBars" :total="stats.totals.all" /></CardContent>
        </Card>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader class="flex-row items-center justify-between">
            <div>
              <CardTitle class="text-sm">تیکت‌های فوری</CardTitle>
              <CardDescription>اولویت فوری، مرتب‌شده بر اساس آخرین به‌روزرسانی.</CardDescription>
            </div>
          </CardHeader>
          <CardContent class="p-0">
            <TicketTable v-if="urgent.length" :tickets="urgent" show-requester />
            <p v-else class="px-5 pb-5 text-xs text-muted-foreground">تیکت فوری بازی وجود ندارد.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle class="text-sm">بدون مسئول</CardTitle>
            <CardDescription>تیکت‌های باز یا در حال بررسی بدون تخصیص.</CardDescription>
          </CardHeader>
          <CardContent class="p-0">
            <TicketTable v-if="unassigned.length" :tickets="unassigned" show-requester />
            <p v-else class="px-5 pb-5 text-xs text-muted-foreground">همه تیکت‌های فعال مسئول دارند.</p>
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>
