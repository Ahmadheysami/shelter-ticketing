const TIME_ZONE = 'Asia/Tehran'

const dateTimeFormatter = new Intl.DateTimeFormat('fa-IR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
})

const dateFormatter = new Intl.DateTimeFormat('fa-IR', {
  dateStyle: 'medium',
  timeZone: TIME_ZONE,
})

const shortDateFormatter = new Intl.DateTimeFormat('fa-IR', {
  month: 'short',
  day: 'numeric',
  timeZone: TIME_ZONE,
})

const numberFormatter = new Intl.NumberFormat('fa-IR')

const relativeFormatter = new Intl.RelativeTimeFormat('fa', { numeric: 'auto' })

export function useFormat() {
  function formatDateTime(value: string | Date | null | undefined): string {
    if (!value) return '—'
    return dateTimeFormatter.format(new Date(value))
  }

  function formatDate(value: string | Date | null | undefined): string {
    if (!value) return '—'
    return dateFormatter.format(new Date(value))
  }

  function formatShortDate(value: string | Date): string {
    return shortDateFormatter.format(new Date(value))
  }

  function formatNumber(value: number | null | undefined): string {
    return numberFormatter.format(value ?? 0)
  }

  function formatRelative(value: string | Date | null | undefined): string {
    if (!value) return '—'
    const diffMs = new Date(value).getTime() - Date.now()
    const abs = Math.abs(diffMs)
    if (abs < 60_000) return 'همین حالا'
    if (abs < 3_600_000) return relativeFormatter.format(Math.round(diffMs / 60_000), 'minute')
    if (abs < 86_400_000) return relativeFormatter.format(Math.round(diffMs / 3_600_000), 'hour')
    if (abs < 2_592_000_000) return relativeFormatter.format(Math.round(diffMs / 86_400_000), 'day')
    return relativeFormatter.format(Math.round(diffMs / 2_592_000_000), 'month')
  }

  return { formatDateTime, formatDate, formatShortDate, formatNumber, formatRelative }
}
