<script setup lang="ts">
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-vue-next'
import { useToast } from '~/composables/useToast'

const { toasts, dismiss } = useToast()

const styles: Record<string, string> = {
  default: 'border-border',
  success: 'border-emerald-500/40',
  error: 'border-destructive/40',
  warning: 'border-amber-500/40',
}

const icons = { success: CircleCheck, error: TriangleAlert, warning: TriangleAlert, default: Info } as const
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-start sm:p-6"
    role="status"
    aria-live="polite"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-1 opacity-0"
    >
      <div
        v-for="item in toasts"
        :key="item.id"
        :class="[
          'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-card p-4 text-sm shadow-lg',
          styles[item.variant],
        ]"
      >
        <component
          :is="icons[item.variant]"
          :class="[
            'mt-0.5 size-4 shrink-0',
            item.variant === 'success'
              ? 'text-emerald-600 dark:text-emerald-400'
              : item.variant === 'error'
                ? 'text-destructive'
                : item.variant === 'warning'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground',
          ]"
        />
        <div class="min-w-0 flex-1">
          <p class="font-medium text-foreground">{{ item.title }}</p>
          <p v-if="item.description" class="mt-1 leading-6 text-muted-foreground">
            {{ item.description }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="بستن پیام"
          @click="dismiss(item.id)"
        >
          <X class="size-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
