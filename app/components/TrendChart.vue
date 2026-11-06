<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'

interface TrendPoint {
  date: string
  created: number
  resolved: number
}

const props = defineProps<{ data: TrendPoint[] }>()
const { formatShortDate, formatNumber } = useFormat()

const WIDTH = 680
const HEIGHT = 250
const PAD_X = 36
const PAD_TOP = 18
const PAD_BOTTOM = 34

const maxValue = computed(() =>
  Math.max(1, ...props.data.map((point) => Math.max(point.created, point.resolved))),
)
const innerWidth = WIDTH - PAD_X - 12
const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

function xAt(index: number): number {
  if (props.data.length <= 1) return PAD_X
  return PAD_X + (index / (props.data.length - 1)) * innerWidth
}

function yAt(value: number): number {
  return PAD_TOP + innerHeight - (value / maxValue.value) * innerHeight
}

function linePath(key: 'created' | 'resolved'): string {
  return props.data
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${xAt(index).toFixed(1)},${yAt(point[key]).toFixed(1)}`)
    .join(' ')
}

const areaPath = computed(() => {
  if (props.data.length === 0) return ''
  const lastIndex = props.data.length - 1
  return `${linePath('created')} L${xAt(lastIndex).toFixed(1)},${(PAD_TOP + innerHeight).toFixed(1)} L${xAt(0).toFixed(1)},${(PAD_TOP + innerHeight).toFixed(1)} Z`
})

const tickIndexes = computed(() => {
  const length = props.data.length
  if (length <= 1) return [0]
  const count = Math.min(6, length)
  return Array.from({ length: count }, (_, index) =>
    Math.round((index / (count - 1)) * (length - 1)),
  ).filter((value, index, array) => array.indexOf(value) === index)
})

const gridValues = computed(() => {
  const max = maxValue.value
  return [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(max * ratio))
})

const totals = computed(() => ({
  created: props.data.reduce((sum, point) => sum + point.created, 0),
  resolved: props.data.reduce((sum, point) => sum + point.resolved, 0),
}))

const summary = computed(
  () =>
    `روند ثبت و حل تیکت‌ها در ${formatNumber(props.data.length)} روز: ${formatNumber(totals.value.created)} تیکت ثبت‌شده و ${formatNumber(totals.value.resolved)} تیکت حل‌شده.`,
)
</script>

<template>
  <figure class="space-y-4">
    <figcaption class="sr-only">{{ summary }}</figcaption>
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="h-auto w-full overflow-visible"
      role="img"
      :aria-label="summary"
      dir="ltr"
    >
      <g>
        <line
          v-for="(value, index) in gridValues"
          :key="`grid-${index}`"
          :x1="PAD_X"
          :x2="WIDTH - 12"
          :y1="yAt(value)"
          :y2="yAt(value)"
          class="stroke-border"
          stroke-width="1"
          stroke-dasharray="3 5"
        />
        <text
          v-for="(value, index) in gridValues"
          :key="`grid-label-${index}`"
          :x="PAD_X - 8"
          :y="yAt(value) + 4"
          text-anchor="end"
          class="fill-muted-foreground text-[10px]"
        >
          {{ formatNumber(value) }}
        </text>
      </g>

      <path :d="areaPath" class="fill-[var(--chart-1)]" opacity="0.08" />
      <path
        :d="linePath('created')"
        fill="none"
        class="stroke-[var(--chart-1)]"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        :d="linePath('resolved')"
        fill="none"
        class="stroke-[var(--chart-3)]"
        stroke-width="2"
        stroke-dasharray="5 4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <g v-for="(point, index) in data" :key="point.date">
        <circle :cx="xAt(index)" :cy="yAt(point.created)" r="2.5" class="fill-[var(--chart-1)]">
          <title>{{ formatShortDate(point.date) }} — {{ formatNumber(point.created) }} ثبت</title>
        </circle>
        <circle :cx="xAt(index)" :cy="yAt(point.resolved)" r="2.5" class="fill-[var(--chart-3)]">
          <title>{{ formatShortDate(point.date) }} — {{ formatNumber(point.resolved) }} حل‌شده</title>
        </circle>
        <text
          v-if="tickIndexes.includes(index)"
          :x="xAt(index)"
          :y="HEIGHT - 10"
          text-anchor="middle"
          class="fill-muted-foreground text-[10px]"
          dir="rtl"
        >
          {{ formatShortDate(point.date) }}
        </text>
      </g>
    </svg>

    <div class="flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
      <span class="inline-flex items-center gap-2">
        <span class="h-0.5 w-5 rounded bg-[var(--chart-1)]" aria-hidden="true" />
        ثبت‌شده ({{ formatNumber(totals.created) }})
      </span>
      <span class="inline-flex items-center gap-2">
        <span class="h-0.5 w-5 rounded bg-[var(--chart-3)]" aria-hidden="true" />
        حل‌شده ({{ formatNumber(totals.resolved) }})
      </span>
    </div>

    <table class="sr-only">
      <caption>داده روزانه روند تیکت‌ها</caption>
      <thead>
        <tr><th scope="col">تاریخ</th><th scope="col">ثبت‌شده</th><th scope="col">حل‌شده</th></tr>
      </thead>
      <tbody>
        <tr v-for="point in data" :key="point.date">
          <th scope="row">{{ formatShortDate(point.date) }}</th>
          <td>{{ point.created }}</td>
          <td>{{ point.resolved }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>
