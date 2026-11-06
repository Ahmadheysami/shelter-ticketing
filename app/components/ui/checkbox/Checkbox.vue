<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import { Check } from 'lucide-vue-next'
import { cn } from '~/lib/utils'

const model = defineModel<boolean>({ default: false })
const props = defineProps<{ id?: string; class?: string; disabled?: boolean; ariaLabel?: string }>()
</script>

<template>
  <CheckboxRoot
    :id="props.id"
    v-model="model"
    :disabled="props.disabled"
    :aria-label="props.ariaLabel"
    :class="
      cn(
        'peer inline-flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border border-input bg-background shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        props.class,
      )
    "
  >
    <CheckboxIndicator class="inline-flex items-center justify-center">
      <Check class="size-3.5" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
