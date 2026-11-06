<script setup lang="ts">
import { UserRound } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Alert } from '~/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { apiFetch, errorMessage } from '~/composables/useApi'
import { useToast } from '~/composables/useToast'
import { safeInternalPath } from '~/lib/utils'

definePageMeta({ layout: 'app', requiresAuth: true, role: 'ADMIN', allowIncompleteMfa: true })
useHead({ title: 'تکمیل پروفایل مدیر | تیکت‌یار', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const route = useRoute()
const { user, fetchMe } = useAuth()
const { toast } = useToast()

const name = ref(user.value?.profileCompleted ? user.value.name : '')
const email = ref(user.value?.profileCompleted ? user.value.email : '')
const busy = ref(false)
const error = ref('')

const redirectPath = computed(() => {
  const value = safeInternalPath(route.query.redirect, '/admin', { prefix: '/admin' })
  return value === '/admin/setup' ? '/admin' : value
})

async function submit(): Promise<void> {
  error.value = ''
  busy.value = true
  try {
    await apiFetch('/api/auth/profile', {
      method: 'PATCH',
      body: { name: name.value.trim(), email: email.value.trim() },
    })
    await fetchMe(true)
    toast({ title: 'پروفایل تکمیل شد', variant: 'success' })
    await navigateTo(redirectPath.value)
  } catch (caught) {
    error.value = errorMessage(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-6">
    <PageHeader
      title="تکمیل پروفایل مدیر"
      description="حساب مدیریتی شما با یک کلید امنیتی ساخته شده است. نام و ایمیل خود را وارد کنید تا در گفتگوها و رویدادها نمایش داده شود."
    />

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <UserRound class="size-4 text-primary" aria-hidden="true" />
          اطلاعات نمایشی شما
        </CardTitle>
        <CardDescription>
          این اطلاعات برای تیم پشتیبانی و کاربران تیکت‌ها نمایش داده می‌شود. بعداً هم قابل ویرایش است.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert v-if="error" variant="destructive" class="mb-4">{{ error }}</Alert>
        <form class="space-y-4" novalidate @submit.prevent="submit">
          <div class="space-y-2">
            <Label for="profile-name" required>نام و نام خانوادگی</Label>
            <Input id="profile-name" v-model="name" autocomplete="name" required maxlength="80" />
          </div>
          <div class="space-y-2">
            <Label for="profile-email" required>ایمیل</Label>
            <Input
              id="profile-email"
              v-model="email"
              type="email"
              autocomplete="email"
              inputmode="email"
              dir="ltr"
              required
              maxlength="254"
            />
            <p class="text-xs text-muted-foreground">برای اطلاع‌رسانی امنیتی و بازیابی دسترسی استفاده می‌شود.</p>
          </div>
          <Button type="submit" :disabled="busy">
            {{ busy ? 'در حال ذخیره…' : 'ذخیره و ورود به داشبورد' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
