'use client'

import React, { useEffect, useId, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { BUTTabButton } from '../../buttons'
import type { YearlyPassengerChartPoint } from '../../../utils/yearlyPassengers'
import { formatPassengerAxisTick } from '../../../utils/yearlyPassengers'
import './StationUsageAreaChart.css'

const MIN_POINTS = 2
const TOOLTIP_GAP = 12
const Y_AXIS_WIDTH = 48
const SCROLL_YEAR_WIDTH = 72
const COARSE_POINTER_MEDIA = '(pointer: coarse)'

type ChartMode = 'line' | 'bars'
type DensityMode = 'compact' | 'expanded'

/** Leave one extra Y-axis step of headroom above the highest value. */
function padPassengerYDomainMax(dataMax: number): number {
  if (!Number.isFinite(dataMax) || dataMax <= 0) return 1
  return dataMax + dataMax / 4
}

/** Theme-aware colours — resolve against CSS variables so dark mode works. */
const CHART_LINE = 'var(--text-primary)'
const CHART_MUTED = 'var(--text-secondary)'
const CHART_CURSOR = 'color-mix(in srgb, var(--text-primary) 35%, transparent)'
const CHART_GRID = 'color-mix(in srgb, var(--text-primary) 12%, transparent)'
const CHART_BASELINE = 'color-mix(in srgb, var(--text-primary) 45%, transparent)'
const CHART_DOT_FILL = 'var(--bg-primary)'
const CHART_BAR_FILL = 'color-mix(in srgb, var(--text-primary) 72%, transparent)'

type ActiveTooltip = {
  year: string
  value: number
  x: number
  y: number
}

export type StationUsageAreaChartProps = {
  data: YearlyPassengerChartPoint[]
  title?: string
  className?: string
}

function YAxisTick(props: {
  x?: string | number
  y?: string | number
  payload?: { value?: number | string }
}) {
  const x = typeof props.x === 'number' ? props.x : Number(props.x)
  const y = typeof props.y === 'number' ? props.y : Number(props.y)
  const value = props.payload?.value
  if (!Number.isFinite(x) || !Number.isFinite(y) || value == null) {
    return null
  }
  return (
    <text x={x - 8} y={y} dy={3} textAnchor="end" fill={CHART_MUTED} fontSize={12}>
      {formatPassengerAxisTick(Number(value))}
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
  title,
  className,
}: StationUsageAreaChartProps) {
  const gradientId = useId().replace(/:/g, '')
  const coarsePointer = useCoarsePointer()
  const [mode, setMode] = useState<ChartMode>('line')
  const [density, setDensity] = useState<DensityMode>('compact')
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null)

  const expanded = density === 'expanded'
  const denseYears = !expanded && data.length > 14
  const tooltipTrigger = coarsePointer ? 'click' : 'hover'
  const dotRadius = coarsePointer || expanded ? 6.5 : 4.5
  const activeDotRadius = coarsePointer || expanded ? 8.5 : 6.5

  if (data.length < MIN_POINTS) return null

  const chartMargin = {
    top: expanded ? 20 : 12,
    right: expanded ? 28 : 12,
    left: expanded ? 8 : 0,
    bottom: denseYears || expanded ? 8 : 4,
  }

  const syncTooltip = ({ active, payload, label, coordinate }: TooltipContentProps) => {
    const value = payload?.[0]?.value
    const next: ActiveTooltip | null =
      active &&
      typeof value === 'number' &&
      coordinate != null &&
      typeof coordinate.x === 'number' &&
      typeof coordinate.y === 'number'
        ? {
            year: String(label ?? ''),
            value,
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
          prev.value === next.value
        ) {
          return prev
        }
        return next
      })
    })
    return null
  }

  const clearTooltip = () => setActiveTooltip(null)

  const selectMode = (next: ChartMode) => {
    setMode(next)
    clearTooltip()
  }

  const selectDensity = (next: DensityMode) => {
    setDensity(next)
    clearTooltip()
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
      tick={YAxisTick}
      tickCount={8}
      domain={[0, padPassengerYDomainMax]}
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
        mode === 'line'
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

  const chart =
    mode === 'line' ? (
      <AreaChart data={data} margin={chartMargin} {...chartInteractionProps}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_LINE} stopOpacity={0.4} />
            <stop offset="55%" stopColor={CHART_LINE} stopOpacity={0.18} />
            <stop offset="100%" stopColor={CHART_LINE} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART_LINE}
          strokeWidth={expanded || coarsePointer ? 2.5 : 2}
          fill={`url(#${gradientId})`}
          dot={{
            r: dotRadius,
            fill: CHART_DOT_FILL,
            stroke: CHART_LINE,
            strokeWidth: 2,
          }}
          activeDot={{
            r: activeDotRadius,
            stroke: CHART_LINE,
            strokeWidth: 2.5,
            fill: CHART_DOT_FILL,
          }}
          isAnimationActive={false}
        />
      </AreaChart>
    ) : (
      <BarChart data={data} margin={chartMargin} {...chartInteractionProps}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        <Bar
          dataKey="value"
          fill={CHART_BAR_FILL}
          radius={[3, 3, 0, 0]}
          maxBarSize={expanded || coarsePointer ? 40 : 28}
          isAnimationActive={false}
        />
      </BarChart>
    )

  const plotWidth = expanded
    ? Math.max(data.length * SCROLL_YEAR_WIDTH + Y_AXIS_WIDTH + 40, 480)
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
        <div className="station-usage-area-chart__tabs" role="tablist" aria-label="Chart type">
          <BUTTabButton
            type="button"
            width="hug"
            role="tab"
            pressed={mode === 'line'}
            ariaSelected={mode === 'line'}
            onClick={() => selectMode('line')}
          >
            Line
          </BUTTabButton>
          <BUTTabButton
            type="button"
            width="hug"
            role="tab"
            pressed={mode === 'bars'}
            ariaSelected={mode === 'bars'}
            onClick={() => selectMode('bars')}
          >
            Bars
          </BUTTabButton>
        </div>
      </div>
      <div className="station-usage-area-chart__plot">
        <div className="station-usage-area-chart__scroll">
          <div
            className="station-usage-area-chart__plot-inner"
            style={plotWidth ? { width: plotWidth } : undefined}
          >
            <ResponsiveContainer width="100%" height="100%">
              {chart}
            </ResponsiveContainer>
            {activeTooltip ? (
              <div
                className="station-usage-area-chart__tooltip"
                style={{
                  left: activeTooltip.x,
                  top: activeTooltip.y - TOOLTIP_GAP,
                }}
              >
                <div className="station-usage-area-chart__tooltip-year">{activeTooltip.year}</div>
                <div className="station-usage-area-chart__tooltip-value">
                  {activeTooltip.value.toLocaleString()}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="station-usage-area-chart__footer">
        <div className="station-usage-area-chart__tabs" role="tablist" aria-label="Chart density">
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
        <p className="station-usage-area-chart__scroll-hint">
          {coarsePointer
            ? 'Tap a point for details. In Expand, swipe sideways to explore years.'
            : 'Scroll or swipe sideways to explore years'}
        </p>
      </div>
    </div>
  )
}

export default StationUsageAreaChart
