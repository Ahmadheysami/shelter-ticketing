<script setup lang="ts">
import { KeyRound, LogOut } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Alert } from '~/components/ui/alert'
import { apiFetch, errorMessage } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'

definePageMeta({ layout: 'auth', requiresAuth: true, allowIncompleteMfa: true })
useHead({ title: 'تأیید دومرحله‌ای | تیکت‌یار' })

const { fetchMe, isStaff, logout } = useAuth()

const code = ref('')
const busy = ref(false)
const error = ref('')
const useRecovery = ref(false)

async function submit(): Promise<void> {
  error.value = ''
  busy.value = true
  try {
    await apiFetch('/api/auth/mfa/verify', {
      method: 'POST',
      body: { code: code.value.trim() },
    })
    await fetchMe(true)
    await navigateTo(isStaff.value ? '/admin' : '/dashboard')
  } catch (caught) {
    error.value = errorMessage(caught)
    code.value = ''
  } finally {
    busy.value = false
  }
}

async function signOut(): Promise<void> {
  await logout()
  await navigateTo('/login')
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <span class="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <KeyRound class="size-5" aria-hidden="true" />
      </span>
      <h1 class="text-2xl font-bold tracking-tight">تأیید دومرحله‌ای</h1>
      <p class="text-sm leading-7 text-muted-foreground">
        کد ۶ رقمی برنامه احراز هویت خود را وارد کنید. ورود دومرحله‌ای را خودتان برای این حساب فعال کرده‌اید.
      </p>
    </div>

    <Alert v-if="error" variant="destructive">{{ error }}</Alert>

    <form class="space-y-4" @submit.prevent="submit">
      <div class="space-y-2">
        <Label for="code" required>{{ useRecovery ? 'کد بازیابی' : 'کد تأیید' }}</Label>
        <Input
          id="code"
          v-model="code"
          :inputmode="useRecovery ? 'text' : 'numeric'"
          autocomplete="one-time-code"
          :maxlength="useRecovery ? 21 : 6"
          :placeholder="useRecovery ? 'xxxxxxxxxx-xxxxxxxxxx' : '123456'"
          dir="ltr"
          class="text-center tracking-[0.3em]"
          required
          autofocus
        />
      </div>
      <Button type="submit" class="w-full" :disabled="busy || code.trim().length < 5">
        {{ busy ? 'در حال بررسی…' : 'تأیید و ورود' }}
      </Button>
    </form>

    <div class="flex flex-col items-center gap-3 text-sm">
      <button type="button" class="text-primary underline-offset-4 hover:underline" @click="useRecovery = !useRecovery">
        {{ useRecovery ? 'استفاده از کد تأیید برنامه' : 'استفاده از کد بازیابی' }}
      </button>
      <button type="button" class="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground" @click="signOut">
        <LogOut class="size-3.5" />
        خروج از حساب
      </button>
    </div>
  </div>
</template>
