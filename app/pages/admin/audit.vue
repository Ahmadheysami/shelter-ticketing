<script setup lang="ts">
import { ScrollText } from 'lucide-vue-next'
import { AUDIT_ACTION_LABELS } from '~~/shared/domain'
import type { AuditLogRow, Paginated } from '~~/shared/types/api'
import { Alert } from '~/components/ui/alert'
import { Card, CardContent } from '~/components/ui/card'
import { Select } from '~/components/ui/select'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { useFormat } from '~/composables/useFormat'

definePageMeta({ layout: 'app', requiresAuth: true, role: 'OWNER' })
useHead({ title: 'رویدادهای امنیتی | تیکت‌یار', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const request = useRequestFetch()
const { formatDateTime } = useFormat()

const action = ref('all')
const page = ref(1)

const query = computed(() => {
  const params = new URLSearchParams({ page: String(page.value), pageSize: '20' })
  if (action.value !== 'all') params.set('action', action.value)
  return params.toString()
})

const { data, pending, error, refresh } = await useAsyncData(
  'owner-audit-log',
  () => request<{ data: Paginated<AuditLogRow> }>(`/api/admin/audit?${query.value}`),
  { watch: [query] },
)

const result = computed(() => data.value?.data)
const logs = computed(() => result.value?.items ?? [])

const actionItems = [
  { value: 'all', label: 'همه رویدادها' },
  ...Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label })),
]

function summarizeMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata) return '—'
  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ')
    .slice(0, 140)
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="رویدادهای امنیتی"
      description="ورود، تغییر نقش، تغییر وضعیت تیکت و تخصیص‌های انجام‌شده در سامانه."
    >
      <template #actions>
        <Select v-model="action" :items="actionItems" class="w-56" aria-label="فیلتر نوع رویداد" @update:model-value="page = 1" />
      </template>
    </PageHeader>

    <Alert v-if="error" variant="destructive">
      دریافت رویدادها انجام نشد.
      <button type="button" class="font-medium underline underline-offset-4" @click="refresh()">تلاش دوباره</button>
    </Alert>

    <Card>
      <CardContent class="p-0 sm:p-2">
        <div v-if="pending" class="space-y-2 p-4">
          <Skeleton v-for="index in 6" :key="index" class="h-12 w-full" />
        </div>
        <Table v-else>
          <TableHeader>
            <TableRow class="hover:bg-transparent">
              <TableHead class="w-48">رویداد</TableHead>
              <TableHead class="w-40">کاربر</TableHead>
              <TableHead class="w-32">موجودیت</TableHead>
              <TableHead>جزئیات</TableHead>
              <TableHead class="w-36">زمان</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="log in logs" :key="log.id">
              <TableCell>
                <Badge variant="outline">{{ AUDIT_ACTION_LABELS[log.action] ?? log.action }}</Badge>
              </TableCell>
              <TableCell class="text-xs">
                <span v-if="log.actor">{{ log.actor.name }}</span>
                <span v-else class="text-muted-foreground">سیستم / ناشناس</span>
              </TableCell>
              <TableCell>
                <span class="text-xs text-muted-foreground" dir="ltr">
                  {{ log.entityType }}<template v-if="log.entityId">:{{ log.entityId.slice(0, 8) }}</template>
                </span>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">{{ summarizeMetadata(log.metadata) }}</TableCell>
              <TableCell class="text-xs text-muted-foreground">{{ formatDateTime(log.createdAt) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div v-if="!pending && logs.length === 0" class="p-6">
          <EmptyState :icon="ScrollText" title="رویدادی ثبت نشده است" description="با انجام عملیات مدیریتی، رویدادها اینجا نمایش داده می‌شوند." />
        </div>
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
