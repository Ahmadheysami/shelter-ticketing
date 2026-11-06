<script setup lang="ts">
import { UserCheck } from 'lucide-vue-next'
import {
  canStaffTransition,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '~~/shared/domain'
import type { TicketPriority, TicketStatus } from '~~/shared/domain'
import type { TicketDetail } from '~~/shared/types/api'
import { Button } from '~/components/ui/button'
import { Select } from '~/components/ui/select'
import { Alert } from '~/components/ui/alert'
import { apiFetch, errorMessage } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'

const props = defineProps<{ ticket: TicketDetail }>()
const emit = defineEmits<{ updated: [] }>()

const { user } = useAuth()
const { toast } = useToast()

const status = ref(props.ticket.status)
const priority = ref(props.ticket.priority)
const assigneeId = ref(props.ticket.assignee?.id ?? 'unassigned')
const busy = ref(false)
const error = ref('')
const staff = ref<Array<{ id: string; name: string; role: string }>>([])

watch(
  () => props.ticket,
  (ticket) => {
    status.value = ticket.status
    priority.value = ticket.priority
    assigneeId.value = ticket.assignee?.id ?? 'unassigned'
  },
)

onMounted(async () => {
  try {
    const result = await apiFetch<{ staff: Array<{ id: string; name: string; role: string }> }>(
      '/api/admin/staff',
    )
    staff.value = result.staff
  } catch {
    staff.value = []
  }
})

function setStatus(value: string): void {
  status.value = value as TicketStatus
}

function setPriority(value: string): void {
  priority.value = value as TicketPriority
}

// The server only accepts documented transitions; offer exactly those so the
// select cannot submit a change that will be rejected.
const statusItems = computed(() =>
  TICKET_STATUSES.filter(
    (value) =>
      value === status.value ||
      value === props.ticket.status ||
      canStaffTransition(props.ticket.status, value),
  ).map((value) => ({ value, label: STATUS_LABELS[value] })),
)

const assigneeItems = computed(() => [
  { value: 'unassigned', label: 'بدون مسئول' },
  ...staff.value.map((member) => ({
    value: member.id,
    label: `${member.name || 'مدیر بدون نام'}${member.id === user.value?.id ? ' (شما)' : ''}`,
  })),
])

async function save(): Promise<void> {
  error.value = ''
  busy.value = true
  try {
    await apiFetch<{ status: string }>(`/api/tickets/${props.ticket.id}`, {
      method: 'PATCH',
      body: {
        status: status.value,
        priority: priority.value,
        assigneeId: assigneeId.value === 'unassigned' ? null : assigneeId.value,
      },
    })
    toast({ title: 'تغییرات تیکت ذخیره شد', variant: 'success' })
    emit('updated')
  } catch (caught) {
    error.value = errorMessage(caught)
  } finally {
    busy.value = false
  }
}

async function assignToMe(): Promise<void> {
  if (!user.value) return
  assigneeId.value = user.value.id
  await save()
}
</script>

<template>
  <section class="rounded-xl border border-border/80 bg-card p-5 shadow-xs" aria-label="مدیریت تیکت">
    <h2 class="text-sm font-semibold">مدیریت تیکت</h2>
    <p class="mt-1 text-xs leading-5 text-muted-foreground">
      وضعیت، اولویت و مسئول بررسی این درخواست را به‌روزرسانی کنید.
    </p>

    <Alert v-if="error" variant="destructive" class="mt-3">{{ error }}</Alert>

    <div class="mt-4 space-y-4">
      <div class="space-y-1.5">
        <label for="manage-status" class="text-xs font-medium text-muted-foreground">وضعیت</label>
        <Select
          id="manage-status"
          :model-value="status"
          :items="statusItems"
          @update:model-value="setStatus"
        />
      </div>
      <div class="space-y-1.5">
        <label for="manage-priority" class="text-xs font-medium text-muted-foreground">اولویت</label>
        <Select
          id="manage-priority"
          :model-value="priority"
          :items="TICKET_PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] }))"
          @update:model-value="setPriority"
        />
      </div>
      <div class="space-y-1.5">
        <label for="manage-assignee" class="text-xs font-medium text-muted-foreground">مسئول بررسی</label>
        <Select
          id="manage-assignee"
          :model-value="assigneeId"
          :items="assigneeItems"
          placeholder="انتخاب مسئول"
          @update:model-value="assigneeId = $event"
        />
      </div>
      <div class="flex flex-col gap-2">
        <Button :disabled="busy" @click="save">
          {{ busy ? 'در حال ذخیره…' : 'ذخیره تغییرات' }}
        </Button>
        <Button
          v-if="props.ticket.assignee?.id !== user?.id"
          variant="outline"
          :disabled="busy"
          @click="assignToMe"
        >
          <UserCheck class="size-4" />
          تخصیص به من
        </Button>
      </div>
    </div>
  </section>
</template>
