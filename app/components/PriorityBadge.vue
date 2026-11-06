<script setup lang="ts">
import { PRIORITY_LABELS } from '~~/shared/domain'
import type { TicketPriority } from '~~/shared/domain'
import { Badge } from '~/components/ui/badge'
import { ArrowDown, ArrowUp, Minus, Zap } from 'lucide-vue-next'

const props = defineProps<{ priority: TicketPriority }>()

const config = {
  LOW: { variant: 'muted' as const, icon: ArrowDown },
  NORMAL: { variant: 'secondary' as const, icon: Minus },
  HIGH: { variant: 'warning' as const, icon: ArrowUp },
  URGENT: { variant: 'destructive' as const, icon: Zap },
}
</script>

<template>
  <Badge :variant="config[props.priority].variant">
    <component :is="config[props.priority].icon" class="size-3" aria-hidden="true" />
    {{ PRIORITY_LABELS[props.priority] }}
  </Badge>
</template>
