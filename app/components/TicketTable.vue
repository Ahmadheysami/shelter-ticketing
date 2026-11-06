<script setup lang="ts">
import { CATEGORY_LABELS } from '~~/shared/domain'
import type { TicketSummary } from '~~/shared/types/api'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { useFormat } from '~/composables/useFormat'

const props = defineProps<{
  tickets: TicketSummary[]
  showRequester?: boolean
}>()

const { formatRelative, formatDateTime } = useFormat()
</script>

<template>
  <div>
    <!-- Desktop table -->
    <Table class="hidden md:table">
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead class="w-28">شماره</TableHead>
          <TableHead>عنوان</TableHead>
          <TableHead class="w-28">وضعیت</TableHead>
          <TableHead class="w-24">اولویت</TableHead>
          <TableHead v-if="props.showRequester" class="w-32">درخواست‌دهنده</TableHead>
          <TableHead class="w-28">آخرین به‌روزرسانی</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="ticket in props.tickets" :key="ticket.id">
          <TableCell>
            <NuxtLink
              :to="`/tickets/${ticket.id}`"
              class="font-mono text-xs font-medium text-primary underline-offset-4 hover:underline"
              dir="ltr"
            >
              {{ ticket.publicId }}
            </NuxtLink>
          </TableCell>
          <TableCell class="max-w-md">
            <NuxtLink :to="`/tickets/${ticket.id}`" class="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span class="line-clamp-1 text-sm font-medium text-foreground">{{ ticket.subject }}</span>
              <span class="mt-0.5 block text-xs text-muted-foreground">
                {{ CATEGORY_LABELS[ticket.category] }}
              </span>
            </NuxtLink>
          </TableCell>
          <TableCell><StatusBadge :status="ticket.status" /></TableCell>
          <TableCell><PriorityBadge :priority="ticket.priority" /></TableCell>
          <TableCell v-if="props.showRequester" class="text-xs text-muted-foreground">
            {{ ticket.requester.name }}
          </TableCell>
          <TableCell>
            <time :datetime="ticket.updatedAt" class="text-xs text-muted-foreground" :title="formatDateTime(ticket.updatedAt)">
              {{ formatRelative(ticket.updatedAt) }}
            </time>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <!-- Mobile cards -->
    <ul class="space-y-3 md:hidden">
      <li v-for="ticket in props.tickets" :key="ticket.id">
        <NuxtLink
          :to="`/tickets/${ticket.id}`"
          class="block rounded-xl border border-border/80 bg-card p-4 shadow-xs transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div class="flex items-start justify-between gap-3">
            <span class="font-mono text-xs text-muted-foreground" dir="ltr">{{ ticket.publicId }}</span>
            <StatusBadge :status="ticket.status" />
          </div>
          <h3 class="mt-2 line-clamp-2 text-sm font-medium leading-6 text-foreground">
            {{ ticket.subject }}
          </h3>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <PriorityBadge :priority="ticket.priority" />
            <span class="text-xs text-muted-foreground">{{ CATEGORY_LABELS[ticket.category] }}</span>
            <span v-if="props.showRequester" class="text-xs text-muted-foreground">
              · {{ ticket.requester.name }}
            </span>
          </div>
          <p class="mt-3 text-xs text-muted-foreground">
            آخرین به‌روزرسانی {{ formatRelative(ticket.updatedAt) }}
          </p>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
