import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  modules: ['@nuxt/eslint'],

  // Only .vue files are components. The ui/*/index.ts barrel files are for
  // explicit imports and would otherwise register duplicate component names.
  components: [{ path: '~/components', extensions: ['vue'] }],

  css: ['@fontsource-variable/vazirmatn/index.css', '~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'fa', dir: 'rtl' },
      title: 'تیکت‌یار | سامانه مدیریت درخواست‌ها و پشتیبانی',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#4f46e5' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },

  runtimeConfig: {
    public: {
      appUrl: process.env.APP_URL || 'http://localhost:3000',
    },
  },

  vite: {
    plugins: [tailwindcss()],
    // Without this, Vite discovers socket.io-client at runtime and reloads the
    // page repeatedly, which prevents client hydration during development.
    optimizeDeps: { include: ['socket.io-client'] },
  },

  nitro: {
    compressPublicAssets: true,
  },

  // Private areas must never be indexed even if a crawler ignores robots.txt.
  routeRules: {
    '/dashboard': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/tickets/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/settings/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/admin/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/login': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/register': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/mfa': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/forgot-password': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/reset-password': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/verify-email': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/api/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
  },

  typescript: {
    strict: true,
    typeCheck: false,
    tsConfig: {
      compilerOptions: {
        // @node-rs/argon2 ships an ambient const enum; Nuxt's ESM-only emit
        // cannot reference it while verbatimModuleSyntax is enabled.
        verbatimModuleSyntax: false,
      },
    },
  },
})
