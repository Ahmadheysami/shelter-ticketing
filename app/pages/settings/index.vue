<script setup lang="ts">
import { KeyRound, Mail, MonitorSmartphone, ShieldCheck, Trash2 } from 'lucide-vue-next'
import type { SessionInfo } from '~~/shared/types/api'
import { ROLE_LABELS } from '~~/shared/domain'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { Alert } from '~/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import { apiFetch, errorMessage } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'
import { useFormat } from '~/composables/useFormat'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'app', requiresAuth: true })
useHead({ title: 'تنظیمات حساب | تیکت‌یار', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const { user, isStaff, fetchMe } = useAuth()
const { formatDateTime } = useFormat()
const { toast } = useToast()
const request = useRequestFetch()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordBusy = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')

async function changePassword(): Promise<void> {
  passwordError.value = ''
  passwordSuccess.value = ''
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'تکرار رمز جدید مطابقت ندارد.'
    return
  }
  passwordBusy.value = true
  try {
    await apiFetch('/api/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value,
      },
    })
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    passwordSuccess.value = 'رمز عبور تغییر کرد و سایر نشست‌ها باطل شدند.'
    toast({ title: 'رمز عبور تغییر کرد', variant: 'success' })
    await refreshSessions()
  } catch (caught) {
    passwordError.value = errorMessage(caught)
  } finally {
    passwordBusy.value = false
  }
}

const { data: sessionsResponse, refresh: refreshSessions, pending: sessionsPending } = await useAsyncData(
  'account-sessions',
  () => request<{ data: { sessions: SessionInfo[] } }>('/api/auth/sessions'),
)
const sessions = computed(() => sessionsResponse.value?.data.sessions ?? [])

const revokeOpen = ref(false)
const revokeTarget = ref<SessionInfo | null>(null)
const revokeBusy = ref(false)

function askRevoke(session: SessionInfo): void {
  revokeTarget.value = session
  revokeOpen.value = true
}

async function revoke(): Promise<void> {
  if (!revokeTarget.value) return
  revokeBusy.value = true
  try {
    await apiFetch(`/api/auth/sessions/${revokeTarget.value.id}`, { method: 'DELETE' })
    revokeOpen.value = false
    toast({ title: 'نشست باطل شد', variant: 'success' })
    await refreshSessions()
    if (revokeTarget.value.current) {
      await navigateTo('/login')
    }
  } catch (caught) {
    toast({ title: 'ابطال نشست انجام نشد', description: errorMessage(caught), variant: 'error' })
  } finally {
    revokeBusy.value = false
  }
}

const resendBusy = ref(false)
async function resendVerification(): Promise<void> {
  resendBusy.value = true
  try {
    await apiFetch('/api/auth/resend-verification', { method: 'POST' })
    toast({ title: 'اگر ایمیل تأیید نشده باشد، لینک جدید ارسال می‌شود', variant: 'success' })
  } catch (caught) {
    toast({ title: 'ارسال انجام نشد', description: errorMessage(caught), variant: 'error' })
  } finally {
    resendBusy.value = false
  }
}

onMounted(() => {
  fetchMe(true).catch(() => undefined)
})

function describeAgent(agent: string | null): string {
  if (!agent) return 'دستگاه ناشناس'
  if (/iphone|android|mobile/i.test(agent)) return 'دستگاه موبایل'
  if (/macintosh|windows|linux/i.test(agent)) return 'رایانه'
  return 'مرورگر'
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <PageHeader title="تنظیمات حساب" description="اطلاعات حساب، امنیت ورود و نشست‌های فعال خود را مدیریت کنید." />

    <Card>
      <CardHeader>
        <CardTitle>اطلاعات حساب</CardTitle>
        <CardDescription>نام و ایمیل حساب شما توسط تیم پشتیبانی قابل تغییر است.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <dl class="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-xs text-muted-foreground">نام</dt>
            <dd class="mt-1 font-medium">{{ user?.name }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">ایمیل</dt>
            <dd class="mt-1 font-medium" dir="ltr">{{ user?.email }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">نقش</dt>
            <dd class="mt-1"><Badge variant="secondary">{{ user ? ROLE_LABELS[user.role] : '—' }}</Badge></dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">وضعیت ایمیل</dt>
            <dd class="mt-1">
              <Badge :variant="user?.emailVerified ? 'success' : 'warning'">
                {{ user?.emailVerified ? 'تأییدشده' : 'تأییدنشده' }}
              </Badge>
            </dd>
          </div>
        </dl>
        <div v-if="user && !user.emailVerified" class="flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 p-3">
          <Mail class="size-4 text-muted-foreground" aria-hidden="true" />
          <p class="flex-1 text-xs leading-6 text-muted-foreground">
            ایمیل شما تأیید نشده است. برای دریافت اطلاع‌رسانی امنیتی، آن را تأیید کنید.
          </p>
          <Button size="sm" variant="outline" :disabled="resendBusy" @click="resendVerification">
            {{ resendBusy ? 'در حال ارسال…' : 'ارسال ایمیل تأیید' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card v-if="isStaff">
      <CardHeader>
        <CardTitle>روش ورود حساب مدیریتی</CardTitle>
        <CardDescription>
          مدیران و مالک سیستم فقط با کلید امنیتی وارد می‌شوند؛ رمز عبور جداگانه‌ای وجود ندارد.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-2 text-sm leading-7 text-muted-foreground">
        <p>
          کلید ورود شما در زمان ساخت حساب یا ارتقای نقش نمایش داده شده است. اگر آن را گم کرده‌اید، مالک
          سیستم باید دسترسی را دوباره تنظیم کند.
        </p>
        <p>هر نشست پس از مدتی به‌صورت خودکار بسته می‌شود؛ در آن صورت دوباره با کلید خود وارد شوید.</p>
      </CardContent>
    </Card>

    <Card v-if="!isStaff">
      <CardHeader>
        <CardTitle>تغییر رمز عبور</CardTitle>
        <CardDescription>
          پس از تغییر رمز، همه نشست‌های دیگر باطل می‌شوند. رمز جدید حداقل ۱۲ کاراکتر با حرف و عدد باشد.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert v-if="passwordError" variant="destructive" class="mb-4">{{ passwordError }}</Alert>
        <Alert v-if="passwordSuccess" variant="success" class="mb-4">{{ passwordSuccess }}</Alert>
        <form class="grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="changePassword">
          <div class="space-y-2 sm:col-span-2">
            <Label for="current-password" required>رمز فعلی</Label>
            <Input id="current-password" v-model="currentPassword" type="password" autocomplete="current-password" required />
          </div>
          <div class="space-y-2">
            <Label for="new-password" required>رمز جدید</Label>
            <Input id="new-password" v-model="newPassword" type="password" autocomplete="new-password" required />
          </div>
          <div class="space-y-2">
            <Label for="confirm-new" required>تکرار رمز جدید</Label>
            <Input id="confirm-new" v-model="confirmPassword" type="password" autocomplete="new-password" required />
          </div>
          <div class="sm:col-span-2">
            <Button type="submit" :disabled="passwordBusy">
              <KeyRound class="size-4" />
              {{ passwordBusy ? 'در حال ذخیره…' : 'ذخیره رمز جدید' }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>ورود دومرحله‌ای</CardTitle>
          <CardDescription>
            اختیاری است و هیچ حسابی بدون خواست خودش ملزم به فعال‌سازی آن نیست. با یک برنامه احراز هویت،
            یک لایه امنیتی اضافه به ورود اضافه کنید.
          </CardDescription>
        </div>
        <Badge :variant="user?.mfaEnabled ? 'success' : 'warning'">
          {{ user?.mfaEnabled ? 'فعال' : 'غیرفعال' }}
        </Badge>
      </CardHeader>
      <CardContent class="flex flex-wrap items-center gap-2">
        <Button variant="outline" as-child>
          <NuxtLink to="/settings/mfa">
            <ShieldCheck class="size-4" />
            {{ user?.mfaEnabled ? 'مدیریت ورود دومرحله‌ای' : 'فعال‌سازی ورود دومرحله‌ای' }}
          </NuxtLink>
        </Button>

      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>نشست‌های فعال</CardTitle>
        <CardDescription>اگر دستگاه ناشناسی می‌بینید، آن نشست را باطل کنید.</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="sessionsPending" class="space-y-2">
          <Skeleton v-for="index in 2" :key="index" class="h-16 w-full" />
        </div>
        <ul v-else class="divide-y divide-border">
          <li v-for="session in sessions" :key="session.id" class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
            <div class="min-w-0 flex-1">
              <p class="flex flex-wrap items-center gap-2 text-sm font-medium">
                <MonitorSmartphone class="size-4 text-muted-foreground" aria-hidden="true" />
                {{ describeAgent(session.userAgent) }}
                <Badge v-if="session.current" variant="success">نشست فعلی</Badge>
                <Badge v-if="session.mfaSatisfied" variant="secondary">تأیید دومرحله‌ای</Badge>
              </p>
              <p class="mt-1 text-[11px] text-muted-foreground">
                آخرین فعالیت: {{ formatDateTime(session.lastSeenAt) }} · انقضا: {{ formatDateTime(session.expiresAt) }}
              </p>
            </div>
            <Button variant="outline" size="sm" @click="askRevoke(session)">
              <Trash2 class="size-3.5" />
              ابطال
            </Button>
          </li>
        </ul>
      </CardContent>
    </Card>

    <ConfirmDialog
      v-model:open="revokeOpen"
      title="ابطال نشست"
      description="این نشست از دستگاه مربوطه خارج می‌شود. اگر نشست فعلی باشد، از همین دستگاه نیز خارج خواهید شد."
      confirm-label="ابطال نشست"
      :loading="revokeBusy"
      @confirm="revoke"
    />
  </div>
</template>
