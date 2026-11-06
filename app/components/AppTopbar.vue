<script setup lang="ts">
import { LogOut, Menu, Moon, Settings, Sun } from 'lucide-vue-next'
import { ROLE_LABELS } from '~~/shared/domain'
import { Avatar } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { DropdownMenu } from '~/components/ui/dropdown-menu'
import { useAuth } from '~/composables/useAuth'
import { useTheme } from '~/composables/useTheme'

const emit = defineEmits<{ 'open-menu': [] }>()

const { user, logout } = useAuth()
const { isDark, toggle } = useTheme()

async function signOut(): Promise<void> {
  const wasStaff = user.value?.role === 'ADMIN' || user.value?.role === 'OWNER'
  await logout()
  await navigateTo(wasStaff ? '/admin/login' : '/login')
}

const menuItems = computed(() => [
  { label: 'تنظیمات حساب', icon: Settings, onSelect: () => navigateTo('/settings') },
  { separator: true },
  { label: 'خروج از حساب', icon: LogOut, destructive: true, onSelect: signOut },
])
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
    <div class="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" class="lg:hidden" aria-label="باز کردن منو" @click="emit('open-menu')">
        <Menu class="size-5" />
      </Button>

      <div class="lg:hidden"><BrandLogo compact /></div>

      <div class="hidden min-w-0 flex-1 sm:block">
        <p class="truncate text-xs text-muted-foreground">
          سامانه پشتیبانی · پاسخ‌گویی شفاف و پیگیری ساختارمند
        </p>
      </div>

      <div class="ms-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          :aria-label="isDark ? 'روشن کردن ظاهر' : 'تاریک کردن ظاهر'"
          @click="toggle"
        >
          <Sun v-if="isDark" class="size-4.5" />
          <Moon v-else class="size-4.5" />
        </Button>

        <DropdownMenu v-if="user" :items="menuItems">
          <template #trigger>
            <button
              type="button"
              class="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :aria-label="`منوی حساب ${user.name}`"
            >
              <Avatar :name="user.name" class="size-8" />
              <span class="hidden text-start sm:block">
                <span class="block max-w-32 truncate text-xs font-semibold">{{ user.name }}</span>
                <span class="block text-[10px] text-muted-foreground">{{ ROLE_LABELS[user.role] }}</span>
              </span>
            </button>
          </template>
        </DropdownMenu>
      </div>
    </div>
  </header>
</template>
