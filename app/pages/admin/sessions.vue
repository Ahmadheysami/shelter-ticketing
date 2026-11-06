<script setup lang="ts">
import { MonitorSmartphone, Trash2 } from 'lucide-vue-next'
import { ROLE_LABELS } from '~~/shared/domain'
import type { SessionInfo } from '~~/shared/types/api'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Alert } from '~/components/ui/alert'
import { Card, CardContent } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import { apiFetch, errorMessage } from '~/composables/useApi'
import { useFormat } from '~/composables/useFormat'
import { useStepUp } from '~/composables/useStepUp'
import { useToast } from '~/composables/useToast'

type OwnerSession = SessionInfo & {
  user: { id: string; name: string; email: string; role: 'USER' | 'ADMIN' | 'OWNER' }
}

definePageMeta({ layout: 'app', requiresAuth: true, role: 'OWNER' })
useHead({ title: 'نشست‌های فعال | تیکت‌یار', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const request = useRequestFetch()
const { formatDateTime } = useFormat()
const { withStepUp } = useStepUp()
const { toast } = useToast()

const { data, pending, error, refresh } = await useAsyncData('owner-sessions', () =>
  request<{ data: { sessions: OwnerSession[] } }>('/api/admin/sessions'),
)

const sessions = computed(() => data.value?.data.sessions ?? [])

const target = ref<OwnerSession | null>(null)
const confirmOpen = ref(false)
const busy = ref(false)

function askRevoke(session: OwnerSession): void {
  target.value = session
  confirmOpen.value = true
}

async function revoke(): Promise<void> {
  if (!target.value) return
  busy.value = true
  try {
    await withStepUp(() => apiFetch(`/api/admin/sessions/${target.value!.id}`, { method: 'DELETE' }))
    confirmOpen.value = false
    toast({ title: 'نشست باطل شد', variant: 'success' })
    await refresh()
  } catch (caught) {
    toast({ title: 'ابطال نشست انجام نشد', description: errorMessage(caught), variant: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="نشست‌های فعال"
      description="نشست‌های فعال حساب‌ها را ببینید و در صورت نیاز آن‌ها را ببندید."
    />

    <Alert v-if="error" variant="destructive">دریافت نشست‌ها انجام نشد.</Alert>

    <div v-if="pending" class="space-y-2">
      <Skeleton v-for="index in 4" :key="index" class="h-20 w-full" />
    </div>

    <Card v-else>
      <CardContent class="p-0">
        <ul class="divide-y divide-border">
          <li v-for="session in sessions" :key="session.id" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div class="min-w-0 flex-1">
              <p class="flex flex-wrap items-center gap-2 text-sm font-medium">
                <MonitorSmartphone class="size-4 text-muted-foreground" aria-hidden="true" />
                {{ session.user.name }}
                <Badge variant="secondary">{{ ROLE_LABELS[session.user.role] }}</Badge>
                <Badge v-if="session.mfaSatisfied" variant="success">تأیید دومرحله‌ای</Badge>
              </p>
              <p class="mt-1 text-xs text-muted-foreground" dir="ltr">{{ session.user.email }}</p>
              <p class="mt-1 text-[11px] text-muted-foreground">
                آخرین فعالیت: {{ formatDateTime(session.lastSeenAt) }} · انقضا: {{ formatDateTime(session.expiresAt) }}
              </p>
            </div>
            <Button variant="outline" size="sm" @click="askRevoke(session)">
              <Trash2 class="size-3.5" />
              ابطال نشست
            </Button>
          </li>
        </ul>
        <div v-if="sessions.length === 0" class="p-6">
          <EmptyState title="نشست فعالی وجود ندارد" description="همه نشست‌ها باطل یا منقضی شده‌اند." />
        </div>
      </CardContent>
    </Card>

    <ConfirmDialog
      v-model:open="confirmOpen"
      title="ابطال نشست"
      :description="target ? `نشست ${target.user.name} از دستگاه مربوطه خارج می‌شود.` : 'این نشست باطل می‌شود.'"
      confirm-label="ابطال نشست"
      :loading="busy"
      @confirm="revoke"
    />
  </div>
</template>
