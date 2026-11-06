<script setup lang="ts">
import {
  Gauge,
  Inbox,
  LayoutDashboard,
  MonitorSmartphone,
  Plus,
  ScrollText,
  Settings,
  Ticket,
  Users,
} from 'lucide-vue-next'
import { useAuth } from '~/composables/useAuth'

const route = useRoute()
const { isStaff, isOwner } = useAuth()

interface NavItem {
  label: string
  to: string
  icon: typeof LayoutDashboard
}

const workspace: NavItem[] = [
  { label: 'داشبورد', to: '/dashboard', icon: LayoutDashboard },
  { label: 'تیکت‌های من', to: '/tickets', icon: Ticket },
  { label: 'ثبت تیکت جدید', to: '/tickets/new', icon: Plus },
]

const adminNav: NavItem[] = [
  { label: 'نمای کلی پشتیبانی', to: '/admin', icon: Gauge },
  { label: 'صف تیکت‌ها', to: '/admin/tickets', icon: Inbox },
  { label: 'مدیریت کاربران', to: '/admin/users', icon: Users },
]

const ownerNav: NavItem[] = [
  { label: 'رویدادهای امنیتی', to: '/admin/audit', icon: ScrollText },
  { label: 'نشست‌های فعال', to: '/admin/sessions', icon: MonitorSmartphone },
]

function isActive(item: NavItem): boolean {
  if (item.to === '/admin' || item.to === '/dashboard') return route.path === item.to
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}
</script>

<template>
  <nav class="flex h-full flex-col gap-6 p-4" aria-label="ناوبری اصلی">
    <div class="px-2 pt-1"><BrandLogo /></div>

    <div class="space-y-1">
      <p class="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">فضای کار</p>
      <NuxtLink
        v-for="item in workspace"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive(item)
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        ]"
        :aria-current="isActive(item) ? 'page' : undefined"
      >
        <component :is="item.icon" class="size-4" aria-hidden="true" />
        {{ item.label }}
      </NuxtLink>
    </div>

    <div v-if="isStaff" class="space-y-1">
      <p class="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">پشتیبانی</p>
      <NuxtLink
        v-for="item in adminNav"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive(item)
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        ]"
        :aria-current="isActive(item) ? 'page' : undefined"
      >
        <component :is="item.icon" class="size-4" aria-hidden="true" />
        {{ item.label }}
      </NuxtLink>
    </div>

    <div v-if="isOwner" class="space-y-1">
      <p class="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">مالک سیستم</p>
      <NuxtLink
        v-for="item in ownerNav"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive(item)
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        ]"
        :aria-current="isActive(item) ? 'page' : undefined"
      >
        <component :is="item.icon" class="size-4" aria-hidden="true" />
        {{ item.label }}
      </NuxtLink>
    </div>

    <div class="mt-auto space-y-1">
      <NuxtLink
        to="/settings"
        :class="[
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive({ label: '', to: '/settings', icon: Settings })
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        ]"
      >
        <Settings class="size-4" aria-hidden="true" />
        تنظیمات حساب
      </NuxtLink>
    </div>
  </nav>
</template>
