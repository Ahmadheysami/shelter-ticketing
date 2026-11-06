import type { AuthResult, MeResponse } from '~~/shared/types/api'
import type { Permission } from '~~/shared/domain'
import { apiFetch } from './useApi'

export function useAuth() {
  const state = useState<MeResponse>('auth-me', () => ({
    user: null,
    permissions: [],
    mfaSatisfied: false,
    session: null,
  }))
  const loaded = useState<boolean>('auth-loaded', () => false)

  const user = computed(() => state.value.user)
  const isAuthenticated = computed(() => Boolean(state.value.user))
  const isStaff = computed(() => user.value?.role === 'ADMIN' || user.value?.role === 'OWNER')
  const isOwner = computed(() => user.value?.role === 'OWNER')

  function can(permission: Permission): boolean {
    return state.value.permissions.includes(permission)
  }

  async function fetchMe(force = false): Promise<void> {
    if (loaded.value && !force) return
    const fetcher = import.meta.server ? useRequestFetch() : $fetch
    const response = await fetcher<{ data: MeResponse }>('/api/auth/me')
    state.value = response.data
    loaded.value = true
  }

  function reset(): void {
    state.value = { user: null, permissions: [], mfaSatisfied: false, session: null }
    loaded.value = true
  }

  async function login(email: string, password: string): Promise<AuthResult> {
    const result = await apiFetch<AuthResult>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    await fetchMe(true)
    return result
  }

  async function register(payload: {
    name: string
    email: string
    password: string
    acceptTerms: boolean
  }): Promise<string> {
    const result = await apiFetch<{ message: string }>('/api/auth/register', {
      method: 'POST',
      body: payload,
    })
    return result.message
  }

  async function staffLogin(secret: string): Promise<AuthResult> {
    const result = await apiFetch<AuthResult>('/api/auth/staff-login', {
      method: 'POST',
      body: { secret },
    })
    await fetchMe(true)
    return result
  }

  async function logout(): Promise<void> {
    try {
      await apiFetch<{ success: boolean }>('/api/auth/logout', { method: 'POST' })
    } finally {
      reset()
    }
  }

  return {
    state,
    loaded,
    user,
    isAuthenticated,
    isStaff,
    isOwner,
    can,
    fetchMe,
    login,
    staffLogin,
    register,
    logout,
    reset,
  }
}
