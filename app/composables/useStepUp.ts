import { ApiClientError } from './useApi'

let pendingResolver: ((confirmed: boolean) => void) | null = null

export function useStepUp() {
  const open = useState<boolean>('stepup-open', () => false)

  function promptStepUp(): Promise<boolean> {
    open.value = true
    return new Promise((resolve) => {
      pendingResolver = resolve
    })
  }

  function finish(confirmed: boolean): void {
    open.value = false
    pendingResolver?.(confirmed)
    pendingResolver = null
  }

  /**
   * Runs an action, and if the server answers STEP_UP_REQUIRED, asks the user to
   * re-authenticate and retries once. Authorization remains server-side.
   */
  async function withStepUp<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action()
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'STEP_UP_REQUIRED') {
        const confirmed = await promptStepUp()
        if (confirmed) return await action()
      }
      throw error
    }
  }

  return { open, promptStepUp, finish, withStepUp }
}
