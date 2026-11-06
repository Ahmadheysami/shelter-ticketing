<script setup lang="ts">
import { ArrowRight, Info, Send } from 'lucide-vue-next'
import {
  CATEGORY_LABELS,
  PRIORITY_HINTS,
  PRIORITY_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
} from '~~/shared/domain'
import { createTicketSchema } from '~~/shared/validation'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import { Select } from '~/components/ui/select'
import { Alert } from '~/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { apiFetch, errorMessage } from '~/composables/useApi'

definePageMeta({ layout: 'app', requiresAuth: true })
useHead({ title: 'ثبت تیکت جدید | تیکت‌یار', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const subject = ref('')
const category = ref('')
const priority = ref('NORMAL')
const description = ref('')
const busy = ref(false)
const error = ref('')
const fields = ref<Record<string, string>>({})

const categoryItems = TICKET_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }))
const priorityItems = TICKET_PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] }))

const fieldList = computed(() => Object.entries(fields.value))

async function submit(): Promise<void> {
  error.value = ''
  fields.value = {}
  const parsed = createTicketSchema.safeParse({
    subject: subject.value,
    category: category.value,
    priority: priority.value,
    description: description.value,
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
    const ticket = await apiFetch<{ id: number; publicId: string }>('/api/tickets', {
      method: 'POST',
      body: parsed.data,
    })
    await navigateTo(`/tickets/${ticket.id}`)
  } catch (caught) {
    error.value = errorMessage(caught)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div>
      <NuxtLink to="/tickets" class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowRight class="size-3.5" />
        بازگشت به تیکت‌ها
      </NuxtLink>
      <h1 class="mt-3 text-xl font-bold tracking-tight sm:text-2xl">ثبت تیکت جدید</h1>
      <p class="mt-1.5 text-sm leading-7 text-muted-foreground">
        هرچه اطلاعات دقیق‌تر باشد، تیم پشتیبانی سریع‌تر می‌تواند کمک کند.
      </p>
    </div>

    <Alert v-if="error" variant="destructive" title="ثبت تیکت انجام نشد">{{ error }}</Alert>
    <Alert v-if="fieldList.length > 0" variant="destructive" title="لطفاً این موارد را بررسی کنید">
      <ul class="list-inside list-disc space-y-1">
        <li v-for="[key, message] in fieldList" :key="key">{{ message }}</li>
      </ul>
    </Alert>

    <form class="space-y-5" novalidate @submit.prevent="submit">
      <Card>
        <CardHeader>
          <CardTitle>اطلاعات اصلی</CardTitle>
          <CardDescription>موضوع کوتاه و روشن بنویسید تا قابل پیگیری باشد.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="subject" required>عنوان</Label>
            <Input
              id="subject"
              v-model="subject"
              maxlength="120"
              placeholder="مثال: خطا در ورود پس از تغییر رمز"
              required
              :aria-invalid="Boolean(fields.subject)"
              aria-describedby="subject-help"
            />
            <p id="subject-help" class="text-[11px] text-muted-foreground">حداقل ۴ و حداکثر ۱۲۰ کاراکتر</p>
            <p v-if="fields.subject" class="text-xs text-destructive">{{ fields.subject }}</p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="category" required>دسته‌بندی</Label>
              <Select
                id="category"
                v-model="category"
                :items="categoryItems"
                placeholder="انتخاب دسته"
                :aria-invalid="Boolean(fields.category)"
              />
              <p v-if="fields.category" class="text-xs text-destructive">{{ fields.category }}</p>
            </div>
            <div class="space-y-2">
              <Label for="priority" required>اولویت</Label>
              <Select id="priority" v-model="priority" :items="priorityItems" />
              <p class="text-[11px] text-muted-foreground">{{ PRIORITY_HINTS[priority as keyof typeof PRIORITY_HINTS] }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>شرح درخواست</CardTitle>
          <CardDescription>مراحل بازتولید مشکل، پیام خطا و زمان بروز آن را بنویسید.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <Label for="description" required>توضیحات</Label>
          <Textarea
            id="description"
            v-model="description"
            class="min-h-44"
            maxlength="8000"
            placeholder="چه اتفاقی افتاده است؟ از چه زمانی؟ چه اقداماتی انجام داده‌اید؟"
            required
            :aria-invalid="Boolean(fields.description)"
          />
          <div class="flex items-center justify-between gap-3">
            <p v-if="fields.description" class="text-xs text-destructive">{{ fields.description }}</p>
            <p class="ms-auto text-[11px] tabular text-muted-foreground">{{ description.length }} / 8000</p>
          </div>
        </CardContent>
      </Card>

      <Alert variant="info" class="items-start">
        <template #icon><Info class="mt-0.5 size-4 shrink-0" /></template>
        اولویت «فوری» را فقط برای توقف کامل سرویس یا اختلال جدی در استفاده از آن انتخاب کنید.
      </Alert>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" as-child>
          <NuxtLink to="/tickets">انصراف</NuxtLink>
        </Button>
        <Button type="submit" :disabled="busy">
          <Send class="size-4" />
          {{ busy ? 'در حال ثبت…' : 'ثبت تیکت' }}
        </Button>
      </div>
    </form>
  </div>
</template>
