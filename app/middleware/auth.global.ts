import { useAuth } from '~/composables/useAuth'

/**
 * UX-level route protection. Every API call still authorizes on the server;
 * these redirects only prevent users from landing on unusable screens.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { loaded, user, fetchMe, state } = useAuth()

  if (!loaded.value) {
    try {
      await fetchMe()
    } catch {
      // A network failure should not silently log the user out.
      return
    }
  }

  const isAdminArea = to.path === '/admin' || to.path.startsWith('/admin/')
  const isAdminLogin = to.path === '/admin/login'
  const isAdminSetup = to.path === '/admin/setup'

  if (!user.value) {
    // The admin area has its own secret-only entry screen.
    if (isAdminArea && !isAdminLogin) {
      return navigateTo({ path: '/admin/login', query: { redirect: to.fullPath } })
    }
    if (to.meta.requiresAuth === true) {
      return navigateTo({
        path: '/login',
        query: to.fullPath !== '/dashboard' ? { redirect: to.fullPath } : {},
      })
    }
    return
  }

  const isStaff = user.value.role === 'ADMIN' || user.value.role === 'OWNER'

  if (isAdminArea) {
    if (!isStaff) return navigateTo('/dashboard')
    if (isAdminLogin) return navigateTo('/admin')
    // Staff who opted into two-factor must clear the challenge first.
    if (!state.value.mfaSatisfied) return navigateTo('/mfa')
    if (!user.value.profileCompleted && !isAdminSetup) {
      return navigateTo({ path: '/admin/setup', query: { redirect: to.fullPath } })
    }
    if (user.value.profileCompleted && isAdminSetup) {
      return navigateTo('/admin')
    }
    if (to.meta.role === 'OWNER' && user.value.role !== 'OWNER') {
      return navigateTo('/admin')
    }
    return
  }

  // Staff must finish their profile before using the rest of the app.
  if (isStaff && !user.value.profileCompleted) {
    return navigateTo('/admin/setup')
  }

  const allowIncompleteMfa = to.meta.allowIncompleteMfa === true
  const mfaSatisfied = state.value.mfaSatisfied

  if (!allowIncompleteMfa && !mfaSatisfied) {
    return navigateTo('/mfa')
  }

  if (['/login', '/register', '/forgot-password'].includes(to.path)) {
    return navigateTo(isStaff ? '/admin' : '/dashboard')
  }

  const requiredRole = to.meta.role as 'ADMIN' | 'OWNER' | undefined
  if (requiredRole === 'ADMIN' && !isStaff) {
    return navigateTo('/dashboard')
  }
  if (requiredRole === 'OWNER' && user.value.role !== 'OWNER') {
    return navigateTo('/admin')
  }
})
