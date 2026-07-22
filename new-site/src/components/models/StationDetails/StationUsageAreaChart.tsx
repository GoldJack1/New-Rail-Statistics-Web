'use client'

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line as RechartsLine,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { DownloadSimple, X } from '@phosphor-icons/react'
import { BUTCircleButton, BUTOperatorChip, BUTTabButton, BUTWideButton } from '../../buttons'
import type { YearlyPassengerChartPoint } from '../../../utils/yearlyPassengers'
import { formatPassengerAxisTick } from '../../../utils/yearlyPassengers'
import {
  exportChartSvgAsImage,
  formatRailStatisticsCopyright,
  formatStationUsageChartAttribution,
  formatStationUsageChartTitle,
  formatStationUsageExportFileName,
  getExportCapturePlotSize,
  STATION_USAGE_OVERLAY_ANCHOR_ATTR,
  type ChartExportFormat,
  type ChartExportTheme,
} from '../../../utils/exportChartImage'
import '../../cards/NetworkStationTabGroup/NetworkStationTabGroup.css'
import './StationUsageAreaChart.css'

const MIN_POINTS = 2
const TOOLTIP_GAP = 12
/** Keep the floating hover callout inside the plot (first/last years). */
const TOOLTIP_EDGE_PAD = 8
const Y_AXIS_WIDTH = 48
const SCROLL_YEAR_WIDTH = 72
const COARSE_POINTER_MEDIA = '(pointer: coarse)'
/** Desktop starts at 1024px — matches site tablet/mobile breakpoint (max-width: 1023px). */
const DESKTOP_CHART_MEDIA = '(min-width: 1024px)'
const NARROW_CHART_MEDIA = '(max-width: 1023px)'

type ChartMode = 'line' | 'bars' | 'combined' | 'yoy' | 'yoyValue'
type DensityMode = 'compact' | 'expanded'

type ChartSeriesPoint = {
  year: string
  value: number
}

type DualChartSeriesPoint = {
  year: string
  primary: number | null
  secondary: number | null
}

const CHART_MODE_OPTIONS: Array<{ id: ChartMode; label: string }> = [
  { id: 'line', label: 'Line' },
  { id: 'bars', label: 'Bars' },
  { id: 'combined', label: 'Combined' },
  { id: 'yoyValue', label: 'YoY' },
  { id: 'yoy', label: 'YoY %' },
]

const EXPORT_STEP_LABELS: Record<1 | 2, string> = {
  1: 'Options',
  2: 'Agreement',
}

function getDefaultChartMode(): ChartMode {
  if (typeof window === 'undefined') return 'line'
  return window.matchMedia(DESKTOP_CHART_MEDIA).matches ? 'line' : 'bars'
}

/** Leave one extra Y-axis step of headroom above the highest value. */
function padPassengerYDomainMax(dataMax: number): number {
  if (!Number.isFinite(dataMax) || dataMax <= 0) return 1
  return dataMax + dataMax / 4
}

function isYoyMode(mode: ChartMode): boolean {
  return mode === 'yoy' || mode === 'yoyValue'
}

function buildChartSeries(
  data: YearlyPassengerChartPoint[],
  mode: ChartMode
): ChartSeriesPoint[] {
  if (data.length === 0) return []

  if (isYoyMode(mode)) {
    const points: ChartSeriesPoint[] = []
    for (let i = 1; i < data.length; i += 1) {
      const prev = data[i - 1].value
      const current = data[i].value
      const change =
        mode === 'yoy' ? (prev === 0 ? 0 : ((current - prev) / prev) * 100) : current - prev
      points.push({ year: data[i].year, value: change })
    }
    return points
  }

  return data.map((point) => ({ year: point.year, value: point.value }))
}

function buildDualChartSeries(
  primary: YearlyPassengerChartPoint[],
  secondary: YearlyPassengerChartPoint[],
  mode: ChartMode
): DualChartSeriesPoint[] {
  const primarySeries = buildChartSeries(primary, mode)
  const secondarySeries = buildChartSeries(secondary, mode)
  const years = new Set<string>()
  for (const point of primarySeries) years.add(point.year)
  for (const point of secondarySeries) years.add(point.year)
  const primaryByYear = new Map(primarySeries.map((point) => [point.year, point.value]))
  const secondaryByYear = new Map(secondarySeries.map((point) => [point.year, point.value]))
  return [...years]
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .map((year) => ({
      year,
      primary: primaryByYear.get(year) ?? null,
      secondary: secondaryByYear.get(year) ?? null,
    }))
}

function formatChartValue(value: number, mode: ChartMode): string {
  if (mode === 'yoy') {
    const rounded = Math.round(value * 10) / 10
    return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString()}%`
  }
  if (mode === 'yoyValue') {
    const rounded = Math.round(value)
    return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString()}`
  }
  return Math.round(value).toLocaleString()
}

function formatChartAxisTick(value: number, mode: ChartMode): string {
  if (mode === 'yoy') {
    const rounded = Math.round(value)
    return `${rounded > 0 ? '+' : ''}${rounded}%`
  }
  if (mode === 'yoyValue') {
    const tick = formatPassengerAxisTick(value)
    return value > 0 ? `+${tick}` : tick
  }
  return formatPassengerAxisTick(value)
}

function usesLineCursor(mode: ChartMode): boolean {
  return mode === 'line'
}

type ActiveTooltip = {
  year: string
  value: number
  primaryValue?: number | null
  secondaryValue?: number | null
  x: number
  y: number
}

function dualOverlayValue(point: DualChartSeriesPoint): number | null {
  if (point.primary != null && Number.isFinite(point.primary)) return point.primary
  if (point.secondary != null && Number.isFinite(point.secondary)) return point.secondary
  return null
}

/** Map a local X position on the plot to the nearest year callout (mobile tap/drag). */
function resolveTouchTooltip(args: {
  localX: number
  plotWidth: number
  plotHeight: number
  margin: { top: number; right: number; left: number; bottom: number }
  yAxisWidth: number
  xAxisHeight: number
  series: ChartSeriesPoint[] | DualChartSeriesPoint[]
  isDual: boolean
  mode: ChartMode
}): ActiveTooltip | null {
  const { localX, plotWidth, plotHeight, margin, yAxisWidth, xAxisHeight, series, isDual, mode } =
    args
  const n = series.length
  if (n === 0) return null

  const left = margin.left + yAxisWidth
  const right = plotWidth - margin.right
  const innerW = right - left
  if (innerW <= 0) return null

  const t = Math.min(1, Math.max(0, (localX - left) / innerW))
  const index =
    mode === 'line' && n > 1
      ? Math.min(n - 1, Math.max(0, Math.round(t * (n - 1))))
      : Math.min(n - 1, Math.max(0, Math.floor(t * n - 1e-6)))

  const point = series[index]
  const x =
    mode === 'line' && n > 1
      ? left + (index / (n - 1)) * innerW
      : left + ((index + 0.5) / n) * innerW

  let value: number
  let primaryValue: number | null = null
  let secondaryValue: number | null = null

  if (isDual) {
    const dual = point as DualChartSeriesPoint
    primaryValue = dual.primary
    secondaryValue = dual.secondary
    const overlay = dualOverlayValue(dual)
    if (overlay == null) return null
    value = overlay
  } else {
    value = (point as ChartSeriesPoint).value
  }

  let yMin = 0
  let yMax = 1
  if (isYoyMode(mode)) {
    const values = isDual
      ? (series as DualChartSeriesPoint[]).flatMap((entry) => [entry.primary, entry.secondary])
      : (series as ChartSeriesPoint[]).map((entry) => entry.value)
    const finite = values.filter((entry): entry is number => entry != null && Number.isFinite(entry))
    const extent = Math.max(...finite.map(Math.abs), 5)
    yMin = -extent * 1.15
    yMax = extent * 1.15
  } else {
    const values = isDual
      ? (series as DualChartSeriesPoint[]).flatMap((entry) => [entry.primary, entry.secondary])
      : (series as ChartSeriesPoint[]).map((entry) => entry.value)
    const finite = values.filter((entry): entry is number => entry != null && Number.isFinite(entry))
    yMax = padPassengerYDomainMax(Math.max(0, ...finite))
  }

  const top = margin.top
  const bottom = plotHeight - margin.bottom - xAxisHeight
  const plotH = Math.max(1, bottom - top)
  const y = bottom - ((value - yMin) / (yMax - yMin)) * plotH

  return {
    year: point.year,
    value,
    primaryValue,
    secondaryValue,
    x,
    y,
  }
}


/** Theme-aware colours — resolve against CSS variables so dark mode works.
 * Primary series uses full-opacity `--text-primary` (black in light / 100% white in dark).
 */
const CHART_LINE = 'var(--text-primary)'
const CHART_MUTED = 'var(--text-secondary)'
const CHART_CURSOR = 'color-mix(in srgb, var(--text-primary) 35%, transparent)'
const CHART_GRID = 'color-mix(in srgb, var(--text-primary) 12%, transparent)'
const CHART_BASELINE = 'color-mix(in srgb, var(--text-primary) 45%, transparent)'
const CHART_DOT_FILL = 'var(--bg-primary)'
const CHART_BAR_FILL = 'var(--text-primary)'
const CHART_OVERLAY_LINE = 'color-mix(in srgb, var(--text-primary) 35%, transparent)'
const CHART_SERIES_SECONDARY = 'var(--accent-base)'
const CHART_SERIES_SECONDARY_BAR = 'color-mix(in srgb, var(--accent-base) 72%, transparent)'
const OVERLAY_NONE = ''
const OVERLAY_NONE_LABEL = 'None'

export type StationUsageAreaChartProps = {
  data: YearlyPassengerChartPoint[]
  /** Optional second series (e.g. interchanges) plotted alongside `data` in a different colour. */
  secondaryData?: YearlyPassengerChartPoint[] | null
  primarySeriesLabel?: string
  secondarySeriesLabel?: string
  stationName?: string
  title?: string
  className?: string
}

function YAxisTick(props: {
  x?: string | number
  y?: string | number
  payload?: { value?: number | string }
  mode: ChartMode
  fontSize?: number
}) {
  const x = typeof props.x === 'number' ? props.x : Number(props.x)
  const y = typeof props.y === 'number' ? props.y : Number(props.y)
  const value = props.payload?.value
  if (!Number.isFinite(x) || !Number.isFinite(y) || value == null) {
    return null
  }
  return (
    <text
      x={x - 8}
      y={y}
      dy={3}
      textAnchor="end"
      fill={CHART_MUTED}
      fontSize={props.fontSize ?? 12}
    >
      {formatChartAxisTick(Number(value), props.mode)}
    </text>
  )
}

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(COARSE_POINTER_MEDIA)
    const sync = () => setCoarse(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return coarse
}

function useNarrowChartViewport(): boolean {
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(NARROW_CHART_MEDIA)
    const sync = () => setNarrow(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return narrow
}

export function StationUsageAreaChart({
  data,
  secondaryData = null,
  primarySeriesLabel = 'Entries & exits',
  secondarySeriesLabel = 'Interchanges',
  stationName = 'Station',
  title,
  className,
}: StationUsageAreaChartProps) {
  const gradientId = useId().replace(/:/g, '')
  const secondaryGradientId = `${gradientId}-secondary`
  const plotShellRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const chartModeTouchedRef = useRef(false)
  const coarsePointer = useCoarsePointer()
  const narrowViewport = useNarrowChartViewport()
  const [mode, setMode] = useState<ChartMode>(getDefaultChartMode)
  const [density, setDensity] = useState<DensityMode>('compact')
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null)
  const [tooltipShiftX, setTooltipShiftX] = useState(0)
  const [tooltipPlaceBelow, setTooltipPlaceBelow] = useState(false)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportStep, setExportStep] = useState<1 | 2>(1)
  const [exportFormat, setExportFormat] = useState<ChartExportFormat>('png')
  const [exportTheme, setExportTheme] = useState<ChartExportTheme>('light')
  const [exportBackground, setExportBackground] = useState(true)
  const [exportShowTitle, setExportShowTitle] = useState(true)
  const [exportCaptureSize, setExportCaptureSize] = useState<{
    width: number
    height: number
  } | null>(null)
  const [overlayYear, setOverlayYear] = useState(OVERLAY_NONE)
  const [overlayAnchor, setOverlayAnchor] = useState<{ x: number; y: number } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportAgreed, setExportAgreed] = useState(false)
  const [exportCopyrightAgreed, setExportCopyrightAgreed] = useState(false)
  const [chartEpoch, setChartEpoch] = useState(0)
  const touchGestureRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    mode: 'pending' | 'scrub' | 'scroll'
  } | null>(null)

  const isDualSeries = (secondaryData?.length ?? 0) > 0
  const expanded = density === 'expanded'
  /** Expand scrolls years; keep a fixed Y-axis rail outside the scroller (not during export capture). */
  const pinYAxis = expanded && exportCaptureSize == null
  const yearCount = isDualSeries
    ? new Set([
        ...data.map((point) => point.year),
        ...(secondaryData ?? []).map((point) => point.year),
      ]).size
    : data.length
  /** Crowded year labels — independent of compact/expand so axis height stays stable. */
  const denseYears = yearCount > 14
  /** Tilted labels use a fixed axis band in both density modes. */
  const tiltedXAxis = denseYears || expanded || narrowViewport
  // Recharts hover still drives the axis cursor on touch; callout position comes from scrub.
  const tooltipTrigger = 'hover'
  const dotRadius = coarsePointer || expanded ? 6.5 : 4.5
  const activeDotRadius = coarsePointer || expanded ? 8.5 : 6.5
  const xAxisHeight = tiltedXAxis ? 52 : 28
  const yAxisWidthForScrub = pinYAxis ? 0 : Y_AXIS_WIDTH
  const firstYear = isDualSeries
    ? [...data, ...(secondaryData ?? [])].map((point) => point.year).sort()[0] ?? ''
    : data[0]?.year ?? ''
  const lastYear = isDualSeries
    ? [...data, ...(secondaryData ?? [])].map((point) => point.year).sort().at(-1) ?? ''
    : data[data.length - 1]?.year ?? ''
  const brandingTitle = formatStationUsageChartTitle(stationName, firstYear, lastYear)
  const brandingAttribution = formatStationUsageChartAttribution()
  const brandingCopyright = formatRailStatisticsCopyright()
  const chartSeries = isDualSeries
    ? buildDualChartSeries(data, secondaryData ?? [], mode)
    : buildChartSeries(data, mode)
  const overlayPoint = overlayYear
    ? isDualSeries
      ? (() => {
          const point = (chartSeries as DualChartSeriesPoint[]).find(
            (entry) => entry.year === overlayYear
          )
          if (!point) return null
          const value = dualOverlayValue(point)
          return value == null ? null : { year: point.year, value }
        })()
      : (chartSeries as ChartSeriesPoint[]).find((point) => point.year === overlayYear) ?? null
    : null
  const overlayYearOptions = isDualSeries
    ? (chartSeries as DualChartSeriesPoint[]).map((point) => point.year)
    : data.map((point) => point.year)
  const isYoy = isYoyMode(mode)

  useEffect(() => {
    if (!overlayYear) setOverlayAnchor(null)
  }, [overlayYear])

  useEffect(() => {
    // Modal open/close (and body scroll-lock) can shift chart layout; drop stale HTML callout
    // until ReferenceDot re-anchors to the new coordinates.
    setOverlayAnchor(null)
    setActiveTooltip(null)
  }, [exportOpen])

  useEffect(() => {
    const plot = plotRef.current
    if (!plot || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      setOverlayAnchor(null)
    })
    observer.observe(plot)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_CHART_MEDIA)
    const syncDefaultMode = () => {
      if (chartModeTouchedRef.current) return
      setMode(media.matches ? 'line' : 'bars')
    }
    syncDefaultMode()
    media.addEventListener('change', syncDefaultMode)
    return () => media.removeEventListener('change', syncDefaultMode)
  }, [])

  useEffect(() => {
    if (!exportOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExportOpen(false)
        setExportStep(1)
        setExportAgreed(false)
        setExportCopyrightAgreed(false)
        setExportError(null)
        setActiveTooltip(null)
        setOverlayAnchor(null)
        setOverlayYear(OVERLAY_NONE)
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [exportOpen])

  if (data.length < MIN_POINTS && (secondaryData?.length ?? 0) < MIN_POINTS) return null

  const chartMargin = {
    top: overlayPoint ? 56 : 12,
    right: expanded || overlayPoint ? 28 : 12,
    left: pinYAxis || expanded ? 8 : 0,
    bottom: tiltedXAxis ? 8 : 4,
  }

  const syncTooltip = ({ active, payload, label, coordinate }: TooltipContentProps) => {
    // On touch, pointer scrub sets the callout from the data point. Recharts' shared
    // hover uses the finger Y, which fights that anchor when dragging mid/lower chart.
    if (coarsePointer) return null

    const primaryRaw = payload?.find((entry) => entry.dataKey === 'primary')?.value
    const secondaryRaw = payload?.find((entry) => entry.dataKey === 'secondary')?.value
    const singleRaw =
      payload?.find((entry) => entry.dataKey === 'value')?.value ?? payload?.[0]?.value
    const primaryValue = typeof primaryRaw === 'number' ? primaryRaw : null
    const secondaryValue = typeof secondaryRaw === 'number' ? secondaryRaw : null
    const singleValue = typeof singleRaw === 'number' ? singleRaw : null
    const value = isDualSeries ? (primaryValue ?? secondaryValue) : singleValue
    const next: ActiveTooltip | null =
      active &&
      value != null &&
      coordinate != null &&
      typeof coordinate.x === 'number' &&
      typeof coordinate.y === 'number'
        ? {
            year: String(label ?? ''),
            value,
            primaryValue: isDualSeries ? primaryValue : null,
            secondaryValue: isDualSeries ? secondaryValue : null,
            x: coordinate.x,
            y: coordinate.y,
          }
        : null

    queueMicrotask(() => {
      setActiveTooltip((prev) => {
        if (next == null) {
          return prev == null ? prev : null
        }
        if (
          prev &&
          prev.x === next.x &&
          prev.y === next.y &&
          prev.year === next.year &&
          prev.value === next.value &&
          prev.primaryValue === next.primaryValue &&
          prev.secondaryValue === next.secondaryValue
        ) {
          return prev
        }
        return next
      })
    })
    return null
  }

  const clearTooltip = () => setActiveTooltip(null)

  const clearChartInteraction = () => {
    setActiveTooltip(null)
    setOverlayAnchor(null)
    setOverlayYear(OVERLAY_NONE)
    setChartEpoch((epoch) => epoch + 1)
  }

  const selectMode = (next: ChartMode) => {
    chartModeTouchedRef.current = true
    setMode(next)
    clearTooltip()
  }

  const selectDensity = (next: DensityMode) => {
    setDensity(next)
    clearTooltip()
  }

  const closeExport = () => {
    setExportOpen(false)
    setExportStep(1)
    setExportAgreed(false)
    setExportCopyrightAgreed(false)
    setExportError(null)
    clearChartInteraction()
  }

  const handleExport = async () => {
    if (!exportAgreed || !exportCopyrightAgreed) {
      setExportError('Please confirm both notices before downloading.')
      return
    }

    setExporting(true)
    setExportError(null)
    clearTooltip()
    setOverlayAnchor(null)

    const captureSize = getExportCapturePlotSize('16:9', 'landscape')
    flushSync(() => {
      setExportCaptureSize(captureSize)
      setChartEpoch((epoch) => epoch + 1)
    })

    try {
      // Wait for Recharts to layout at the capture size, then grab the SVG.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })
      await new Promise((resolve) => window.setTimeout(resolve, 100))

      const svg = plotRef.current?.querySelector('svg.recharts-surface')
      if (!(svg instanceof SVGSVGElement)) {
        setExportError('Chart is not ready to export yet.')
        return
      }

      await exportChartSvgAsImage(svg, {
        format: exportFormat,
        theme: exportTheme,
        background: exportFormat === 'jpeg' ? true : exportBackground,
        aspectRatio: '16:9',
        orientation: 'landscape',
        branding: {
          title: exportShowTitle ? brandingTitle : '',
          attribution: brandingAttribution,
          copyright: brandingCopyright,
        },
        overlayCallout: overlayPoint
          ? {
              year: overlayPoint.year,
              value: overlayPoint.value,
              valueLabel: formatChartValue(overlayPoint.value, mode),
            }
          : undefined,
        fileName: formatStationUsageExportFileName(stationName, exportFormat),
      })
      closeExport()
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed.')
    } finally {
      setExportCaptureSize(null)
      setExporting(false)
    }
  }

  const isExportCapture = Boolean(exportCaptureSize)
  const exportAxisFontSize = 15
  const exportYAxisWidth = 58
  const xAxis = (
    <XAxis
      dataKey="year"
      axisLine={{ stroke: CHART_BASELINE, strokeWidth: 1 }}
      tickLine={{ stroke: CHART_BASELINE, strokeWidth: 1 }}
      tick={{
        fill: CHART_MUTED,
        fontSize: isExportCapture
          ? exportAxisFontSize
          : tiltedXAxis
            ? expanded
              ? 12
              : 10
            : 12,
      }}
      interval={isExportCapture ? 0 : narrowViewport && !expanded ? 1 : 0}
      angle={isExportCapture ? -32 : tiltedXAxis ? (expanded ? -40 : -45) : 0}
      textAnchor={isExportCapture || tiltedXAxis ? 'end' : 'middle'}
      height={isExportCapture ? 64 : tiltedXAxis ? 52 : 28}
      dy={isExportCapture || tiltedXAxis ? 2 : 6}
      minTickGap={0}
      padding={{ left: expanded || isExportCapture ? 8 : 0, right: expanded || isExportCapture ? 20 : 16 }}
    />
  )

  const yAxisDomain = isYoy
    ? ([dataMin, dataMax]: readonly [number, number]): [number, number] => {
        const extent = Math.max(Math.abs(dataMin), Math.abs(dataMax), 5)
        return [-extent * 1.15, extent * 1.15]
      }
    : ([0, padPassengerYDomainMax] as [number, (dataMax: number) => number])

  const yAxisTick = (props: {
    x?: string | number
    y?: string | number
    payload?: { value?: number | string }
  }) => (
    <YAxisTick
      {...props}
      mode={mode}
      fontSize={isExportCapture ? exportAxisFontSize : 12}
    />
  )

  const yAxis = (
    <YAxis
      hide={pinYAxis}
      axisLine={false}
      tickLine={false}
      width={pinYAxis ? 0 : isExportCapture ? exportYAxisWidth : Y_AXIS_WIDTH}
      tickMargin={0}
      tick={pinYAxis ? false : yAxisTick}
      tickCount={8}
      domain={yAxisDomain}
      allowDecimals
    />
  )

  const stickyYAxis = (
    <YAxis
      axisLine={false}
      tickLine={false}
      width={Y_AXIS_WIDTH}
      tickMargin={0}
      tick={yAxisTick}
      tickCount={8}
      domain={yAxisDomain}
      allowDecimals
    />
  )

  const grid = <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 4" />

  const tooltip = (
    <Tooltip
      trigger={tooltipTrigger}
      shared
      content={syncTooltip}
      wrapperStyle={{ outline: 'none' }}
      cursor={
        overlayPoint != null
          ? false
          : usesLineCursor(mode)
            ? {
                stroke: CHART_CURSOR,
                strokeWidth: coarsePointer ? 2 : 1.5,
                strokeDasharray: '4 4',
              }
            : {
                fill: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
              }
      }
    />
  )

  const applyTouchScrub = (clientX: number) => {
    const plot = plotRef.current
    if (!plot) return
    const rect = plot.getBoundingClientRect()
    const next = resolveTouchTooltip({
      localX: clientX - rect.left,
      plotWidth: rect.width,
      plotHeight: rect.height,
      margin: chartMargin,
      yAxisWidth: yAxisWidthForScrub,
      xAxisHeight: isExportCapture ? 64 : xAxisHeight,
      series: chartSeries,
      isDual: isDualSeries,
      mode,
    })
    if (!next) return
    setActiveTooltip((prev) => {
      if (
        prev &&
        prev.year === next.year &&
        prev.value === next.value &&
        prev.x === next.x &&
        prev.y === next.y &&
        prev.primaryValue === next.primaryValue &&
        prev.secondaryValue === next.secondaryValue
      ) {
        return prev
      }
      return next
    })
  }

  const onPlotPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!coarsePointer || exportCaptureSize) return
    if (event.pointerType === 'mouse') return
    touchGestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      mode: expanded ? 'pending' : 'scrub',
    }
    if (!expanded) {
      event.currentTarget.setPointerCapture(event.pointerId)
      applyTouchScrub(event.clientX)
    }
  }

  const onPlotPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = touchGestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    if (gesture.mode === 'pending') {
      const dx = event.clientX - gesture.startX
      const dy = event.clientY - gesture.startY
      if (Math.hypot(dx, dy) < 8) return
      // Expand: horizontal pans scroll years; vertical / short taps scrub.
      if (Math.abs(dx) > Math.abs(dy)) {
        gesture.mode = 'scroll'
        return
      }
      gesture.mode = 'scrub'
      event.currentTarget.setPointerCapture(event.pointerId)
      applyTouchScrub(event.clientX)
      return
    }

    if (gesture.mode === 'scrub') {
      applyTouchScrub(event.clientX)
    }
  }

  const onPlotPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = touchGestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (gesture.mode === 'pending' || gesture.mode === 'scrub') {
      applyTouchScrub(event.clientX)
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    touchGestureRef.current = null
  }

  const chartInteractionProps = {
    // Desktop hover clears on leave; touch keeps the last year sticky.
    onMouseLeave: coarsePointer ? undefined : clearTooltip,
  }

  const lineStrokeWidth = expanded || coarsePointer ? 2.5 : 2
  const sharedDots = {
    r: dotRadius,
    fill: CHART_DOT_FILL,
    stroke: CHART_LINE,
    strokeWidth: 2,
  }
  const sharedActiveDot = {
    r: activeDotRadius,
    stroke: CHART_LINE,
    strokeWidth: 2.5,
    fill: CHART_DOT_FILL,
  }
  const secondaryDots = {
    r: dotRadius,
    fill: CHART_DOT_FILL,
    stroke: CHART_SERIES_SECONDARY,
    strokeWidth: 2,
  }
  const secondaryActiveDot = {
    r: activeDotRadius,
    stroke: CHART_SERIES_SECONDARY,
    strokeWidth: 2.5,
    fill: CHART_DOT_FILL,
  }

  const yearOverlay =
    overlayPoint != null ? (
      <>
        <ReferenceLine
          x={overlayPoint.year}
          stroke={CHART_OVERLAY_LINE}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          ifOverflow="extendDomain"
        />
        <ReferenceDot
          x={overlayPoint.year}
          y={overlayPoint.value}
          r={activeDotRadius}
          shape={(props) => {
            const cx = typeof props.cx === 'number' ? props.cx : Number(props.cx)
            const cy = typeof props.cy === 'number' ? props.cy : Number(props.cy)
            if (!Number.isFinite(cx) || !Number.isFinite(cy)) return <g />
            requestAnimationFrame(() => {
              setOverlayAnchor((prev) =>
                prev?.x === cx && prev?.y === cy ? prev : { x: cx, y: cy }
              )
            })
            return (
              <circle
                cx={cx}
                cy={cy}
                r={activeDotRadius}
                fill={CHART_DOT_FILL}
                stroke={CHART_LINE}
                strokeWidth={2.5}
                {...{ [STATION_USAGE_OVERLAY_ANCHOR_ATTR]: 'true' }}
              />
            )
          }}
        />
      </>
    ) : null

  const overlayTooltip: ActiveTooltip | null =
    overlayPoint != null && overlayAnchor != null
      ? {
          year: overlayPoint.year,
          value: overlayPoint.value,
          x: overlayAnchor.x,
          y: overlayAnchor.y,
        }
      : null

  const pinnedTooltip =
    activeTooltip && (!overlayTooltip || activeTooltip.year !== overlayTooltip.year)
      ? activeTooltip
      : overlayTooltip ?? activeTooltip

  // Expand: tooltip lives on the plot shell so it can sit above the sticky Y-rail.
  const tooltipAnchorX =
    pinnedTooltip == null
      ? 0
      : pinnedTooltip.x - scrollLeft + (pinYAxis ? Y_AXIS_WIDTH : 0)

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || !pinYAxis) {
      setScrollLeft(0)
      return
    }
    const syncScroll = () => setScrollLeft(scroller.scrollLeft)
    syncScroll()
    scroller.addEventListener('scroll', syncScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', syncScroll)
  }, [pinYAxis, chartEpoch, expanded, yearCount])

  useLayoutEffect(() => {
    const tip = tooltipRef.current
    const shell = plotShellRef.current
    if (!tip || !shell || !pinnedTooltip) {
      setTooltipShiftX(0)
      setTooltipPlaceBelow(false)
      return
    }

    const tipWidth = tip.offsetWidth
    const tipHeight = tip.offsetHeight
    const shellWidthPx = shell.clientWidth
    const shellHeightPx = shell.clientHeight
    if (tipWidth <= 0 || tipHeight <= 0 || shellWidthPx <= 0 || shellHeightPx <= 0) {
      setTooltipShiftX(0)
      setTooltipPlaceBelow(false)
      return
    }

    // Default placement is centered on the anchor via translate(-50%, -100%).
    const left = tooltipAnchorX - tipWidth / 2
    const right = tooltipAnchorX + tipWidth / 2
    let shift = 0
    if (left < TOOLTIP_EDGE_PAD) shift = TOOLTIP_EDGE_PAD - left
    else if (right > shellWidthPx - TOOLTIP_EDGE_PAD) {
      shift = shellWidthPx - TOOLTIP_EDGE_PAD - right
    }

    // Prefer above the point; flip below when the callout would clip the top edge.
    const aboveTop = pinnedTooltip.y - TOOLTIP_GAP - tipHeight
    let placeBelow = aboveTop < TOOLTIP_EDGE_PAD
    if (placeBelow) {
      const belowBottom = pinnedTooltip.y + TOOLTIP_GAP + tipHeight
      // If below also overflows, keep above and let horizontal clamp handle edges.
      if (belowBottom > shellHeightPx - TOOLTIP_EDGE_PAD) placeBelow = false
    }

    setTooltipShiftX((prev) => (prev === shift ? prev : shift))
    setTooltipPlaceBelow((prev) => (prev === placeBelow ? prev : placeBelow))
  }, [
    pinnedTooltip?.year,
    pinnedTooltip?.x,
    pinnedTooltip?.y,
    pinnedTooltip?.value,
    pinnedTooltip?.primaryValue,
    pinnedTooltip?.secondaryValue,
    tooltipAnchorX,
    isDualSeries,
    mode,
    pinYAxis,
    scrollLeft,
  ])

  const areaGradient = (
    <defs>
      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CHART_LINE} stopOpacity={0.4} />
        <stop offset="55%" stopColor={CHART_LINE} stopOpacity={0.18} />
        <stop offset="100%" stopColor={CHART_LINE} stopOpacity={0.04} />
      </linearGradient>
      {isDualSeries ? (
        <linearGradient id={secondaryGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART_SERIES_SECONDARY} stopOpacity={0.35} />
          <stop offset="55%" stopColor={CHART_SERIES_SECONDARY} stopOpacity={0.14} />
          <stop offset="100%" stopColor={CHART_SERIES_SECONDARY} stopOpacity={0.03} />
        </linearGradient>
      ) : null}
    </defs>
  )

  const dualBarMaxSize = expanded || coarsePointer ? 28 : 20
  const singleBarMaxSize = expanded || coarsePointer ? 40 : 28
  const combinedBarMaxSize = expanded || coarsePointer ? 36 : 24
  /** Large enough that Recharts clamps to half bar width → semicircle tops. */
  const barTopRadius: [number, number, number, number] = [999, 999, 0, 0]

  let chart: React.ReactElement
  if (isDualSeries) {
    const dualData = chartSeries as DualChartSeriesPoint[]
    if (mode === 'bars' || isYoy) {
      chart = (
        <BarChart data={dualData} margin={chartMargin} {...chartInteractionProps}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {yearOverlay}
          <Bar
            dataKey="primary"
            name={primarySeriesLabel}
            fill={CHART_BAR_FILL}
            radius={barTopRadius}
            maxBarSize={dualBarMaxSize}
            isAnimationActive={false}
          />
          <Bar
            dataKey="secondary"
            name={secondarySeriesLabel}
            fill={CHART_SERIES_SECONDARY_BAR}
            radius={barTopRadius}
            maxBarSize={dualBarMaxSize}
            isAnimationActive={false}
          />
          {isYoy ? <ReferenceLine y={0} stroke={CHART_BASELINE} strokeWidth={1} /> : null}
        </BarChart>
      )
    } else if (mode === 'combined') {
      chart = (
        <ComposedChart data={dualData} margin={chartMargin} {...chartInteractionProps}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {yearOverlay}
          <Bar
            dataKey="primary"
            name={primarySeriesLabel}
            fill={CHART_BAR_FILL}
            radius={barTopRadius}
            maxBarSize={combinedBarMaxSize}
            isAnimationActive={false}
          />
          <RechartsLine
            type="monotone"
            dataKey="secondary"
            name={secondarySeriesLabel}
            stroke={CHART_SERIES_SECONDARY}
            strokeWidth={lineStrokeWidth}
            dot={secondaryDots}
            activeDot={secondaryActiveDot}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      )
    } else {
      chart = (
        <AreaChart data={dualData} margin={chartMargin} {...chartInteractionProps}>
          {areaGradient}
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {yearOverlay}
          <Area
            type="monotone"
            dataKey="primary"
            name={primarySeriesLabel}
            stroke={CHART_LINE}
            strokeWidth={lineStrokeWidth}
            fill={`url(#${gradientId})`}
            dot={sharedDots}
            activeDot={sharedActiveDot}
            connectNulls
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="secondary"
            name={secondarySeriesLabel}
            stroke={CHART_SERIES_SECONDARY}
            strokeWidth={lineStrokeWidth}
            fill={`url(#${secondaryGradientId})`}
            dot={secondaryDots}
            activeDot={secondaryActiveDot}
            connectNulls
            isAnimationActive={false}
          />
        </AreaChart>
      )
    }
  } else if (mode === 'bars' || isYoy) {
    const singleSeries = chartSeries as ChartSeriesPoint[]
    chart = (
      <BarChart data={singleSeries} margin={chartMargin} {...chartInteractionProps}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {yearOverlay}
        <Bar
          dataKey="value"
          fill={CHART_BAR_FILL}
          radius={barTopRadius}
          maxBarSize={singleBarMaxSize}
          isAnimationActive={false}
        />
        {isYoy ? <ReferenceLine y={0} stroke={CHART_BASELINE} strokeWidth={1} /> : null}
      </BarChart>
    )
  } else if (mode === 'combined') {
    const singleSeries = chartSeries as ChartSeriesPoint[]
    chart = (
      <ComposedChart data={singleSeries} margin={chartMargin} {...chartInteractionProps}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {yearOverlay}
        <Bar
          dataKey="value"
          fill={CHART_BAR_FILL}
          radius={barTopRadius}
          maxBarSize={combinedBarMaxSize}
          isAnimationActive={false}
        />
        <RechartsLine
          type="monotone"
          dataKey="value"
          stroke={CHART_LINE}
          strokeWidth={lineStrokeWidth}
          dot={sharedDots}
          activeDot={sharedActiveDot}
          isAnimationActive={false}
        />
      </ComposedChart>
    )
  } else {
    const singleSeries = chartSeries as ChartSeriesPoint[]
    chart = (
      <AreaChart data={singleSeries} margin={chartMargin} {...chartInteractionProps}>
        {areaGradient}
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {yearOverlay}
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART_LINE}
          strokeWidth={lineStrokeWidth}
          fill={`url(#${gradientId})`}
          dot={sharedDots}
          activeDot={sharedActiveDot}
          isAnimationActive={false}
        />
      </AreaChart>
    )
  }

  const plotWidth = exportCaptureSize
    ? exportCaptureSize.width
    : expanded
      ? Math.max(yearCount * SCROLL_YEAR_WIDTH + (pinYAxis ? 0 : Y_AXIS_WIDTH) + 40, 480)
      : undefined

  const stickyYAxisRail =
    pinYAxis ? (
      <div className="station-usage-area-chart__y-rail" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartSeries as Array<Record<string, unknown>>}
            margin={{
              top: chartMargin.top,
              right: 0,
              left: 0,
              bottom: chartMargin.bottom + xAxisHeight,
            }}
          >
            {stickyYAxis}
            {isDualSeries ? (
              <>
                <Area dataKey="primary" stroke="none" fill="none" isAnimationActive={false} />
                <Area dataKey="secondary" stroke="none" fill="none" isAnimationActive={false} />
              </>
            ) : (
              <Area dataKey="value" stroke="none" fill="none" isAnimationActive={false} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    ) : null

  return (
    <div
      className={[
        'station-usage-area-chart',
        expanded ? 'station-usage-area-chart--expanded' : '',
        coarsePointer ? 'station-usage-area-chart--touch' : '',
        exportCaptureSize ? 'station-usage-area-chart--export-capture' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        exportCaptureSize
          ? ({
              '--station-usage-plot-height': `${exportCaptureSize.height}px`,
              '--station-usage-y-axis-width': `${Y_AXIS_WIDTH}px`,
            } as React.CSSProperties)
          : ({
              '--station-usage-y-axis-width': `${Y_AXIS_WIDTH}px`,
            } as React.CSSProperties)
      }
    >
      <div className="station-usage-area-chart__header">
        {title ? <div className="station-usage-area-chart__title">{title}</div> : null}
        <div className="station-details-network-tabs-wrap">
          <div
            className="network-station-tab-group station-usage-area-chart__mode-tabs"
            role="tablist"
            aria-label="Chart type"
          >
            {CHART_MODE_OPTIONS.map((option) => (
              <BUTTabButton
                key={option.id}
                type="button"
                width="hug"
                role="tab"
                pressed={mode === option.id}
                ariaSelected={mode === option.id}
                onClick={() => selectMode(option.id)}
              >
                {option.label}
              </BUTTabButton>
            ))}
          </div>
        </div>
      </div>
      <div className="station-usage-area-chart__plot" ref={plotShellRef}>
        {stickyYAxisRail}
        <div className="station-usage-area-chart__scroll" ref={scrollRef}>
          <div
            ref={plotRef}
            className="station-usage-area-chart__plot-inner"
            onPointerDown={onPlotPointerDown}
            onPointerMove={onPlotPointerMove}
            onPointerUp={onPlotPointerUp}
            onPointerCancel={onPlotPointerUp}
            style={
              exportCaptureSize
                ? {
                    width: exportCaptureSize.width,
                    height: exportCaptureSize.height,
                    minHeight: exportCaptureSize.height,
                    maxHeight: exportCaptureSize.height,
                  }
                : plotWidth
                  ? { width: plotWidth }
                  : undefined
            }
          >
            <ResponsiveContainer key={chartEpoch} width="100%" height="100%">
              {chart}
            </ResponsiveContainer>
          </div>
        </div>
        {pinnedTooltip ? (
          <div
            ref={tooltipRef}
            className={[
              'station-usage-area-chart__tooltip',
              tooltipPlaceBelow ? 'station-usage-area-chart__tooltip--below' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: tooltipAnchorX,
              top: tooltipPlaceBelow
                ? pinnedTooltip.y + TOOLTIP_GAP
                : pinnedTooltip.y - TOOLTIP_GAP,
              ['--station-usage-tooltip-shift' as string]: `${tooltipShiftX}px`,
            }}
          >
            <div className="station-usage-area-chart__tooltip-year">{pinnedTooltip.year}</div>
            {isDualSeries &&
            pinnedTooltip.primaryValue != null &&
            pinnedTooltip.secondaryValue != null ? (
              <div className="station-usage-area-chart__tooltip-series">
                <div className="station-usage-area-chart__tooltip-row">
                  <span
                    className="station-usage-area-chart__legend-swatch"
                    style={{ backgroundColor: CHART_LINE }}
                    aria-hidden
                  />
                  <span className="station-usage-area-chart__tooltip-row-label">
                    {primarySeriesLabel}
                  </span>
                  <span className="station-usage-area-chart__tooltip-value">
                    {formatChartValue(pinnedTooltip.primaryValue, mode)}
                  </span>
                </div>
                <div className="station-usage-area-chart__tooltip-row">
                  <span
                    className="station-usage-area-chart__legend-swatch"
                    style={{ backgroundColor: CHART_SERIES_SECONDARY }}
                    aria-hidden
                  />
                  <span className="station-usage-area-chart__tooltip-row-label">
                    {secondarySeriesLabel}
                  </span>
                  <span className="station-usage-area-chart__tooltip-value">
                    {formatChartValue(pinnedTooltip.secondaryValue, mode)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="station-usage-area-chart__tooltip-value">
                {formatChartValue(
                  pinnedTooltip.primaryValue ??
                    pinnedTooltip.secondaryValue ??
                    pinnedTooltip.value,
                  mode
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
      {isDualSeries ? (
        <div className="station-usage-area-chart__legend" aria-label="Series legend">
          <span className="station-usage-area-chart__legend-item">
            <span
              className="station-usage-area-chart__legend-swatch"
              style={{ backgroundColor: CHART_LINE }}
              aria-hidden
            />
            {primarySeriesLabel}
          </span>
          <span className="station-usage-area-chart__legend-item">
            <span
              className="station-usage-area-chart__legend-swatch"
              style={{ backgroundColor: CHART_SERIES_SECONDARY }}
              aria-hidden
            />
            {secondarySeriesLabel}
          </span>
        </div>
      ) : null}
      <div className="station-usage-area-chart__footer">
        <p className="station-usage-area-chart__scroll-hint">
          {coarsePointer
            ? 'Tap or drag for details. In Expand, swipe sideways to explore years.'
            : 'Scroll or swipe sideways to explore years'}
        </p>
        <div className="station-usage-area-chart__footer-controls">
          <div
            className="network-station-tab-group station-usage-area-chart__density-tabs"
            role="tablist"
            aria-label="Chart density"
          >
            <BUTTabButton
              type="button"
              width="hug"
              role="tab"
              pressed={density === 'compact'}
              ariaSelected={density === 'compact'}
              onClick={() => selectDensity('compact')}
            >
              Compact
            </BUTTabButton>
            <BUTTabButton
              type="button"
              width="hug"
              role="tab"
              pressed={density === 'expanded'}
              ariaSelected={density === 'expanded'}
              onClick={() => selectDensity('expanded')}
            >
              Expand
            </BUTTabButton>
          </div>
          <BUTWideButton
            type="button"
            width="hug"
            pressed={exportOpen}
            onClick={() => {
              setExportOpen(true)
              setExportStep(1)
              setExportError(null)
            }}
            icon={<DownloadSimple size={16} weight="bold" aria-hidden />}
            ariaLabel="Export chart"
          >
            Export
          </BUTWideButton>
        </div>
      </div>
      {exportOpen
        ? createPortal(
            <div
              className="station-usage-area-chart__export-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="station-usage-export-title"
              onClick={(event) => {
                if (event.target === event.currentTarget) closeExport()
              }}
            >
              <div className="station-usage-area-chart__export-dialog">
                <div className="station-usage-area-chart__export-header">
                  <div className="station-usage-area-chart__export-header-text">
                    <h2 id="station-usage-export-title" className="station-usage-area-chart__export-title">
                      Export chart
                    </h2>
                    <p className="station-usage-area-chart__export-step">
                      Step {exportStep} of 2 · {EXPORT_STEP_LABELS[exportStep]}
                    </p>
                  </div>
                  <BUTCircleButton
                    type="button"
                    className="station-usage-area-chart__export-close"
                    ariaLabel="Close export"
                    onClick={closeExport}
                    colorVariant="primary"
                    icon={<X size={16} weight="bold" aria-hidden />}
                  />
                </div>

                <div className="station-usage-area-chart__export-body">
                  {exportStep === 1 ? (
                    <div className="station-usage-area-chart__export-main">
                      <section
                        className="station-usage-area-chart__export-section"
                        aria-labelledby="export-file-heading"
                      >
                        <h3 id="export-file-heading" className="station-usage-area-chart__export-section-title">
                          File
                        </h3>
                        <div className="station-usage-area-chart__export-fields">
                          <div className="station-usage-area-chart__export-field">
                            <span className="station-usage-area-chart__export-label" id="export-format-label">
                              Format
                            </span>
                            <div
                              className="station-usage-area-chart__tabs station-usage-area-chart__tabs--pair"
                              role="tablist"
                              aria-labelledby="export-format-label"
                            >
                              <BUTTabButton
                                type="button"
                                width="fill"
                                role="tab"
                                pressed={exportFormat === 'png'}
                                ariaSelected={exportFormat === 'png'}
                                onClick={() => setExportFormat('png')}
                              >
                                PNG
                              </BUTTabButton>
                              <BUTTabButton
                                type="button"
                                width="fill"
                                role="tab"
                                pressed={exportFormat === 'jpeg'}
                                ariaSelected={exportFormat === 'jpeg'}
                                onClick={() => {
                                  setExportFormat('jpeg')
                                  setExportBackground(true)
                                }}
                              >
                                JPG
                              </BUTTabButton>
                            </div>
                            {exportFormat === 'jpeg' ? (
                              <p className="station-usage-area-chart__export-note">
                                JPG always includes a solid background.
                              </p>
                            ) : null}
                          </div>
                          <div className="station-usage-area-chart__export-field">
                            <span className="station-usage-area-chart__export-label" id="export-theme-label">
                              Theme
                            </span>
                            <div
                              className="station-usage-area-chart__tabs station-usage-area-chart__tabs--pair"
                              role="tablist"
                              aria-labelledby="export-theme-label"
                            >
                              <BUTTabButton
                                type="button"
                                width="fill"
                                role="tab"
                                pressed={exportTheme === 'light'}
                                ariaSelected={exportTheme === 'light'}
                                onClick={() => setExportTheme('light')}
                              >
                                Light
                              </BUTTabButton>
                              <BUTTabButton
                                type="button"
                                width="fill"
                                role="tab"
                                pressed={exportTheme === 'dark'}
                                ariaSelected={exportTheme === 'dark'}
                                onClick={() => setExportTheme('dark')}
                              >
                                Dark
                              </BUTTabButton>
                            </div>
                          </div>
                          <div className="station-usage-area-chart__export-field">
                            <span
                              className="station-usage-area-chart__export-label"
                              id="export-background-label"
                            >
                              Background
                            </span>
                            <div
                              className="station-usage-area-chart__tabs station-usage-area-chart__tabs--pair"
                              role="tablist"
                              aria-labelledby="export-background-label"
                            >
                              <BUTTabButton
                                type="button"
                                width="fill"
                                role="tab"
                                pressed={exportBackground || exportFormat === 'jpeg'}
                                ariaSelected={exportBackground || exportFormat === 'jpeg'}
                                disabled={exportFormat === 'jpeg'}
                                onClick={() => setExportBackground(true)}
                              >
                                On
                              </BUTTabButton>
                              <BUTTabButton
                                type="button"
                                width="fill"
                                role="tab"
                                pressed={!exportBackground && exportFormat === 'png'}
                                ariaSelected={!exportBackground && exportFormat === 'png'}
                                disabled={exportFormat === 'jpeg'}
                                onClick={() => setExportBackground(false)}
                              >
                                Off
                              </BUTTabButton>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section
                        className="station-usage-area-chart__export-section"
                        aria-labelledby="export-appearance-heading"
                      >
                        <h3
                          id="export-appearance-heading"
                          className="station-usage-area-chart__export-section-title"
                        >
                          Appearance
                        </h3>
                        <div className="station-usage-area-chart__export-field">
                          <span className="station-usage-area-chart__export-label" id="export-chart-label">
                            Chart type
                          </span>
                          <div
                            className="network-station-tab-group station-usage-area-chart__export-mode-tabs"
                            role="tablist"
                            aria-labelledby="export-chart-label"
                          >
                            {CHART_MODE_OPTIONS.map((option) => (
                              <BUTTabButton
                                key={option.id}
                                type="button"
                                width="hug"
                                role="tab"
                                pressed={mode === option.id}
                                ariaSelected={mode === option.id}
                                onClick={() => selectMode(option.id)}
                              >
                                {option.label}
                              </BUTTabButton>
                            ))}
                          </div>
                        </div>
                        <div className="station-usage-area-chart__export-field station-usage-area-chart__export-field--title">
                          <span className="station-usage-area-chart__export-label" id="export-title-label">
                            Title on image
                          </span>
                          <div
                            className="station-usage-area-chart__tabs station-usage-area-chart__tabs--pair"
                            role="tablist"
                            aria-labelledby="export-title-label"
                          >
                            <BUTTabButton
                              type="button"
                              width="fill"
                              role="tab"
                              pressed={exportShowTitle}
                              ariaSelected={exportShowTitle}
                              onClick={() => setExportShowTitle(true)}
                            >
                              On
                            </BUTTabButton>
                            <BUTTabButton
                              type="button"
                              width="fill"
                              role="tab"
                              pressed={!exportShowTitle}
                              ariaSelected={!exportShowTitle}
                              onClick={() => setExportShowTitle(false)}
                            >
                              Off
                            </BUTTabButton>
                          </div>
                        </div>
                      </section>

                      <section
                        className="station-usage-area-chart__export-section"
                        aria-labelledby="station-usage-overlay-label"
                      >
                        <div className="station-usage-area-chart__export-section-head">
                          <h3
                            id="station-usage-overlay-label"
                            className="station-usage-area-chart__export-section-title"
                          >
                            Year overlay
                          </h3>
                          <p className="station-usage-area-chart__export-label-hint">
                            Optional. Only one year can be chosen.
                          </p>
                        </div>
                        <div
                          className="station-usage-area-chart__export-year-grid"
                          role="group"
                          aria-labelledby="station-usage-overlay-label"
                        >
                          <BUTOperatorChip
                            type="button"
                            instantAction
                            colorVariant="primary"
                            width="fill"
                            state={overlayYear === OVERLAY_NONE ? 'pressed' : 'active'}
                            onClick={() => {
                              setOverlayYear(OVERLAY_NONE)
                              clearTooltip()
                            }}
                            aria-label="No year overlay"
                          >
                            {OVERLAY_NONE_LABEL}
                          </BUTOperatorChip>
                          {overlayYearOptions.map((year) => (
                            <BUTOperatorChip
                              key={year}
                              type="button"
                              instantAction
                              colorVariant="primary"
                              width="fill"
                              state={overlayYear === year ? 'pressed' : 'active'}
                              onClick={() => {
                                setOverlayYear(year)
                                clearTooltip()
                              }}
                              aria-label={`Overlay year ${year}`}
                            >
                              {year}
                            </BUTOperatorChip>
                          ))}
                        </div>
                      </section>
                    </div>
                  ) : (
                    <div className="station-usage-area-chart__export-agreements">
                      <label className="station-usage-area-chart__export-agree">
                        <input
                          type="checkbox"
                          checked={exportAgreed}
                          onChange={(event) => {
                            setExportAgreed(event.target.checked)
                            if (event.target.checked) setExportError(null)
                          }}
                        />
                        <span>
                          By checking this box, I agree that the graph design and branding are © Rail
                          Statistics. The underlying figures are public sector information from the
                          Office of Rail and Road (ORR) under the Open Government Licence v3.0, and are
                          not owned by Rail Statistics or by me.
                        </span>
                      </label>
                      <label className="station-usage-area-chart__export-agree">
                        <input
                          type="checkbox"
                          checked={exportCopyrightAgreed}
                          onChange={(event) => {
                            setExportCopyrightAgreed(event.target.checked)
                            if (event.target.checked) setExportError(null)
                          }}
                        />
                        <span>{brandingCopyright}</span>
                      </label>
                      {exportError ? (
                        <p className="station-usage-area-chart__export-error" role="alert">
                          {exportError}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="station-usage-area-chart__export-footer">
                  {exportStep === 1 ? (
                    <BUTWideButton type="button" width="hug" onClick={() => setExportStep(2)}>
                      Continue
                    </BUTWideButton>
                  ) : (
                    <>
                      <BUTWideButton type="button" width="hug" onClick={() => setExportStep(1)}>
                        Back
                      </BUTWideButton>
                      <BUTWideButton
                        type="button"
                        width="hug"
                        disabled={exporting || !exportAgreed || !exportCopyrightAgreed}
                        onClick={() => {
                          void handleExport()
                        }}
                        icon={<DownloadSimple size={16} weight="bold" aria-hidden />}
                      >
                        {exporting ? 'Exporting…' : 'Download'}
                      </BUTWideButton>
                    </>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}

export default StationUsageAreaChart
