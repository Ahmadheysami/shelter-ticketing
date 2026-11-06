<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { X } from 'lucide-vue-next'
import { cn } from '~/lib/utils'

const props = defineProps<{
  title: string
  description?: string
  class?: string
  closable?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out"
      />
      <DialogContent
        :class="
          cn(
            // Physical left/translate-x centering is intentional: logical
            // inset-inline-start plus a physical translate misaligns dialogs
            // in RTL layouts. This keeps the modal exactly centered in both
            // directions.
            'fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl focus:outline-none',
            props.class,
          )
        "
      >
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <DialogTitle class="text-base font-semibold">{{ props.title }}</DialogTitle>
            <DialogDescription v-if="props.description" class="text-sm leading-6 text-muted-foreground">
              {{ props.description }}
            </DialogDescription>
          </div>
          <DialogClose
            v-if="props.closable !== false"
            class="-me-2 -mt-2 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="بستن"
          >
            <X class="size-4" />
          </DialogClose>
        </div>
        <slot />
        <div v-if="$slots.footer" class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
