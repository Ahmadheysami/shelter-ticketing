<script setup lang="ts">
import { CircleCheck, Copy, Download, KeyRound, ShieldCheck } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Alert } from '~/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { apiFetch, errorMessage } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'app', requiresAuth: true, allowIncompleteMfa: true })
useHead({ title: 'ورود دومرحله‌ای | تیکت‌یار', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const { user, isStaff, fetchMe } = useAuth()
const { toast } = useToast()

const enrollment = ref<{ secret: string; uri: string; qrDataUrl: string } | null>(null)
const recoveryCodes = ref<string[]>([])
const code = ref('')
const busy = ref(false)
const starting = ref(false)
const error = ref('')
const setupDone = ref(false)

const disablePassword = ref('')
const disableSecret = ref('')
const disableCode = ref('')
const disableBusy = ref(false)
const disableError = ref('')

async function startSetup(): Promise<void> {
  starting.value = true
  error.value = ''
  try {
    enrollment.value = await apiFetch('/api/auth/mfa/setup', { method: 'POST' })
  } catch (caught) {
    error.value = errorMessage(caught)
  } finally {
    starting.value = false
  }
}

async function enable(): Promise<void> {
  error.value = ''
  busy.value = true
  try {
    const result = await apiFetch<{ recoveryCodes: string[] }>('/api/auth/mfa/enable', {
      method: 'POST',
      body: { code: code.value.trim() },
    })
    recoveryCodes.value = result.recoveryCodes
    setupDone.value = true
    await fetchMe(true)
    toast({ title: 'ورود دومرحله‌ای فعال شد', variant: 'success' })
  } catch (caught) {
    error.value = errorMessage(caught)
  } finally {
    busy.value = false
  }
}

async function disable(): Promise<void> {
  disableError.value = ''
  disableBusy.value = true
  try {
    await apiFetch('/api/auth/mfa/disable', {
      method: 'POST',
      body: {
        ...(isStaff.value
          ? { secret: disableSecret.value }
          : { password: disablePassword.value }),
        code: disableCode.value.trim(),
      },
    })
    await fetchMe(true)
    disablePassword.value = ''
    disableSecret.value = ''
    disableCode.value = ''
    toast({ title: 'ورود دومرحله‌ای غیرفعال شد', variant: 'success' })
  } catch (caught) {
    disableError.value = errorMessage(caught)
  } finally {
    disableBusy.value = false
  }
}

async function copySecret(): Promise<void> {
  if (!enrollment.value) return
  try {
    await navigator.clipboard.writeText(enrollment.value.secret)
    toast({ title: 'کد محرمانه کپی شد', variant: 'success' })
  } catch {
    toast({ title: 'کپی انجام نشد؛ کد را دستی انتخاب کنید', variant: 'warning' })
  }
}

async function continueToApp(): Promise<void> {
  await navigateTo(isStaff.value ? '/admin' : '/dashboard')
}

function downloadRecoveryCodes(): void {
  const content = [
    'کدهای بازیابی تیکت‌یار',
    'هر کد فقط یک بار قابل استفاده است. آنها را در جای امن نگهداری کنید.',
    '',
    ...recoveryCodes.value,
  ].join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'ticketyar-recovery-codes.txt'
  anchor.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  await fetchMe(true).catch(() => undefined)
  if (user.value && !user.value.mfaEnabled) {
    await startSetup()
  }
})
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <PageHeader
      title="ورود دومرحله‌ای"
      description="این لایه امنیتی اختیاری است. با یک برنامه احراز هویت (مانند Google Authenticator یا Aegis) کد یک‌بارمصرف بسازید."
    />

    <Alert v-if="error" variant="destructive">{{ error }}</Alert>

    <!-- Active state -->
    <Card v-if="user?.mfaEnabled && !setupDone">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <ShieldCheck class="size-4 text-emerald-600 dark:text-emerald-400" />
          ورود دومرحله‌ای فعال است
        </CardTitle>
        <CardDescription>
          هنگام ورود، علاوه بر {{ isStaff ? 'کلید امنیتی' : 'رمز عبور' }}، کد برنامه احراز هویت شما نیز بررسی می‌شود.
          هر زمان بخواهید می‌توانید آن را غیرفعال کنید.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form class="max-w-md space-y-3" @submit.prevent="disable">
          <p class="text-sm font-medium">غیرفعال‌سازی</p>
          <Alert v-if="disableError" variant="destructive">{{ disableError }}</Alert>
          <div v-if="isStaff" class="space-y-1.5">
            <Label for="disable-secret" required>کلید امنیتی ورود</Label>
            <Input id="disable-secret" v-model="disableSecret" type="password" autocomplete="off" dir="ltr" class="font-mono" required />
          </div>
          <div v-else class="space-y-1.5">
            <Label for="disable-password" required>رمز عبور</Label>
            <Input id="disable-password" v-model="disablePassword" type="password" autocomplete="current-password" required />
          </div>
          <div class="space-y-1.5">
            <Label for="disable-code" required>کد تأیید یا کد بازیابی</Label>
            <Input id="disable-code" v-model="disableCode" dir="ltr" required />
          </div>
          <Button type="submit" variant="outline" :disabled="disableBusy">
            {{ disableBusy ? 'در حال انجام…' : 'غیرفعال کردن ورود دومرحله‌ای' }}
          </Button>
        </form>
      </CardContent>
    </Card>

    <!-- Recovery codes after enabling -->
    <Card v-if="setupDone">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <CircleCheck class="size-4 text-emerald-600 dark:text-emerald-400" />
          کدهای بازیابی شما
        </CardTitle>
        <CardDescription>
          این کدها فقط یک بار نمایش داده می‌شوند. هر کد یک‌بارمصرف است؛ آن‌ها را در جای امن ذخیره کنید.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <ul class="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-4 font-mono text-sm sm:grid-cols-3" dir="ltr">
          <li v-for="recoveryCode in recoveryCodes" :key="recoveryCode">{{ recoveryCode }}</li>
        </ul>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" @click="downloadRecoveryCodes">
            <Download class="size-4" />
            دانلود کدها
          </Button>
          <Button @click="continueToApp">ذخیره کردم، ادامه</Button>
        </div>
      </CardContent>
    </Card>

    <!-- Enrollment -->
    <Card v-if="!user?.mfaEnabled && !setupDone">
      <CardHeader>
        <CardTitle>راه‌اندازی</CardTitle>
        <CardDescription>
          کد QR را با برنامه احراز هویت اسکن کنید یا کد محرمانه را دستی وارد کنید.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-5">
        <div v-if="starting" class="flex items-center gap-2 text-sm text-muted-foreground">
          <KeyRound class="size-4 animate-pulse" />
          در حال ساخت کد محرمانه…
        </div>
        <div v-else-if="enrollment" class="grid gap-5 sm:grid-cols-[auto_1fr]">
          <img
            :src="enrollment.qrDataUrl"
            alt="کد QR برای افزودن حساب به برنامه احراز هویت"
            width="200"
            height="200"
            class="rounded-lg border bg-white p-2"
          >
          <div class="space-y-3">
            <div>
              <p class="text-xs text-muted-foreground">کد محرمانه (در صورت اسکن نکردن QR)</p>
              <div class="mt-1.5 flex items-center gap-2">
                <code class="min-w-0 flex-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs" dir="ltr">{{ enrollment.secret }}</code>
                <Button variant="outline" size="icon" aria-label="کپی کد محرمانه" @click="copySecret">
                  <Copy class="size-4" />
                </Button>
              </div>
            </div>
            <form class="space-y-2" @submit.prevent="enable">
              <Label for="totp-code" required>کد ۶ رقمی برنامه</Label>
              <Input
                id="totp-code"
                v-model="code"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                placeholder="123456"
                dir="ltr"
                class="max-w-40 text-center tracking-[0.3em]"
                required
              />
              <Button type="submit" :disabled="busy || code.trim().length < 6">
                {{ busy ? 'در حال تأیید…' : 'فعال‌سازی' }}
              </Button>
            </form>
          </div>
        </div>
        <Button v-else variant="outline" @click="startSetup">تلاش دوباره برای ساخت کد</Button>
      </CardContent>
    </Card>
  </div>
</template>
