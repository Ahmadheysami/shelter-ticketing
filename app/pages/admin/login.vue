<script setup lang="ts">
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Alert } from '~/components/ui/alert'
import { errorMessage } from '~/composables/useApi'
import { safeInternalPath } from '~/lib/utils'

definePageMeta({ layout: 'auth' })
useHead({ title: 'ورود مدیران | تیکت‌یار', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const route = useRoute()
const { staffLogin } = useAuth()

const secret = ref('')
const showSecret = ref(false)
const busy = ref(false)
const error = ref('')

const expired = computed(() => route.query.expired === '1')
const redirectPath = computed(() =>
  safeInternalPath(route.query.redirect, '/admin', { prefix: '/admin' }),
)

async function submit(): Promise<void> {
  error.value = ''
  busy.value = true
  try {
    const result = await staffLogin(secret.value)
    secret.value = ''
    if (result.mfaRequired) {
      // TOTP is opt-in, but once enabled the challenge must be cleared.
      await navigateTo('/mfa')
    } else if (!result.user.profileCompleted) {
      await navigateTo({ path: '/admin/setup', query: { redirect: redirectPath.value } })
    } else if (result.user.role === 'OWNER' || result.user.role === 'ADMIN') {
      await navigateTo(redirectPath.value)
    } else {
      await navigateTo('/dashboard')
    }
  } catch (caught) {
    error.value = errorMessage(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <span class="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <ShieldCheck class="size-5" aria-hidden="true" />
      </span>
      <h1 class="text-2xl font-bold tracking-tight">ورود مدیران</h1>
      <p class="text-sm leading-7 text-muted-foreground">
        حساب‌های مدیر و مالک فقط با کلید امنیتی وارد می‌شوند. کلید را از مالک سیستم دریافت کنید.
      </p>
    </div>

    <Alert v-if="expired" variant="warning" title="نشست شما پایان یافت">
      برای ادامه، دوباره کلید امنیتی خود را وارد کنید.
    </Alert>
    <Alert v-if="error" variant="destructive">{{ error }}</Alert>

    <form class="space-y-4" novalidate @submit.prevent="submit">
      <div class="space-y-2">
        <Label for="staff-secret" required>کلید امنیتی</Label>
        <div class="relative">
          <Input
            id="staff-secret"
            v-model="secret"
            :type="showSecret ? 'text' : 'password'"
            autocomplete="off"
            spellcheck="false"
            required
            dir="ltr"
            class="pe-10 font-mono"
            placeholder="••••••••••••••••"
            :aria-invalid="Boolean(error)"
          />
          <button
            type="button"
            class="absolute end-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :aria-label="showSecret ? 'پنهان کردن کلید' : 'نمایش کلید'"
            @click="showSecret = !showSecret"
          >
            <EyeOff v-if="showSecret" class="size-4" />
            <Eye v-else class="size-4" />
          </button>
        </div>
        <p class="text-xs leading-6 text-muted-foreground">
          کلید امنیتی را از مالک سیستم دریافت کنید. این کلید فقط برای ورود شما استفاده می‌شود و آن را
          در اختیار دیگران قرار ندهید.
        </p>
      </div>
      <Button type="submit" class="w-full" :disabled="busy || secret.trim().length < 32">
        <KeyRound class="size-4" />
        {{ busy ? 'در حال بررسی…' : 'ورود به پنل مدیریت' }}
      </Button>
    </form>

    <div class="flex flex-col items-center gap-2 text-sm">
      <NuxtLink to="/login" class="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        ورود کاربران عادی
      </NuxtLink>
    </div>
  </div>
</template>
