<script setup lang="ts">
import { useAttrs } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { Primitive } from 'reka-ui'
import { cn } from '~/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-lg px-6 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ButtonVariants = VariantProps<typeof buttonVariants>

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariants['variant']
    size?: ButtonVariants['size']
    as?: string
    asChild?: boolean
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  { variant: 'default', size: 'default', as: 'button', asChild: false, type: 'button', disabled: false },
)

defineOptions({ inheritAttrs: false })

// Class is merged through cn() for Tailwind conflict resolution; every other
// attribute (click handlers, aria-*, ids) must reach the rendered element.
const attrs = useAttrs()
const forwardedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>

<template>
  <Primitive
    :as="asChild ? undefined : props.as"
    :as-child="asChild"
    :type="asChild ? undefined : props.type"
    :disabled="asChild ? undefined : props.disabled"
    :class="cn(buttonVariants({ variant: props.variant, size: props.size }), attrs.class as string)"
    v-bind="{
      ...forwardedAttrs,
      ...(asChild ? {} : { 'aria-disabled': props.disabled || undefined }),
    }"
  >
    <slot />
  </Primitive>
</template>
