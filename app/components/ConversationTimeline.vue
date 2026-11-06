<script setup lang="ts">
import { LockKeyhole } from 'lucide-vue-next'
import { ROLE_LABELS } from '~~/shared/domain'
import type { TicketMessageDto } from '~~/shared/types/api'
import { Avatar } from '~/components/ui/avatar'
import { useFormat } from '~/composables/useFormat'

const props = defineProps<{ messages: TicketMessageDto[]; currentUserId?: string }>()
const { formatDateTime } = useFormat()
</script>

<template>
  <ol class="space-y-4" aria-label="گفتگوی تیکت">
    <li
      v-for="message in props.messages"
      :key="message.id"
      :class="[
        'rounded-xl border p-4',
        message.visibility === 'INTERNAL'
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-border/80 bg-card',
      ]"
    >
      <div class="flex flex-wrap items-center gap-2">
        <Avatar :name="message.author.name" class="size-8 text-[10px]" />
        <span class="text-sm font-semibold text-foreground">{{ message.author.name }}</span>
        <span class="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {{ ROLE_LABELS[message.author.role] }}
        </span>
        <span
          v-if="message.visibility === 'INTERNAL'"
          class="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300"
        >
          <LockKeyhole class="size-3" aria-hidden="true" />
          یادداشت داخلی
        </span>
        <span
          v-if="message.author.id === props.currentUserId"
          class="text-[10px] text-muted-foreground"
        >(شما)</span>
        <time :datetime="message.createdAt" class="ms-auto text-[11px] text-muted-foreground">
          {{ formatDateTime(message.createdAt) }}
        </time>
      </div>
      <p class="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-foreground" dir="auto">
        {{ message.body }}
      </p>
      <p v-if="message.editedAt" class="mt-2 text-[10px] text-muted-foreground">ویرایش‌شده</p>
    </li>
  </ol>
</template>
