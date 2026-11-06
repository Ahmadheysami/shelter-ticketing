<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next'
import { Dialog } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import { Alert } from '~/components/ui/alert'
import { apiFetch, errorMessage } from '~/composables/useApi'
import { useStepUp } from '~/composables/useStepUp'
import { useToast } from '~/composables/useToast'

const { open, finish } = useStepUp()
const { user } = useAuth()
const { toast } = useToast()

const credential = ref('')
const code = ref('')
const busy = ref(false)
const error = ref('')

const isStaff = computed(() => user.value?.role === 'ADMIN' || user.value?.role === 'OWNER')
const requiresCode = computed(() => Boolean(user.value?.mfaEnabled))

async function submit(): Promise<void> {
  error.value = ''
  busy.value = true
  try {
    await apiFetch<{ success: boolean }>('/api/auth/reauth', {
      method: 'POST',
      body: isStaff.value
        ? { secret: credential.value, code: code.value || undefined }
        : { password: credential.value, code: code.value || undefined },
    })
    credential.value = ''
    code.value = ''
    toast({ title: 'هویت شما تأیید شد', variant: 'success' })
    finish(true)
  } catch (caught) {
    error.value = errorMessage(caught)
  } finally {
    busy.value = false
  }
}

function cancel(): void {
  credential.value = ''
  code.value = ''
  error.value = ''
  finish(false)
}
</script>

<template>
  <Dialog
    v-model:open="open"
    title="تأیید هویت"
    description="برای این عملیات حساس، هویت خود را دوباره تأیید کنید."
    class="z-[70]"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <Alert v-if="error" variant="destructive">{{ error }}</Alert>
      <div class="space-y-2">
        <Label for="stepup-credential" required>{{ isStaff ? 'کلید امنیتی ورود' : 'رمز عبور' }}</Label>
        <Input
          id="stepup-credential"
          v-model="credential"
          type="password"
          :autocomplete="isStaff ? 'off' : 'current-password'"
          :class="isStaff ? 'font-mono' : ''"
          required
          dir="ltr"
        />
      </div>
      <div v-if="requiresCode" class="space-y-2">
        <Label for="stepup-code" required>کد ورود دومرحله‌ای</Label>
        <Input
          id="stepup-code"
          v-model="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          placeholder="123456"
          dir="ltr"
          required
        />
      </div>
      <p class="flex items-center gap-2 text-xs leading-6 text-muted-foreground">
        <ShieldCheck class="size-4 shrink-0" />
        برای امنیت حساب، هویت خود را دوباره تأیید کنید.
      </p>
      <div class="flex flex-col-reverse gap-2 sm:flex-row">
        <Button type="submit" :disabled="busy">
          {{ busy ? 'در حال تأیید…' : 'تأیید هویت' }}
        </Button>
        <Button type="button" variant="ghost" :disabled="busy" @click="cancel">انصراف</Button>
      </div>
    </form>
  </Dialog>
</template>
