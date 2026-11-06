<script setup lang="ts">
import { Dialog } from '~/components/ui/dialog'

const mobileOpen = ref(false)
const route = useRoute()

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)
</script>

<template>
  <div class="min-h-dvh bg-background">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
    >
      پرش به محتوای اصلی
    </a>

    <aside class="fixed inset-y-0 start-0 z-30 hidden w-72 border-e border-border/70 bg-sidebar lg:block">
      <AppSidebar />
    </aside>

    <div class="lg:ps-72">
      <AppTopbar @open-menu="mobileOpen = true" />
      <main id="main-content" class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>

    <Dialog v-model:open="mobileOpen" title="منو" class="max-w-xs p-0">
      <AppSidebar />
    </Dialog>

    <StepUpDialog />
  </div>
</template>
