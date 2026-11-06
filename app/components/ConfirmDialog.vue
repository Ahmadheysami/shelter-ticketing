<script setup lang="ts">
import { Dialog } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'

const props = defineProps<{
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  loading?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <Dialog v-model:open="open" :title="props.title" :description="props.description">
    <template #footer>
      <Button
        :variant="props.destructive === false ? 'default' : 'destructive'"
        :disabled="props.loading"
        @click="emit('confirm')"
      >
        {{ props.loading ? 'در حال انجام…' : (props.confirmLabel ?? 'تأیید') }}
      </Button>
      <Button variant="ghost" :disabled="props.loading" @click="open = false">انصراف</Button>
    </template>
  </Dialog>
</template>
