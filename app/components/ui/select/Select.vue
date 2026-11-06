<script setup lang="ts">
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { Check, ChevronDown } from 'lucide-vue-next'
import { cn } from '~/lib/utils'

interface SelectOption {
  value: string
  label: string
}

const props = defineProps<{
  items: SelectOption[]
  placeholder?: string
  id?: string
  disabled?: boolean
  class?: string
  ariaLabel?: string
}>()

const model = defineModel<string>({ default: '' })
</script>

<template>
  <SelectRoot v-model="model" :disabled="props.disabled">
    <SelectTrigger
      :id="props.id"
      :aria-label="props.ariaLabel"
      :class="
        cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
          props.class,
        )
      "
    >
      <SelectValue :placeholder="props.placeholder" />
      <SelectIcon as-child>
        <ChevronDown class="size-4 shrink-0 text-muted-foreground" />
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="4"
        class="z-[60] max-h-64 min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
      >
        <SelectViewport>
          <SelectItem
            v-for="item in props.items"
            :key="item.value"
            :value="item.value"
            class="relative flex cursor-pointer select-none items-center rounded-md py-2 pe-2 ps-8 text-sm outline-none data-[highlighted]:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
          >
            <SelectItemIndicator class="absolute start-2 inline-flex items-center">
              <Check class="size-4" />
            </SelectItemIndicator>
            <SelectItemText>{{ item.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
