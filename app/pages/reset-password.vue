<script setup lang="ts">
import { KeyRound } from 'lucide-vue-next'
import { resetPasswordSchema } from '~~/shared/validation'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Alert } from '~/components/ui/alert'
import { apiFetch, errorMessage } from '~/composables/useApi'

definePageMeta({ layout: 'auth' })
useHead({ title: 'تعیین رمز جدید | تیکت‌یار' })

const route = useRoute()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const password = ref('')
const confirmPassword = ref('')
const busy = ref(false)
const error = ref('')
const fields = ref<Record<string, string>>({})

async function submit(): Promise<void> {
  error.value = ''
  fields.value = {}
  const parsed = resetPasswordSchema.safeParse({
    token: token.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
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
    await apiFetch('/api/auth/reset-password', { method: 'POST', body: parsed.data })
    await navigateTo({ path: '/login', query: { reset: '1' } })
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
      <h1 class="text-2xl font-bold tracking-tight">تعیین رمز عبور جدید</h1>
      <p class="text-sm leading-7 text-muted-foreground">
        این لینک یک بار قابل استفاده است. پس از تغییر رمز، همه نشست‌های قبلی باطل می‌شوند.
      </p>
    </div>

    <Alert v-if="!token" variant="destructive" title="لینک نامعتبر">
      لینک بازیابی معتبر نیست. از صفحه فراموشی رمز دوباره درخواست دهید.
    </Alert>
    <Alert v-if="error" variant="destructive">{{ error }}</Alert>

    <form v-if="token" class="space-y-4" novalidate @submit.prevent="submit">
      <div class="space-y-2">
        <Label for="password" required>رمز عبور جدید</Label>
        <Input
          id="password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          required
          :aria-invalid="Boolean(fields.password)"
        />
        <p v-if="fields.password" class="text-xs text-destructive">{{ fields.password }}</p>
      </div>
      <div class="space-y-2">
        <Label for="confirm" required>تکرار رمز جدید</Label>
        <Input
          id="confirm"
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          required
          :aria-invalid="Boolean(fields.confirmPassword)"
        />
        <p v-if="fields.confirmPassword" class="text-xs text-destructive">{{ fields.confirmPassword }}</p>
      </div>
      <Button type="submit" class="w-full" :disabled="busy">
        <KeyRound class="size-4" />
        {{ busy ? 'در حال ذخیره…' : 'ذخیره رمز جدید' }}
      </Button>
    </form>

    <p class="text-center text-sm text-muted-foreground">
      <NuxtLink to="/login" class="font-medium text-primary underline-offset-4 hover:underline">بازگشت به ورود</NuxtLink>
    </p>
  </div>
</template>
