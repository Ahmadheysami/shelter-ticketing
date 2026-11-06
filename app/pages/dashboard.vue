<script setup lang="ts">
import { ArrowLeft, Clock, MessageSquare, Plus, Ticket, TriangleAlert } from 'lucide-vue-next'
import type { Paginated, TicketSummary, UserDashboardStats } from '~~/shared/types/api'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { Alert } from '~/components/ui/alert'
import { useAuth } from '~/composables/useAuth'
import { useFormat } from '~/composables/useFormat'

definePageMeta({ layout: 'app', requiresAuth: true })
useHead({ title: 'داشبورد | تیکت‌یار', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const { user } = useAuth()
const { formatNumber } = useFormat()
const request = useRequestFetch()

const { data: statsResponse, pending: statsPending, error: statsError } = await useAsyncData(
  'dashboard-user-stats',
  () => request<{ data: UserDashboardStats }>('/api/dashboard/stats'),
)

const { data: recentResponse, pending: recentPending } = await useAsyncData(
  'dashboard-recent-tickets',
  () => request<{ data: Paginated<TicketSummary> }>('/api/tickets?pageSize=5&sort=updated'),
)

const stats = computed(() => statsResponse.value?.data)
const recent = computed(() => recentResponse.value?.data.items ?? [])
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="`سلام ${user?.name ?? ''}`"
      description="وضعیت درخواست‌های شما در یک نگاه. برای پیگیری هر تیکت، روی آن بزنید."
    >
      <template #actions>
        <Button as-child>
          <NuxtLink to="/tickets/new">
            <Plus class="size-4" />
            ثبت تیکت جدید
          </NuxtLink>
        </Button>
      </template>
    </PageHeader>

    <Alert v-if="user && !user.emailVerified" variant="warning" title="ایمیل شما هنوز تأیید نشده است">
      برای دریافت اطلاع‌رسانی‌های حساب، ایمیل خود را از بخش
      <NuxtLink to="/settings" class="font-medium underline underline-offset-4">تنظیمات</NuxtLink>
      تأیید کنید.
    </Alert>

    <Alert v-if="statsError" variant="destructive">
      دریافت آمار داشبورد انجام نشد. صفحه را دوباره بارگذاری کنید.
    </Alert>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <template v-if="statsPending">
        <div v-for="index in 4" :key="index" class="rounded-xl border bg-card p-5">
          <Skeleton class="h-3 w-20" />
          <Skeleton class="mt-3 h-7 w-12" />
        </div>
      </template>
      <template v-else-if="stats">
        <StatCard label="همه تیکت‌ها" :value="formatNumber(stats.total)" :icon="Ticket" tone="primary" />
        <StatCard label="در جریان" :value="formatNumber(stats.open)" :icon="Clock" tone="warning" hint="باز یا در حال بررسی" />
        <StatCard label="منتظر پاسخ شما" :value="formatNumber(stats.waiting)" :icon="MessageSquare" hint="پاسخ شما لازم است" />
        <StatCard label="فوری" :value="formatNumber(stats.urgent)" :icon="TriangleAlert" :tone="stats.urgent > 0 ? 'destructive' : 'default'" hint="اولویت فوری و باز" />
      </template>
    </div>

    <Card>
      <CardHeader class="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>تیکت‌های اخیر</CardTitle>
          <CardDescription>آخرین درخواست‌هایی که روی آن‌ها فعالیت شده است.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" as-child>
          <NuxtLink to="/tickets">
            مشاهده همه
            <ArrowLeft class="size-3.5" />
          </NuxtLink>
        </Button>
      </CardHeader>
      <CardContent>
        <div v-if="recentPending" class="space-y-3">
          <Skeleton v-for="index in 3" :key="index" class="h-14 w-full" />
        </div>
        <div v-else-if="recent.length === 0">
          <EmptyState
            title="هنوز تیکتی ثبت نکرده‌اید"
            description="اگر سوال یا مشکلی دارید، اولین درخواست خود را ثبت کنید تا تیم پشتیبانی بررسی کند."
          >
            <Button as-child size="sm">
              <NuxtLink to="/tickets/new">ثبت اولین تیکت</NuxtLink>
            </Button>
          </EmptyState>
        </div>
        <TicketTable v-else :tickets="recent" />
      </CardContent>
    </Card>
  </div>
</template>
