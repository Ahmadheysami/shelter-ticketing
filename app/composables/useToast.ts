export type ToastVariant = 'default' | 'success' | 'error' | 'warning'

export interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

let counter = 0

export function useToast() {
  const toasts = useState<ToastItem[]>('toasts', () => [])

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function toast(input: {
    title: string
    description?: string
    variant?: ToastVariant
    duration?: number
  }): void {
    counter += 1
    const item: ToastItem = {
      id: counter,
      title: input.title,
      description: input.description,
      variant: input.variant ?? 'default',
    }
    toasts.value = [...toasts.value.slice(-3), item]
    if (import.meta.client) {
      window.setTimeout(() => dismiss(item.id), input.duration ?? 5000)
    }
  }

  return { toasts, toast, dismiss }
}
