<script setup lang="ts">
import { Ban, Copy, KeyRound, Search, ShieldCheck, UserCheck, UserPlus } from 'lucide-vue-next'
import { ROLE_LABELS, USER_STATUS_LABELS, ROLES } from '~~/shared/domain'
import type { AdminUserRow, Paginated } from '~~/shared/types/api'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Select } from '~/components/ui/select'
import { Badge } from '~/components/ui/badge'
import { Alert } from '~/components/ui/alert'
import { Card, CardContent } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { Dialog } from '~/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import { apiFetch, errorMessage } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'
import { useFormat } from '~/composables/useFormat'
import { useStepUp } from '~/composables/useStepUp'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'app', requiresAuth: true, role: 'ADMIN' })
useHead({ title: 'مدیریت کاربران | تیکت‌یار', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const request = useRequestFetch()
const { user, isOwner } = useAuth()
const { formatDateTime, formatNumber } = useFormat()
const { withStepUp } = useStepUp()
const { toast } = useToast()

const q = ref('')
const role = ref('all')
const status = ref('all')
const page = ref(1)

const query = computed(() => {
  const params = new URLSearchParams({ page: String(page.value), pageSize: '10' })
  if (q.value) params.set('q', q.value)
  if (role.value !== 'all') params.set('role', role.value)
  if (status.value !== 'all') params.set('status', status.value)
  return params.toString()
})

const { data, pending, error, refresh } = await useAsyncData(
  'admin-users',
  () => request<{ data: Paginated<AdminUserRow> }>(`/api/admin/users?${query.value}`),
  { watch: [query] },
)

const result = computed(() => data.value?.data)
const users = computed(() => result.value?.items ?? [])

function applyFilters(): void {
  page.value = 1
}

const statusTarget = ref<AdminUserRow | null>(null)
const statusOpen = ref(false)
const statusBusy = ref(false)

function askStatusChange(target: AdminUserRow): void {
  statusTarget.value = target
  statusOpen.value = true
}

async function changeStatus(): Promise<void> {
  if (!statusTarget.value) return
  const nextStatus = statusTarget.value.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
  statusBusy.value = true
  try {
    await withStepUp(() =>
      apiFetch(`/api/admin/users/${statusTarget.value!.id}`, {
        method: 'PATCH',
        body: { status: nextStatus },
      }),
    )
    statusOpen.value = false
    toast({ title: 'وضعیت کاربر به‌روزرسانی شد', variant: 'success' })
    await refresh()
  } catch (caught) {
    toast({ title: 'تغییر وضعیت انجام نشد', description: errorMessage(caught), variant: 'error' })
  } finally {
    statusBusy.value = false
  }
}

const roleTarget = ref<AdminUserRow | null>(null)
const nextRole = ref('USER')
const roleOpen = ref(false)
const roleBusy = ref(false)

function askRoleChange(target: AdminUserRow): void {
  roleTarget.value = target
  nextRole.value = target.role === 'ADMIN' ? 'USER' : 'ADMIN'
  roleOpen.value = true
}

async function changeRole(): Promise<void> {
  if (!roleTarget.value) return
  roleBusy.value = true
  try {
    const result = await withStepUp(() =>
      apiFetch<{ staffSecret?: string }>(`/api/admin/users/${roleTarget.value!.id}`, {
        method: 'PATCH',
        body: { role: nextRole.value },
      }),
    )
    roleOpen.value = false
    if (result.staffSecret) {
      generatedSecret.value = result.staffSecret
      generatedFor.value = roleTarget.value.name || roleTarget.value.email
      secretOpen.value = true
    }
    toast({ title: 'نقش کاربر تغییر کرد', variant: 'success' })
    await refresh()
  } catch (caught) {
    toast({ title: 'تغییر نقش انجام نشد', description: errorMessage(caught), variant: 'error' })
  } finally {
    roleBusy.value = false
  }
}

const createOpen = ref(false)
const createBusy = ref(false)
const createError = ref('')
const createdSecret = ref('')
const generatedSecret = ref('')
const generatedFor = ref('')
const secretOpen = ref(false)
const copyState = ref<'idle' | 'done' | 'failed'>('idle')

const createTitle = computed(() =>
  createdSecret.value ? 'کلید ورود مدیر جدید' : 'ایجاد حساب مدیر',
)
const createDescription = computed(() =>
  createdSecret.value
    ? 'این کلید فقط یک بار نمایش داده می‌شود. آن را از مسیر امن به مدیر تحویل دهید.'
    : 'برای مدیر جدید یک کلید ورود یک‌بارمصرف ساخته می‌شود. نام و ایمیل را خود مدیر در اولین ورود وارد می‌کند.',
)

async function createAdmin(): Promise<void> {
  createError.value = ''
  createBusy.value = true
  try {
    const result = await withStepUp(() =>
      apiFetch<{ id: string; secret: string }>('/api/admin/users', { method: 'POST' }),
    )
    createdSecret.value = result.secret
    copyState.value = 'idle'
    toast({ title: 'حساب مدیر ایجاد شد', description: 'کلید ورود را در جای امن ذخیره کنید.', variant: 'success' })
    await refresh()
  } catch (caught) {
    createError.value = errorMessage(caught)
  } finally {
    createBusy.value = false
  }
}

function closeCreate(): void {
  createOpen.value = false
  createdSecret.value = ''
  createError.value = ''
  copyState.value = 'idle'
}

function closeSecret(): void {
  secretOpen.value = false
  generatedSecret.value = ''
  generatedFor.value = ''
  copyState.value = 'idle'
}

async function copySecret(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    copyState.value = 'done'
  } catch {
    copyState.value = 'failed'
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="مدیریت کاربران"
      description="کاربران، نقش‌ها و وضعیت دسترسی را مدیریت کنید. تغییر نقش فقط توسط مالک سیستم انجام می‌شود."
    >
      <template #actions>
        <Button v-if="isOwner" @click="createOpen = true">
          <UserPlus class="size-4" />
          ایجاد حساب مدیر
        </Button>
      </template>
    </PageHeader>

    <form class="rounded-xl border border-border/80 bg-card p-4" @submit.prevent="applyFilters">
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div class="relative lg:col-span-2">
          <Search class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input v-model="q" class="ps-9" type="search" placeholder="جستجوی نام یا ایمیل…" aria-label="جستجوی کاربر" />
        </div>
        <Select
          v-model="role"
          :items="[{ value: 'all', label: 'همه نقش‌ها' }, ...ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }))]"
          aria-label="فیلتر نقش"
          @update:model-value="applyFilters"
        />
        <Select
          v-model="status"
          :items="[
            { value: 'all', label: 'همه وضعیت‌ها' },
            { value: 'ACTIVE', label: USER_STATUS_LABELS.ACTIVE },
            { value: 'SUSPENDED', label: USER_STATUS_LABELS.SUSPENDED },
          ]"
          aria-label="فیلتر وضعیت"
          @update:model-value="applyFilters"
        />
      </div>
    </form>

    <Alert v-if="error" variant="destructive">دریافت فهرست کاربران انجام نشد.</Alert>

    <Card>
      <CardContent class="p-0 sm:p-2">
        <div v-if="pending" class="space-y-2 p-4">
          <Skeleton v-for="index in 5" :key="index" class="h-14 w-full" />
        </div>
        <Table v-else>
          <TableHeader>
            <TableRow class="hover:bg-transparent">
              <TableHead>کاربر</TableHead>
              <TableHead class="w-24">نقش</TableHead>
              <TableHead class="w-24">وضعیت</TableHead>
              <TableHead class="w-24">دومرحله‌ای</TableHead>
              <TableHead class="w-32">آخرین ورود</TableHead>
              <TableHead class="w-40">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in users" :key="item.id">
              <TableCell>
                <p class="text-sm font-medium">
                  {{ item.name || 'بدون نام' }}
                  <span v-if="item.id === user?.id" class="text-xs text-muted-foreground"> (شما)</span>
                </p>
                <p class="text-xs text-muted-foreground" :dir="item.profileCompleted ? 'ltr' : undefined">
                  {{ item.profileCompleted ? item.email : 'در انتظار تکمیل پروفایل' }}
                </p>
                <p class="mt-0.5 text-[10px] text-muted-foreground">{{ formatNumber(item.ticketCount) }} تیکت</p>
              </TableCell>
              <TableCell><Badge variant="secondary">{{ ROLE_LABELS[item.role] }}</Badge></TableCell>
              <TableCell>
                <Badge :variant="item.status === 'ACTIVE' ? 'success' : 'destructive'">
                  {{ USER_STATUS_LABELS[item.status] }}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge :variant="item.mfaEnabled ? 'success' : 'muted'">{{ item.mfaEnabled ? 'فعال' : 'غیرفعال' }}</Badge>
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">{{ item.lastLoginAt ? formatDateTime(item.lastLoginAt) : '—' }}</TableCell>
              <TableCell>
                <div class="flex flex-wrap gap-1.5">
                  <Button
                    v-if="isOwner && item.role !== 'OWNER' && item.id !== user?.id"
                    variant="outline"
                    size="sm"
                    @click="askRoleChange(item)"
                  >
                    <ShieldCheck class="size-3.5" />
                    تغییر نقش
                  </Button>
                  <Button
                    v-if="item.role !== 'OWNER' && item.id !== user?.id"
                    variant="outline"
                    size="sm"
                    @click="askStatusChange(item)"
                  >
                    <Ban v-if="item.status === 'ACTIVE'" class="size-3.5" />
                    <UserCheck v-else class="size-3.5" />
                    {{ item.status === 'ACTIVE' ? 'تعلیق' : 'فعال‌سازی' }}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div v-if="!pending && users.length === 0" class="p-6">
          <EmptyState title="کاربری پیدا نشد" description="عبارت جستجو یا فیلترها را تغییر دهید." />
        </div>
      </CardContent>
    </Card>

    <AppPagination
      v-if="result && result.total > 0"
      :page="result.page"
      :total-pages="result.totalPages"
      :total="result.total"
      @update:page="page = $event"
    />

    <ConfirmDialog
      v-model:open="statusOpen"
      :title="statusTarget?.status === 'ACTIVE' ? 'تعلیق حساب کاربر' : 'فعال‌سازی حساب کاربر'"
      :description="
        statusTarget?.status === 'ACTIVE'
          ? 'تمام نشست‌های کاربر باطل می‌شود و ورود بعدی مسدود خواهد بود.'
          : 'کاربر می‌تواند دوباره وارد شود.'
      "
      :confirm-label="statusTarget?.status === 'ACTIVE' ? 'تعلیق حساب' : 'فعال‌سازی'"
      :destructive="statusTarget?.status === 'ACTIVE'"
      :loading="statusBusy"
      @confirm="changeStatus"
    />

    <ConfirmDialog
      v-model:open="roleOpen"
      title="تغییر نقش کاربر"
      :description="`نقش کاربر به «${ROLE_LABELS[nextRole as keyof typeof ROLE_LABELS] ?? nextRole}» تغییر می‌کند و همه نشست‌های فعلی او باطل می‌شود.`"
      confirm-label="تغییر نقش"
      :destructive="false"
      :loading="roleBusy"
      @confirm="changeRole"
    />

    <Dialog
      v-model:open="createOpen"
      :title="createTitle"
      :description="createDescription"
      :closable="!createBusy"
      @update:open="closeCreate"
    >
      <Alert v-if="createError" variant="destructive" class="mb-3">{{ createError }}</Alert>

      <template v-if="createdSecret">
        <div class="space-y-3">
          <div class="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-6 text-amber-900 dark:text-amber-200">
            این کلید دیگر نمایش داده نمی‌شود. اگر گم شود، باید دسترسی حساب را از نو تنظیم کنید.
          </div>
          <div class="flex items-center gap-2">
            <code class="min-w-0 flex-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs" dir="ltr">{{ createdSecret }}</code>
            <Button variant="outline" size="icon" aria-label="کپی کلید ورود" @click="copySecret(createdSecret)">
              <Copy class="size-4" />
            </Button>
          </div>
          <p v-if="copyState === 'done'" class="text-xs text-emerald-600 dark:text-emerald-400">کلید کپی شد.</p>
          <p v-if="copyState === 'failed'" class="text-xs text-destructive">کپی خودکار انجام نشد؛ کلید را دستی انتخاب کنید.</p>
          <div class="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" @click="closeCreate">ذخیره کردم، بستن</Button>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="space-y-3">
          <ul class="list-inside list-disc space-y-1 text-sm leading-7 text-muted-foreground">
            <li>یک کلید ورود یک‌بارمصرف برای مدیر ساخته می‌شود.</li>
            <li>مدیر در اولین ورود نام و ایمیل خودش را وارد می‌کند.</li>
            <li>کلید فقط یک بار نمایش داده می‌شود؛ آن را در جای امن نگه دارید.</li>
          </ul>
          <div class="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" :disabled="createBusy" @click="createAdmin">
              <KeyRound class="size-4" />
              {{ createBusy ? 'در حال ساخت…' : 'ایجاد حساب و ساخت کلید' }}
            </Button>
            <Button type="button" variant="ghost" :disabled="createBusy" @click="closeCreate">انصراف</Button>
          </div>
        </div>
      </template>
    </Dialog>

    <Dialog
      v-model:open="secretOpen"
      title="کلید ورود مدیر جدید"
      description="نقش کاربر به مدیر تغییر کرد و یک کلید امنیتی ساخته شد. کلید فقط یک بار نمایش داده می‌شود."
      @update:open="closeSecret"
    >
      <div class="space-y-3">
        <p v-if="generatedFor" class="text-xs text-muted-foreground">برای: {{ generatedFor }}</p>
        <div class="flex items-center gap-2">
          <code class="min-w-0 flex-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs" dir="ltr">{{ generatedSecret }}</code>
          <Button variant="outline" size="icon" aria-label="کپی کلید ورود" @click="copySecret(generatedSecret)">
            <Copy class="size-4" />
          </Button>
        </div>
        <p v-if="copyState === 'done'" class="text-xs text-emerald-600 dark:text-emerald-400">کلید کپی شد.</p>
        <p v-if="copyState === 'failed'" class="text-xs text-destructive">کپی خودکار انجام نشد؛ کلید را دستی انتخاب کنید.</p>
        <Button type="button" @click="closeSecret">ذخیره کردم، بستن</Button>
      </div>
    </Dialog>
  </div>
</template>
