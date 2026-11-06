<script setup lang="ts">
import { Eye, EyeOff, LockKeyhole } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Alert } from '~/components/ui/alert'
import { errorMessage } from '~/composables/useApi'
import { safeInternalPath } from '~/lib/utils'

definePageMeta({ layout: 'auth' })
useHead({ title: 'ورود | تیکت‌یار' })

const route = useRoute()
const { login } = useAuth()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const busy = ref(false)
const error = ref('')

const registered = computed(() => route.query.registered === '1')
const resetDone = computed(() => route.query.reset === '1')
const expired = computed(() => route.query.expired === '1')
const redirectPath = computed(() => safeInternalPath(route.query.redirect, '/dashboard'))

async function submit(): Promise<void> {
  error.value = ''
  busy.value = true
  try {
    const result = await login(email.value.trim(), password.value)
    if (result.mfaRequired) {
      await navigateTo('/mfa')
    } else {
      await navigateTo(redirectPath.value)
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
      <h1 class="text-2xl font-bold tracking-tight">ورود به حساب</h1>
      <p class="text-sm leading-7 text-muted-foreground">
        برای پیگیری درخواست‌ها وارد شوید. اطلاعات ورود شما به‌صورت امن بررسی می‌شود.
      </p>
    </div>

    <Alert v-if="registered" variant="success" title="درخواست ثبت‌نام دریافت شد">
      اگر این ایمیل قابل ثبت باشد، حساب ایجاد شده و راهنمای تأیید ارسال می‌شود. اکنون می‌توانید وارد شوید.
    </Alert>
    <Alert v-if="resetDone" variant="success" title="رمز عبور تغییر کرد">
      نشست‌های قبلی باطل شده‌اند. با رمز جدید وارد شوید.
    </Alert>
    <Alert v-if="expired" variant="warning" title="نشست شما پایان یافت">
      برای ادامه دوباره وارد شوید.
    </Alert>
    <Alert v-if="error" variant="destructive">{{ error }}</Alert>

    <form class="space-y-4" novalidate @submit.prevent="submit">
      <div class="space-y-2">
        <Label for="email" required>ایمیل</Label>
        <Input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          inputmode="email"
          dir="ltr"
          placeholder="you@example.com"
          required
          :aria-invalid="Boolean(error)"
        />
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <Label for="password" required>رمز عبور</Label>
          <NuxtLink to="/forgot-password" class="text-xs text-primary underline-offset-4 hover:underline">
            رمز را فراموش کرده‌اید؟
          </NuxtLink>
        </div>
        <div class="relative">
          <Input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            required
            class="pe-10"
          />
          <button
            type="button"
            class="absolute end-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :aria-label="showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="size-4" />
            <Eye v-else class="size-4" />
          </button>
        </div>
      </div>
      <Button type="submit" class="w-full" :disabled="busy">
        <LockKeyhole class="size-4" />
        {{ busy ? 'در حال ورود…' : 'ورود' }}
      </Button>
    </form>

    <p class="text-center text-sm text-muted-foreground">
      حساب ندارید؟
      <NuxtLink to="/register" class="font-medium text-primary underline-offset-4 hover:underline">ثبت‌نام کنید</NuxtLink>
    </p>

    <p class="text-center text-xs text-muted-foreground">
      مدیر یا مالک سیستم هستید؟
      <NuxtLink to="/admin/login" class="font-medium text-primary underline-offset-4 hover:underline">
        ورود با کلید امنیتی
      </NuxtLink>
    </p>
  </div>
</template>
