<script setup lang="ts">
import { STATUS_LABELS } from '~~/shared/domain'
import type { TicketStatus } from '~~/shared/domain'
import { Badge } from '~/components/ui/badge'

const props = defineProps<{ status: TicketStatus }>()

const variants: Record<TicketStatus, 'info' | 'warning' | 'default' | 'success' | 'muted'> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  WAITING_FOR_USER: 'default',
  RESOLVED: 'success',
  CLOSED: 'muted',
}
</script>

<template>
  <Badge :variant="variants[props.status]">{{ STATUS_LABELS[props.status] }}</Badge>
</template>
