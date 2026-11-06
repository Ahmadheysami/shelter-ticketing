<script setup lang="ts">
import { CircleCheck, MailCheck, TriangleAlert } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Alert } from '~/components/ui/alert'
import { apiFetch, errorMessage } from '~/composables/useApi'

definePageMeta({ layout: 'auth' })
useHead({ title: 'تأیید ایمیل | تیکت‌یار' })

const route = useRoute()
const { fetchMe } = useAuth()

const state = ref<'loading' | 'success' | 'error'>('loading')
const error = ref('')

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (!token) {
    state.value = 'error'
    error.value = 'لینک تأیید معتبر نیست.'
    return
  }
  try {
    await apiFetch('/api/auth/verify-email', { method: 'POST', body: { token } })
    state.value = 'success'
    try {
      await fetchMe(true)
    } catch {
      // Verification succeeded even if refreshing the profile failed.
    }
  } catch (caught) {
    state.value = 'error'
    error.value = errorMessage(caught)
  }
})
</script>

<template>
  <div class="space-y-6 text-center">
    <div v-if="state === 'loading'" class="space-y-3">
      <span class="mx-auto inline-flex size-12 animate-pulse items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MailCheck class="size-5" aria-hidden="true" />
      </span>
      <h1 class="text-xl font-bold">در حال تأیید ایمیل…</h1>
      <p class="text-sm text-muted-foreground">لطفاً چند لحظه صبر کنید.</p>
    </div>

    <template v-else-if="state === 'success'">
      <span class="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CircleCheck class="size-6" aria-hidden="true" />
      </span>
      <h1 class="text-xl font-bold">ایمیل شما تأیید شد</h1>
      <p class="text-sm leading-7 text-muted-foreground">
        حالا می‌توانید درخواست‌های خود را ثبت و پیگیری کنید.
      </p>
      <Button as-child><NuxtLink to="/dashboard">رفتن به داشبورد</NuxtLink></Button>
    </template>

    <template v-else>
      <span class="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert class="size-6" aria-hidden="true" />
      </span>
      <h1 class="text-xl font-bold">تأیید ایمیل انجام نشد</h1>
      <Alert variant="destructive" class="text-start">{{ error }}</Alert>
      <Button variant="outline" as-child><NuxtLink to="/login">بازگشت به ورود</NuxtLink></Button>
    </template>
  </div>
</template>
