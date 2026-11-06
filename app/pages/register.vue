<script setup lang="ts">
import { Eye, EyeOff, UserPlus } from 'lucide-vue-next'
import { registerSchema } from '~~/shared/validation'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Checkbox } from '~/components/ui/checkbox'
import { Alert } from '~/components/ui/alert'
import { errorMessage } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'

definePageMeta({ layout: 'auth' })
useHead({ title: 'ثبت‌نام | تیکت‌یار' })

const { register } = useAuth()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const acceptTerms = ref(false)
const showPassword = ref(false)
const busy = ref(false)
const error = ref('')
const fields = ref<Record<string, string>>({})
const success = ref('')

const passwordChecks = computed(() => ({
  length: password.value.length >= 12,
  letter: /[A-Za-z]/.test(password.value),
  digit: /[0-9]/.test(password.value),
}))

async function submit(): Promise<void> {
  error.value = ''
  fields.value = {}
  success.value = ''

  if (password.value !== confirmPassword.value) {
    fields.value = { confirmPassword: 'تکرار رمز عبور مطابقت ندارد' }
    return
  }

  const parsed = registerSchema.safeParse({
    name: name.value,
    email: email.value,
    password: password.value,
    acceptTerms: acceptTerms.value,
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_form'
      if (!fields.value[key]) fields.value[key] = issue.message
    }
    return
  }

  busy.value = true
  try {
    success.value = await register(parsed.data)
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
      <h1 class="text-2xl font-bold tracking-tight">ساخت حساب کاربری</h1>
      <p class="text-sm leading-7 text-muted-foreground">
        پس از ثبت‌نام می‌توانید درخواست‌های پشتیبانی خود را ثبت و پیگیری کنید.
      </p>
    </div>

    <Alert v-if="success" variant="success" title="درخواست ثبت شد">
      {{ success }}
      <div class="mt-3">
        <Button size="sm" as-child>
          <NuxtLink to="/login">رفتن به صفحه ورود</NuxtLink>
        </Button>
      </div>
    </Alert>
    <Alert v-if="error" variant="destructive">{{ error }}</Alert>

    <form v-if="!success" class="space-y-4" novalidate @submit.prevent="submit">
      <div class="space-y-2">
        <Label for="name" required>نام نمایشی</Label>
        <Input id="name" v-model="name" autocomplete="name" required :aria-invalid="Boolean(fields.name)" />
        <p v-if="fields.name" class="text-xs text-destructive">{{ fields.name }}</p>
      </div>

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
          :aria-invalid="Boolean(fields.email)"
        />
        <p v-if="fields.email" class="text-xs text-destructive">{{ fields.email }}</p>
      </div>

      <div class="space-y-2">
        <Label for="password" required>رمز عبور</Label>
        <div class="relative">
          <Input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            required
            class="pe-10"
            :aria-invalid="Boolean(fields.password)"
            aria-describedby="password-rules"
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
        <ul id="password-rules" class="space-y-1 text-[11px] text-muted-foreground">
          <li :class="passwordChecks.length ? 'text-emerald-600 dark:text-emerald-400' : ''">حداقل ۱۲ کاراکتر</li>
          <li :class="passwordChecks.letter ? 'text-emerald-600 dark:text-emerald-400' : ''">حداقل یک حرف</li>
          <li :class="passwordChecks.digit ? 'text-emerald-600 dark:text-emerald-400' : ''">حداقل یک عدد</li>
        </ul>
        <p v-if="fields.password" class="text-xs text-destructive">{{ fields.password }}</p>
      </div>

      <div class="space-y-2">
        <Label for="confirm" required>تکرار رمز عبور</Label>
        <Input
          id="confirm"
          v-model="confirmPassword"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          required
          :aria-invalid="Boolean(fields.confirmPassword)"
        />
        <p v-if="fields.confirmPassword" class="text-xs text-destructive">{{ fields.confirmPassword }}</p>
      </div>

      <div class="flex items-start gap-2.5">
        <Checkbox id="terms" v-model="acceptTerms" class="mt-1" />
        <Label for="terms" class="font-normal">
          <span class="block text-sm">قوانین استفاده و سیاست حریم خصوصی را می‌پذیرم.</span>
        </Label>
      </div>
      <p v-if="fields.acceptTerms" class="text-xs text-destructive">{{ fields.acceptTerms }}</p>

      <Button type="submit" class="w-full" :disabled="busy">
        <UserPlus class="size-4" />
        {{ busy ? 'در حال ثبت…' : 'ساخت حساب' }}
      </Button>
    </form>

    <p class="text-center text-sm text-muted-foreground">
      حساب دارید؟
      <NuxtLink to="/login" class="font-medium text-primary underline-offset-4 hover:underline">وارد شوید</NuxtLink>
    </p>
  </div>
</template>
