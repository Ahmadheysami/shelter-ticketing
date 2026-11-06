<script setup lang="ts">
import { Mail } from 'lucide-vue-next'
import { forgotPasswordSchema } from '~~/shared/validation'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Alert } from '~/components/ui/alert'
import { apiFetch, errorMessage } from '~/composables/useApi'

definePageMeta({ layout: 'auth' })
useHead({ title: 'بازیابی رمز عبور | تیکت‌یار' })

const email = ref('')
const busy = ref(false)
const error = ref('')
const message = ref('')

async function submit(): Promise<void> {
  error.value = ''
  const parsed = forgotPasswordSchema.safeParse({ email: email.value })
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'ایمیل معتبر نیست'
    return
  }
  busy.value = true
  try {
    const result = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: parsed.data,
    })
    message.value = result.message
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
      <h1 class="text-2xl font-bold tracking-tight">بازیابی رمز عبور</h1>
      <p class="text-sm leading-7 text-muted-foreground">
        ایمیل حساب خود را وارد کنید. اگر حساب وجود داشته باشد، لینک بازیابی یک‌بارمصرف ارسال می‌شود.
      </p>
    </div>

    <Alert v-if="message" variant="success" title="درخواست دریافت شد">{{ message }}</Alert>
    <Alert v-if="error" variant="destructive">{{ error }}</Alert>

    <form v-if="!message" class="space-y-4" novalidate @submit.prevent="submit">
      <div class="space-y-2">
        <Label for="email" required>ایمیل</Label>
        <Input id="email" v-model="email" type="email" autocomplete="email" dir="ltr" required />
      </div>
      <Button type="submit" class="w-full" :disabled="busy">
        <Mail class="size-4" />
        {{ busy ? 'در حال ارسال…' : 'ارسال لینک بازیابی' }}
      </Button>
    </form>

    <p class="text-center text-sm text-muted-foreground">
      <NuxtLink to="/login" class="font-medium text-primary underline-offset-4 hover:underline">بازگشت به ورود</NuxtLink>
    </p>
  </div>
</template>
