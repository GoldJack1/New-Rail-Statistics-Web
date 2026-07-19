'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  STATION_USAGE_OVERLAY_ANCHOR_ATTR,
  type ChartExportFormat,
  type ChartExportTheme,
} from '../../../utils/exportChartImage'
import '../../cards/NetworkStationTabGroup/NetworkStationTabGroup.css'
import './StationUsageAreaChart.css'

const MIN_POINTS = 2
const TOOLTIP_GAP = 12
const Y_AXIS_WIDTH = 48
const SCROLL_YEAR_WIDTH = 72
const COARSE_POINTER_MEDIA = '(pointer: coarse)'
/** Desktop starts at 1024px — matches site tablet/mobile breakpoint (max-width: 1023px). */
const DESKTOP_CHART_MEDIA = '(min-width: 1024px)'

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

function dualOverlayValue(point: DualChartSeriesPoint): number | null {
  if (point.primary != null && Number.isFinite(point.primary)) return point.primary
  if (point.secondary != null && Number.isFinite(point.secondary)) return point.secondary
  return null
}

/** Theme-aware colours — resolve against CSS variables so dark mode works. */
const CHART_LINE = 'var(--text-primary)'
const CHART_MUTED = 'var(--text-secondary)'
const CHART_CURSOR = 'color-mix(in srgb, var(--text-primary) 35%, transparent)'
const CHART_GRID = 'color-mix(in srgb, var(--text-primary) 12%, transparent)'
const CHART_BASELINE = 'color-mix(in srgb, var(--text-primary) 45%, transparent)'
const CHART_DOT_FILL = 'var(--bg-primary)'
const CHART_BAR_FILL = 'color-mix(in srgb, var(--text-primary) 72%, transparent)'
const CHART_OVERLAY_LINE = 'color-mix(in srgb, var(--text-primary) 35%, transparent)'
const CHART_SERIES_SECONDARY = 'var(--accent-base)'
const CHART_SERIES_SECONDARY_BAR = 'color-mix(in srgb, var(--accent-base) 72%, transparent)'
const OVERLAY_NONE = ''
const OVERLAY_NONE_LABEL = 'None'

type ActiveTooltip = {
  year: string
  value: number
  primaryValue?: number | null
  secondaryValue?: number | null
  x: number
  y: number
}

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
}) {
  const x = typeof props.x === 'number' ? props.x : Number(props.x)
  const y = typeof props.y === 'number' ? props.y : Number(props.y)
  const value = props.payload?.value
  if (!Number.isFinite(x) || !Number.isFinite(y) || value == null) {
    return null
  }
  return (
    <text x={x - 8} y={y} dy={3} textAnchor="end" fill={CHART_MUTED} fontSize={12}>
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
  const plotRef = useRef<HTMLDivElement>(null)
  const chartModeTouchedRef = useRef(false)
  const coarsePointer = useCoarsePointer()
  const [mode, setMode] = useState<ChartMode>(getDefaultChartMode)
  const [density, setDensity] = useState<DensityMode>('compact')
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportStep, setExportStep] = useState<1 | 2>(1)
  const [exportFormat, setExportFormat] = useState<ChartExportFormat>('png')
  const [exportTheme, setExportTheme] = useState<ChartExportTheme>('light')
  const [exportBackground, setExportBackground] = useState(true)
  const [exportShowTitle, setExportShowTitle] = useState(true)
  const [overlayYear, setOverlayYear] = useState(OVERLAY_NONE)
  const [overlayAnchor, setOverlayAnchor] = useState<{ x: number; y: number } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportAgreed, setExportAgreed] = useState(false)
  const [exportCopyrightAgreed, setExportCopyrightAgreed] = useState(false)
  const [chartEpoch, setChartEpoch] = useState(0)

  const isDualSeries = (secondaryData?.length ?? 0) > 0
  const expanded = density === 'expanded'
  const yearCount = isDualSeries
    ? new Set([
        ...data.map((point) => point.year),
        ...(secondaryData ?? []).map((point) => point.year),
      ]).size
    : data.length
  const denseYears = !expanded && yearCount > 14
  const tooltipTrigger = coarsePointer ? 'click' : 'hover'
  const dotRadius = coarsePointer || expanded ? 6.5 : 4.5
  const activeDotRadius = coarsePointer || expanded ? 8.5 : 6.5
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
    top: expanded || overlayPoint ? 56 : 12,
    right: expanded || overlayPoint ? 28 : 12,
    left: expanded ? 8 : 0,
    bottom: denseYears || expanded ? 8 : 4,
  }

  const syncTooltip = ({ active, payload, label, coordinate }: TooltipContentProps) => {
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
        if (next == null) return prev == null ? prev : null
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

    const svg = plotRef.current?.querySelector('svg.recharts-surface')
    if (!(svg instanceof SVGSVGElement)) {
      setExportError('Chart is not ready to export yet.')
      return
    }

    setExporting(true)
    setExportError(null)
    clearTooltip()
    setOverlayAnchor(null)

    try {
      // Let tooltip clear from the DOM before capture.
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
      await exportChartSvgAsImage(svg, {
        format: exportFormat,
        theme: exportTheme,
        background: exportFormat === 'jpeg' ? true : exportBackground,
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
      setExporting(false)
    }
  }

  const xAxis = (
    <XAxis
      dataKey="year"
      axisLine={{ stroke: CHART_BASELINE, strokeWidth: 1 }}
      tickLine={{ stroke: CHART_BASELINE, strokeWidth: 1 }}
      tick={{
        fill: CHART_MUTED,
        fontSize: expanded ? 12 : denseYears ? 10 : 12,
      }}
      interval={0}
      angle={expanded ? -40 : denseYears ? -45 : 0}
      textAnchor={expanded || denseYears ? 'end' : 'middle'}
      height={expanded || denseYears ? 58 : 28}
      dy={expanded || denseYears ? 4 : 6}
      minTickGap={0}
      padding={{ left: expanded ? 8 : 0, right: expanded ? 20 : 16 }}
    />
  )

  const yAxis = (
    <YAxis
      axisLine={false}
      tickLine={false}
      width={Y_AXIS_WIDTH}
      tickMargin={0}
      tick={(props) => <YAxisTick {...props} mode={mode} />}
      tickCount={8}
      domain={
        isYoy
          ? ([dataMin, dataMax]: readonly [number, number]) => {
              const extent = Math.max(Math.abs(dataMin), Math.abs(dataMax), 5)
              return [-extent * 1.15, extent * 1.15]
            }
          : [0, padPassengerYDomainMax]
      }
      allowDecimals
    />
  )

  const grid = <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="3 4" />

  const tooltip = (
    <Tooltip
      trigger={tooltipTrigger}
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

  const chartInteractionProps = {
    // Keep tap tooltips sticky on touch; only clear on leave for hover desktop.
    onMouseLeave: tooltipTrigger === 'hover' ? clearTooltip : undefined,
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
            radius={[3, 3, 0, 0]}
            maxBarSize={dualBarMaxSize}
            isAnimationActive={false}
          />
          <Bar
            dataKey="secondary"
            name={secondarySeriesLabel}
            fill={CHART_SERIES_SECONDARY_BAR}
            radius={[3, 3, 0, 0]}
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
            radius={[3, 3, 0, 0]}
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
          radius={[3, 3, 0, 0]}
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
          radius={[3, 3, 0, 0]}
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

  const plotWidth = expanded
    ? Math.max(yearCount * SCROLL_YEAR_WIDTH + Y_AXIS_WIDTH + 40, 480)
    : undefined

  return (
    <div
      className={[
        'station-usage-area-chart',
        expanded ? 'station-usage-area-chart--expanded' : '',
        coarsePointer ? 'station-usage-area-chart--touch' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="station-usage-area-chart__header">
        {title ? <div className="station-usage-area-chart__title">{title}</div> : null}
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
      <div className="station-usage-area-chart__plot">
        <div className="station-usage-area-chart__scroll">
          <div
            ref={plotRef}
            className="station-usage-area-chart__plot-inner"
            style={plotWidth ? { width: plotWidth } : undefined}
          >
            <ResponsiveContainer key={chartEpoch} width="100%" height="100%">
              {chart}
            </ResponsiveContainer>
            {pinnedTooltip ? (
              <div
                className="station-usage-area-chart__tooltip"
                style={{
                  left: pinnedTooltip.x,
                  top: pinnedTooltip.y - TOOLTIP_GAP,
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
        </div>
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
        <div className="station-usage-area-chart__footer-end">
          <p className="station-usage-area-chart__scroll-hint">
            {coarsePointer
              ? 'Tap a point for details. In Expand, swipe sideways to explore years.'
              : 'Scroll or swipe sideways to explore years'}
          </p>
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
                      Step {exportStep} of 2 · {exportStep === 1 ? 'Options' : 'Agreement'}
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
