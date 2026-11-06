<script setup lang="ts">
import { ArrowRight, CalendarDays, RefreshCw, User } from 'lucide-vue-next'
import { CATEGORY_LABELS, STATUS_DESCRIPTIONS } from '~~/shared/domain'
import type { TicketDetail } from '~~/shared/types/api'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Alert } from '~/components/ui/alert'
import { Skeleton } from '~/components/ui/skeleton'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import { apiFetch, errorMessage } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'
import { useFormat } from '~/composables/useFormat'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'app', requiresAuth: true })
useHead({ title: 'جزئیات تیکت | تیکت‌یار', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const route = useRoute()
const request = useRequestFetch()
const { user, isStaff } = useAuth()
const { formatDateTime } = useFormat()
const { toast } = useToast()

const ticketId = computed(() => Number(route.params.id))

const { data, pending, error, refresh } = await useAsyncData(
  `ticket-${ticketId.value}`,
  () => request<{ data: TicketDetail }>(`/api/tickets/${ticketId.value}`),
)

const ticket = computed(() => data.value?.data)
const loadError = computed(() => {
  if (!error.value) return ''
  const status = (error.value as { statusCode?: number }).statusCode
  return status === 404 ? 'تیکت یافت نشد یا دسترسی به آن مجاز نیست.' : 'دریافت تیکت انجام نشد.'
})

const { changed } = useTicketRealtime(() => ticketId.value)
let refetchTimer: ReturnType<typeof setTimeout> | null = null
watch(changed, () => {
  if (refetchTimer) clearTimeout(refetchTimer)
  refetchTimer = setTimeout(() => {
    refresh()
  }, 250)
})
onBeforeUnmount(() => {
  if (refetchTimer) clearTimeout(refetchTimer)
})

const actionBusy = ref(false)
const actionError = ref('')
const confirmOpen = ref(false)
const confirmAction = ref<'CLOSED' | 'OPEN'>('CLOSED')

const confirmCopy = computed(() =>
  confirmAction.value === 'CLOSED'
    ? {
        title: 'بستن تیکت',
        description: 'آیا از بستن این تیکت مطمئن هستید؟ تا ۱۴ روز می‌توانید آن را بازگشایی کنید.',
        label: 'بستن تیکت',
      }
    : {
        title: 'بازگشایی تیکت',
        description: 'این تیکت دوباره در وضعیت «باز» قرار می‌گیرد و تیم پشتیبانی آن را بررسی می‌کند.',
        label: 'بازگشایی',
      },
)

function askAction(action: 'CLOSED' | 'OPEN'): void {
  confirmAction.value = action
  confirmOpen.value = true
}

async function runAction(): Promise<void> {
  actionError.value = ''
  actionBusy.value = true
  try {
    await apiFetch(`/api/tickets/${ticketId.value}`, {
      method: 'PATCH',
      body: { status: confirmAction.value },
    })
    confirmOpen.value = false
    toast({ title: 'وضعیت تیکت به‌روزرسانی شد', variant: 'success' })
    await refresh()
  } catch (caught) {
    actionError.value = errorMessage(caught)
    confirmOpen.value = false
  } finally {
    actionBusy.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <NuxtLink
        :to="isStaff ? '/admin/tickets' : '/tickets'"
        class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowRight class="size-3.5" />
        {{ isStaff ? 'بازگشت به صف تیکت‌ها' : 'بازگشت به تیکت‌ها' }}
      </NuxtLink>
      <Button variant="outline" size="sm" :disabled="pending" @click="refresh()">
        <RefreshCw class="size-3.5" :class="pending ? 'animate-spin' : ''" />
        به‌روزرسانی
      </Button>
    </div>

    <Alert v-if="loadError" variant="destructive" title="خطا">
      {{ loadError }}
      <button type="button" class="ms-1 font-medium underline underline-offset-4" @click="refresh()">تلاش دوباره</button>
    </Alert>
    <Alert v-if="actionError" variant="destructive">{{ actionError }}</Alert>

    <div v-if="pending && !ticket" class="space-y-4">
      <Skeleton class="h-8 w-2/3" />
      <Skeleton class="h-32 w-full" />
      <Skeleton class="h-48 w-full" />
    </div>

    <template v-else-if="ticket">
      <header class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-mono text-xs text-muted-foreground" dir="ltr">{{ ticket.publicId }}</span>
          <StatusBadge :status="ticket.status" />
          <PriorityBadge :priority="ticket.priority" />
          <span class="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {{ CATEGORY_LABELS[ticket.category] }}
          </span>
        </div>
        <h1 class="text-xl font-bold leading-8 tracking-tight sm:text-2xl">{{ ticket.subject }}</h1>
        <p class="text-xs leading-6 text-muted-foreground">{{ STATUS_DESCRIPTIONS[ticket.status] }}</p>

        <dl class="grid gap-3 rounded-xl border border-border/80 bg-card p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt class="text-muted-foreground">درخواست‌دهنده</dt>
            <dd class="mt-1 inline-flex items-center gap-1.5 font-medium">
              <User class="size-3.5 text-muted-foreground" aria-hidden="true" />
              {{ ticket.requester.name }}
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground">مسئول بررسی</dt>
            <dd class="mt-1 font-medium">{{ ticket.assignee?.name ?? 'هنوز تعیین نشده' }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">تاریخ ثبت</dt>
            <dd class="mt-1 inline-flex items-center gap-1.5 font-medium">
              <CalendarDays class="size-3.5 text-muted-foreground" aria-hidden="true" />
              {{ formatDateTime(ticket.createdAt) }}
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground">آخرین به‌روزرسانی</dt>
            <dd class="mt-1 font-medium">{{ formatDateTime(ticket.lastMessageAt) }}</dd>
          </div>
        </dl>
      </header>

      <div class="grid gap-6" :class="isStaff ? 'lg:grid-cols-[1fr_20rem]' : ''">
        <div class="min-w-0 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>شرح اولیه درخواست</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="whitespace-pre-wrap break-words text-sm leading-7" dir="auto">{{ ticket.description }}</p>
            </CardContent>
          </Card>

          <section class="space-y-3" aria-labelledby="conversation-title">
            <div class="flex items-center justify-between">
              <h2 id="conversation-title" class="text-sm font-semibold">گفتگو</h2>
              <span class="text-[11px] text-muted-foreground">{{ ticket.messagesTotal }} پیام</span>
            </div>
            <p v-if="ticket.messagesTotal > ticket.messages.length" class="rounded-lg bg-muted/50 p-3 text-[11px] leading-6 text-muted-foreground">
              فقط {{ ticket.messages.length }} پیام آخر نمایش داده می‌شود.
            </p>
            <p v-if="ticket.messages.length === 0" class="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              هنوز پیامی در این تیکت ثبت نشده است.
            </p>
            <ConversationTimeline v-else :messages="ticket.messages" :current-user-id="user?.id" />
          </section>

          <ReplyBox
            :ticket-id="ticket.id"
            :can-reply="ticket.can.reply"
            :can-internal-note="ticket.can.internalNote"
            :disabled-reason="ticket.status === 'CLOSED' ? 'این تیکت بسته است. برای ادامه، آن را بازگشایی کنید.' : undefined"
            @sent="refresh()"
          />

          <div v-if="!isStaff && (ticket.can.close || ticket.can.reopen)" class="flex flex-wrap gap-2">
            <Button v-if="ticket.can.close" variant="outline" @click="askAction('CLOSED')">بستن تیکت</Button>
            <Button v-if="ticket.can.reopen" variant="outline" @click="askAction('OPEN')">بازگشایی تیکت</Button>
          </div>
        </div>

        <aside v-if="isStaff" class="space-y-4">
          <TicketManagePanel :ticket="ticket" @updated="refresh()" />
        </aside>
      </div>
    </template>

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="confirmCopy.title"
      :description="confirmCopy.description"
      :confirm-label="confirmCopy.label"
      :loading="actionBusy"
      @confirm="runAction"
    />
  </div>
</template>
