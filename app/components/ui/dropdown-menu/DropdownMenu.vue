<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import type { Component } from 'vue'
import { cn } from '~/lib/utils'

interface MenuItem {
  label?: string
  icon?: Component
  onSelect?: () => void
  disabled?: boolean
  destructive?: boolean
  separator?: boolean
}

const props = defineProps<{ items: MenuItem[]; align?: 'start' | 'center' | 'end' }>()
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <slot name="trigger" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        :align="props.align ?? 'end'"
        :side-offset="6"
        class="z-60 min-w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
      >
        <template v-for="(item, index) in props.items" :key="index">
          <DropdownMenuSeparator v-if="item.separator" class="-mx-1 my-1 h-px bg-border" />
          <DropdownMenuItem
            v-else
            :disabled="item.disabled"
            :class="
              cn(
                'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                item.destructive && 'text-destructive',
              )
            "
            @select="item.onSelect?.()"
          >
            <component :is="item.icon" v-if="item.icon" class="size-4" />
            {{ item.label }}
          </DropdownMenuItem>
        </template>
        <slot />
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
