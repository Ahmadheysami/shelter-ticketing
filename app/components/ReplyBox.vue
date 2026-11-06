<script setup lang="ts">
import { LockKeyhole, Send } from 'lucide-vue-next'
import type { TicketMessageDto } from '~~/shared/types/api'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { Alert } from '~/components/ui/alert'
import { apiFetch, errorMessage } from '~/composables/useApi'
import { useFormat } from '~/composables/useFormat'
import { useToast } from '~/composables/useToast'

const props = defineProps<{
  ticketId: number
  canReply: boolean
  canInternalNote: boolean
  disabledReason?: string
}>()

const emit = defineEmits<{ sent: [TicketMessageDto] }>()
const { formatNumber } = useFormat()
const { toast } = useToast()

const body = ref('')
const visibility = ref<'PUBLIC' | 'INTERNAL'>('PUBLIC')
const busy = ref(false)
const error = ref('')

const remaining = computed(() => 5000 - body.value.length)

async function submit(): Promise<void> {
  error.value = ''
  if (!body.value.trim()) {
    error.value = 'متن پیام را وارد کنید.'
    return
  }
  busy.value = true
  try {
    const result = await apiFetch<{ message: TicketMessageDto }>(
      `/api/tickets/${props.ticketId}/messages`,
      {
        method: 'POST',
        body: { body: body.value, visibility: visibility.value },
      },
    )
    emit('sent', result.message)
    body.value = ''
    visibility.value = 'PUBLIC'
    toast({
      title: visibility.value === 'PUBLIC' ? 'پاسخ ارسال شد' : 'یادداشت داخلی ثبت شد',
      variant: 'success',
    })
  } catch (caught) {
    error.value = errorMessage(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section v-if="props.canReply" class="rounded-xl border border-border/80 bg-card p-4 shadow-xs" aria-label="ارسال پاسخ">
    <h2 class="text-sm font-semibold">ارسال پیام</h2>
    <p v-if="props.disabledReason" class="mt-1 text-xs text-muted-foreground">{{ props.disabledReason }}</p>

    <div v-if="props.canInternalNote" class="mt-3 inline-flex rounded-lg border border-border p-0.5" role="group" aria-label="نوع پیام">
      <button
        type="button"
        class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
        :class="visibility === 'PUBLIC' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'"
        :aria-pressed="visibility === 'PUBLIC'"
        @click="visibility = 'PUBLIC'"
      >
        پاسخ عمومی
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
        :class="visibility === 'INTERNAL' ? 'bg-amber-500 text-white' : 'text-muted-foreground hover:bg-muted'"
        :aria-pressed="visibility === 'INTERNAL'"
        @click="visibility = 'INTERNAL'"
      >
        <LockKeyhole class="size-3" />
        یادداشت داخلی
      </button>
    </div>

    <Alert v-if="error" variant="destructive" class="mt-3">{{ error }}</Alert>

    <form class="mt-3 space-y-3" @submit.prevent="submit">
      <Textarea
        v-model="body"
        :placeholder="visibility === 'INTERNAL' ? 'یادداشت داخلی؛ فقط تیم پشتیبانی این متن را می‌بیند.' : 'پاسخ خود را بنویسید…'"
        :aria-label="visibility === 'INTERNAL' ? 'یادداشت داخلی' : 'متن پاسخ'"
        maxlength="5000"
        required
      />
      <div class="flex items-center justify-between gap-3">
        <span class="text-[11px] text-muted-foreground tabular">{{ formatNumber(remaining) }} کاراکتر باقی‌مانده</span>
        <Button type="submit" :disabled="busy || !body.trim()">
          <Send class="size-4" />
          {{ busy ? 'در حال ارسال…' : visibility === 'INTERNAL' ? 'ثبت یادداشت' : 'ارسال پاسخ' }}
        </Button>
      </div>
    </form>
  </section>
</template>
