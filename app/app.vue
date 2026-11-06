<script setup lang="ts">
const { initTheme } = useTheme()

// Applied during setup so SSR and the first client paint agree.
initTheme()
</script>

<template>
  <div class="min-h-dvh">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <AppToaster />
  </div>
</template>
