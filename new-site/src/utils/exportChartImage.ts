export type ChartExportFormat = 'png' | 'jpeg'
export type ChartExportTheme = 'light' | 'dark'
/** Outer frame ratio for the exported image (chart is letterboxed to fit). */
export type ChartExportAspectRatio = '1:1' | '4:3' | '16:9'
export type ChartExportOrientation = 'landscape' | 'portrait'

const TITLE_SIZE = 34
const TITLE_LINE = 40
const TITLE_BAND = 96
const EXPORT_MARGIN = 40
const FOOTER_PAD = 14
const FOOTER_SIZE = 15
const FOOTER_LINE = 20
const FOOTER_GAP = 8
const COPYRIGHT_SIZE = 14
const COPYRIGHT_LINE = 19
const FOOTER_RESERVE = 120
const MAX_ATTRIBUTION_LINES = 2
const MAX_COPYRIGHT_LINES = 4
const OVERLAY_CALLOUT_GAP = 14
const EXPORT_FONT_FAMILY = 'GeologicaExport'
const EXPORT_FONT_URL = '/fonts/Geologica_Cursive-Regular.ttf'

export type ChartExportOverlayCallout = {
  year: string
  value: number
  /** Pre-formatted value text (e.g. YoY %). Falls back to locale number. */
  valueLabel?: string
}

export type ChartExportBranding = {
  title: string
  copyright: string
  attribution?: string
}

export type ChartExportOptions = {
  format: ChartExportFormat
  theme: ChartExportTheme
  /** Ignored for JPEG (always drawn with a solid background). */
  background: boolean
  /** Outer canvas aspect ratio. Defaults to fitting the chart content. */
  aspectRatio?: ChartExportAspectRatio
  /** Landscape keeps the ratio; portrait flips it (16:9 → 9:16). Ignored for 1:1. */
  orientation?: ChartExportOrientation
  branding?: ChartExportBranding
  /** Optional year callout drawn above the chart point (matches on-screen tooltip). */
  overlayCallout?: ChartExportOverlayCallout
  fileName?: string
  scale?: number
}

export const CHART_EXPORT_ASPECT_RATIOS: Record<ChartExportAspectRatio, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
}

/** Width÷height for the chosen size + orientation. */
export function resolveExportAspectValue(
  aspectRatio: ChartExportAspectRatio,
  orientation: ChartExportOrientation = 'landscape'
): number {
  const base = CHART_EXPORT_ASPECT_RATIOS[aspectRatio]
  if (aspectRatio === '1:1' || orientation === 'landscape') return base
  return 1 / base
}

/** Fixed output canvas size for a size + orientation (long edge = 1920). */
export function getExportCanvasSize(
  aspectRatio: ChartExportAspectRatio,
  orientation: ChartExportOrientation = 'landscape',
  longEdge = 1920
): { width: number; height: number } {
  const ratio = resolveExportAspectValue(aspectRatio, orientation)
  if (ratio >= 1) {
    return { width: longEdge, height: Math.max(1, Math.round(longEdge / ratio)) }
  }
  return { width: Math.max(1, Math.round(longEdge * ratio)), height: longEdge }
}

/**
 * Plot size used while capturing a 16:9 landscape export.
 * Slightly smaller than the final chart slot so we can scale the whole SVG up
 * together (axes + series) to fill the frame with readable type.
 */
export function getExportCapturePlotSize(
  aspectRatio: ChartExportAspectRatio = '16:9',
  orientation: ChartExportOrientation = 'landscape'
): { width: number; height: number } {
  const canvas = getExportCanvasSize(aspectRatio, orientation)
  // Design-size capture; drawn scaled up into the 16:9 frame
  const contentW = Math.round((canvas.width - EXPORT_MARGIN * 2) * 0.92)
  const reservedY = TITLE_BAND + FOOTER_RESERVE
  const availableH = canvas.height - EXPORT_MARGIN * 2 - reservedY
  const plotH = Math.round(Math.max(520, availableH * 0.92))
  return { width: contentW, height: plotH }
}

/** Grow a content box to fill a target aspect ratio (letterbox / pillarbox). */
export function frameSizeForAspectRatio(
  contentWidth: number,
  contentHeight: number,
  aspectRatio: ChartExportAspectRatio,
  orientation: ChartExportOrientation = 'landscape'
): { width: number; height: number } {
  const target = resolveExportAspectValue(aspectRatio, orientation)
  const contentAspect = contentWidth / Math.max(1, contentHeight)
  if (contentAspect > target) {
    return {
      width: Math.max(1, Math.round(contentWidth)),
      height: Math.max(1, Math.round(contentWidth / target)),
    }
  }
  return {
    width: Math.max(1, Math.round(contentHeight * target)),
    height: Math.max(1, Math.round(contentHeight)),
  }
}

type ExportPalette = {
  line: string
  muted: string
  bg: string
  bar: string
  grid: string
  baseline: string
  dotFill: string
  accent: string
  tooltipBg: string
  tooltipBorder: string
}

/** Light = white canvas + black marks; dark = black canvas + white marks. */
const EXPORT_PALETTES: Record<ChartExportTheme, ExportPalette> = {
  light: {
    line: '#000000',
    muted: '#444444',
    bg: '#ffffff',
    bar: '#000000',
    grid: '#d0d0d0',
    baseline: '#666666',
    dotFill: '#ffffff',
    // Secondary series stays monochrome but distinct from primary
    accent: '#555555',
    tooltipBg: '#ffffff',
    tooltipBorder: '#000000',
  },
  dark: {
    line: '#ffffff',
    muted: '#c0c0c0',
    bg: '#000000',
    bar: '#ffffff',
    grid: '#333333',
    baseline: '#888888',
    dotFill: '#000000',
    accent: '#b0b0b0',
    tooltipBg: '#000000',
    tooltipBorder: '#ffffff',
  },
}

/** Marker attribute on the SVG overlay point used when painting the export callout. */
export const STATION_USAGE_OVERLAY_ANCHOR_ATTR = 'data-station-usage-overlay-anchor'

let embeddedGeologicaFontFaceCss: string | null = null
let geologicaFontReady: Promise<string> | null = null

function exportCanvasFont(weight: number | string, sizePx: number): string {
  return `${weight} ${sizePx}px ${EXPORT_FONT_FAMILY}, sans-serif`
}

function applyExportFontVariation(ctx: CanvasRenderingContext2D) {
  try {
    const withVariation = ctx as CanvasRenderingContext2D & {
      fontVariationSettings?: string
    }
    withVariation.fontVariationSettings = "'CRSV' 1, 'MONO' 0, 'slnt' 0"
  } catch {
    // Older browsers may not support canvas font-variation-settings.
  }
}

async function ensureGeologicaExportFont(): Promise<string> {
  if (typeof document === 'undefined') return EXPORT_FONT_FAMILY
  if (!geologicaFontReady) {
    geologicaFontReady = (async () => {
      const existing = [...document.fonts].some(
        (face) => face.family.replace(/['"]/g, '') === EXPORT_FONT_FAMILY
      )
      if (!existing) {
        const face = new FontFace(EXPORT_FONT_FAMILY, `url(${EXPORT_FONT_URL})`, {
          style: 'normal',
          weight: '400',
        })
        const loaded = await face.load()
        document.fonts.add(loaded)
      }
      await document.fonts.load(`400 16px ${EXPORT_FONT_FAMILY}`)
      return EXPORT_FONT_FAMILY
    })().catch(() => {
      // Fall back to whatever Geologica name next/font registered on the page.
      const fromCss = getComputedStyle(document.documentElement)
        .getPropertyValue('--ff-geologica')
        .trim()
      return fromCss || EXPORT_FONT_FAMILY
    })
  }
  return geologicaFontReady
}

async function getEmbeddedGeologicaFontFaceCss(): Promise<string> {
  if (embeddedGeologicaFontFaceCss != null) return embeddedGeologicaFontFaceCss
  try {
    const response = await fetch(EXPORT_FONT_URL)
    if (!response.ok) {
      embeddedGeologicaFontFaceCss = ''
      return ''
    }
    const buffer = await response.arrayBuffer()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error ?? new Error('Failed to encode Geologica font'))
      reader.readAsDataURL(new Blob([buffer], { type: 'font/ttf' }))
    })
    embeddedGeologicaFontFaceCss =
      `@font-face{font-family:'${EXPORT_FONT_FAMILY}';src:url(${dataUrl}) format('truetype');` +
      `font-weight:400;font-style:normal;font-display:block;}`
    return embeddedGeologicaFontFaceCss
  } catch {
    embeddedGeologicaFontFaceCss = ''
    return ''
  }
}

function applyExportFontToSvg(root: SVGSVGElement, fontFaceCss: string) {
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent =
    `${fontFaceCss}` +
    `text,tspan{font-family:'${EXPORT_FONT_FAMILY}',sans-serif;` +
    `font-variation-settings:'CRSV' 1,'MONO' 0,'slnt' 0;}`
  root.insertBefore(style, root.firstChild)
  root.setAttribute('font-family', EXPORT_FONT_FAMILY)
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawOverlayCallout(
  ctx: CanvasRenderingContext2D,
  palette: ExportPalette,
  pointX: number,
  pointY: number,
  year: string,
  value: number,
  valueLabel?: string,
  scale = 1
) {
  const s = Math.max(0.75, scale)
  const valueText = valueLabel ?? value.toLocaleString()
  const yearSize = Math.round(12 * s)
  const valueSize = Math.round(17 * s)
  applyExportFontVariation(ctx)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = exportCanvasFont(500, yearSize)
  const yearWidth = ctx.measureText(year).width
  ctx.font = exportCanvasFont(700, valueSize)
  const valueWidth = ctx.measureText(valueText).width

  const padX = 12 * s
  const padTop = 8 * s
  const padBottom = 9 * s
  const gap = 3 * s
  const boxW = Math.max(yearWidth, valueWidth, 44 * s) + padX * 2
  const boxH = padTop + yearSize + gap + valueSize + padBottom
  const boxX = pointX - boxW / 2
  const boxY = pointY - OVERLAY_CALLOUT_GAP * s - boxH

  roundRectPath(ctx, boxX, boxY, boxW, boxH, 8 * s)
  ctx.fillStyle = palette.tooltipBg
  ctx.fill()
  ctx.strokeStyle = palette.tooltipBorder
  ctx.lineWidth = Math.max(1, s)
  ctx.stroke()

  ctx.fillStyle = palette.muted
  ctx.font = exportCanvasFont(500, yearSize)
  ctx.fillText(year, pointX, boxY + padTop)

  ctx.fillStyle = palette.line
  ctx.font = exportCanvasFont(700, valueSize)
  ctx.fillText(valueText, pointX, boxY + padTop + yearSize + gap)
}

function mapExportColor(value: string, palette: ExportPalette): string {
  const v = value.trim()
  if (!v || v === 'none' || v === 'transparent') return v

  if (v.includes('color-mix') && v.includes('--text-primary')) {
    if (v.includes('12%') || v.includes('8%')) return palette.grid
    if (v.includes('45%') || v.includes('35%')) return palette.baseline
    return palette.line
  }
  if (v.includes('--accent-base') || v.includes('#b20016')) return palette.accent
  if (v.includes('--text-primary')) return palette.line
  if (v.includes('--text-secondary')) return palette.muted
  if (v.includes('--bg-primary')) return palette.dotFill
  return v
}

function rewriteSvgColors(root: Element, palette: ExportPalette) {
  const colorAttrs = ['fill', 'stroke', 'stop-color', 'color'] as const

  const visit = (el: Element) => {
    for (const attr of colorAttrs) {
      const current = el.getAttribute(attr)
      if (current) el.setAttribute(attr, mapExportColor(current, palette))
    }

    const style = el.getAttribute('style')
    if (style) {
      const next = style
        .split(';')
        .map((part) => {
          const [rawKey, ...rest] = part.split(':')
          if (!rawKey || rest.length === 0) return part
          const key = rawKey.trim()
          const val = rest.join(':').trim()
          if (['fill', 'stroke', 'stop-color', 'color'].includes(key)) {
            return `${key}: ${mapExportColor(val, palette)}`
          }
          return part
        })
        .join(';')
      el.setAttribute('style', next)
    }

    for (const child of Array.from(el.children)) visit(child)
  }

  visit(root)
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const lines: string[] = []
  let current = words[0]

  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`
    if (ctx.measureText(next).width <= maxWidth) {
      current = next
    } else {
      lines.push(current)
      current = words[i]
    }
  }
  lines.push(current)
  return lines
}

/**
 * Export a Recharts SVG as PNG or JPEG with independent light/dark styling.
 */
export async function exportChartSvgAsImage(
  sourceSvg: SVGSVGElement,
  options: ChartExportOptions
): Promise<void> {
  const { format, theme, fileName, scale = 2, branding, overlayCallout, aspectRatio, orientation } =
    options
  const background = format === 'jpeg' ? true : options.background
  const palette = EXPORT_PALETTES[theme]
  const exportOrientation = orientation ?? 'landscape'

  const rect = sourceSvg.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width || Number(sourceSvg.getAttribute('width')) || 800))
  const height = Math.max(1, Math.round(rect.height || Number(sourceSvg.getAttribute('height')) || 400))

  const clone = sourceSvg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }

  rewriteSvgColors(clone, palette)

  const [, fontFaceCss] = await Promise.all([
    ensureGeologicaExportFont(),
    getEmbeddedGeologicaFontFaceCss(),
  ])
  applyExportFontToSvg(clone, fontFaceCss)

  if (background) {
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('x', '0')
    bg.setAttribute('y', '0')
    bg.setAttribute('width', '100%')
    bg.setAttribute('height', '100%')
    bg.setAttribute('fill', palette.bg)
    clone.insertBefore(bg, clone.firstChild)
  }

  const serializer = new XMLSerializer()
  const svgText = serializer.serializeToString(clone)
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load chart SVG for export'))
      img.src = svgUrl
    })

    const titleBand = branding?.title ? TITLE_BAND : 0
    const canvas = document.createElement('canvas')
    const measureCtx = canvas.getContext('2d')
    if (!measureCtx) throw new Error('Canvas is not available for chart export')

    const frame = aspectRatio
      ? getExportCanvasSize(aspectRatio, exportOrientation)
      : null
    const contentWidth = frame ? frame.width - EXPORT_MARGIN * 2 : width
    const textWidth = Math.max(1, contentWidth)

    applyExportFontVariation(measureCtx)
    let attributionLineCount = 0
    let copyrightLineCount = 0
    if (branding?.attribution) {
      measureCtx.font = exportCanvasFont(400, FOOTER_SIZE)
      attributionLineCount = Math.min(
        wrapCanvasText(measureCtx, branding.attribution, textWidth).length,
        MAX_ATTRIBUTION_LINES
      )
    }
    if (branding?.copyright) {
      measureCtx.font = exportCanvasFont(500, COPYRIGHT_SIZE)
      copyrightLineCount = Math.min(
        wrapCanvasText(measureCtx, branding.copyright, textWidth).length,
        MAX_COPYRIGHT_LINES
      )
    }

    const hasFooter = attributionLineCount > 0 || copyrightLineCount > 0
    const footerBand = hasFooter
      ? FOOTER_PAD +
        (attributionLineCount > 0 ? attributionLineCount * FOOTER_LINE : 0) +
        (attributionLineCount > 0 && copyrightLineCount > 0 ? FOOTER_GAP : 0) +
        (copyrightLineCount > 0 ? copyrightLineCount * COPYRIGHT_LINE : 0) +
        FOOTER_PAD
      : 0

    const totalWidth = frame ? frame.width : width + EXPORT_MARGIN * 2
    const naturalContentHeight = height + titleBand + footerBand + EXPORT_MARGIN * 2
    const totalHeight = frame ? frame.height : naturalContentHeight
    const originX = EXPORT_MARGIN
    const originY = EXPORT_MARGIN
    const chartAreaWidth = totalWidth - EXPORT_MARGIN * 2
    const chartAreaHeight = Math.max(1, totalHeight - EXPORT_MARGIN * 2 - titleBand - footerBand)
    // Scale the chart to fill the frame (up or down) so type and plot stay balanced
    const fit = Math.min(chartAreaWidth / width, chartAreaHeight / height)
    const drawWidth = width * fit
    const drawHeight = height * fit
    const drawX = originX + (chartAreaWidth - drawWidth) / 2
    const drawY = originY + titleBand + (chartAreaHeight - drawHeight) / 2

    canvas.width = Math.round(totalWidth * scale)
    canvas.height = Math.round(totalHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available for chart export')

    ctx.scale(scale, scale)
    applyExportFontVariation(ctx)
    if (background || format === 'jpeg') {
      ctx.fillStyle = palette.bg
      ctx.fillRect(0, 0, totalWidth, totalHeight)
    }

    if (branding?.title) {
      ctx.fillStyle = palette.line
      ctx.font = exportCanvasFont(700, TITLE_SIZE)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      const titleLines = wrapCanvasText(ctx, branding.title, textWidth)
      titleLines.slice(0, 2).forEach((line, index) => {
        ctx.fillText(line, originX, originY + 8 + index * TITLE_LINE)
      })
    }

    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)

    if (overlayCallout) {
      const anchor = sourceSvg.querySelector(`[${STATION_USAGE_OVERLAY_ANCHOR_ATTR}]`)
      const cx = anchor ? Number(anchor.getAttribute('cx')) : NaN
      const cy = anchor ? Number(anchor.getAttribute('cy')) : NaN
      if (Number.isFinite(cx) && Number.isFinite(cy)) {
        drawOverlayCallout(
          ctx,
          palette,
          drawX + cx * fit,
          drawY + cy * fit,
          overlayCallout.year,
          overlayCallout.value,
          overlayCallout.valueLabel,
          fit
        )
      }
    }

    if (hasFooter) {
      let y = originY + titleBand + chartAreaHeight + FOOTER_PAD

      if (branding?.attribution && attributionLineCount > 0) {
        ctx.fillStyle = palette.muted
        ctx.font = exportCanvasFont(400, FOOTER_SIZE)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        const attributionLines = wrapCanvasText(ctx, branding.attribution, textWidth)
        attributionLines.slice(0, attributionLineCount).forEach((line, index) => {
          ctx.fillText(line, originX, y + index * FOOTER_LINE)
        })
        y += attributionLineCount * FOOTER_LINE + (copyrightLineCount > 0 ? FOOTER_GAP : 0)
      }

      if (branding?.copyright && copyrightLineCount > 0) {
        ctx.fillStyle = palette.muted
        ctx.font = exportCanvasFont(500, COPYRIGHT_SIZE)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        const copyrightLines = wrapCanvasText(ctx, branding.copyright, textWidth)
        copyrightLines.slice(0, copyrightLineCount).forEach((line, index) => {
          ctx.fillText(line, originX, y + index * COPYRIGHT_LINE)
        })
      }
    }

    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    const quality = format === 'jpeg' ? 0.92 : undefined
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) reject(new Error('Failed to encode chart image'))
          else resolve(result)
        },
        mime,
        quality
      )
    })

    const extension = format === 'jpeg' ? 'jpg' : 'png'
    const defaultName = `station-usage-${theme}${background ? '-bg' : '-transparent'}.${extension}`
    downloadBlob(blob, fileName ?? defaultName)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

export function formatStationUsageChartTitle(
  stationName: string,
  firstYear: string,
  lastYear: string
): string {
  const name = stationName.trim() || 'Station'
  if (firstYear && lastYear && firstYear !== lastYear) {
    return `Station Usage data for ${name} for ${firstYear} to ${lastYear}`
  }
  if (firstYear || lastYear) {
    return `Station Usage data for ${name} for ${firstYear || lastYear}`
  }
  return `Station Usage data for ${name}`
}

export function formatRailStatisticsCopyright(year = new Date().getFullYear()): string {
  return (
    `© ${year} Rail Statistics. Use of this graph is allowed anywhere provided the Office of Rail and Road (ORR) attribution and Rail Statistics copyright notice are shown. ` +
    'Any use without correct accreditation is a breach of copyright.'
  )
}

export function formatStationUsageChartAttribution(): string {
  return 'Data in this graph is supplied by the Office of Rail and Road (ORR).'
}

export function formatStationUsageExportFileName(
  stationName: string,
  format: ChartExportFormat
): string {
  const slug =
    stationName
      .trim()
      .replace(/['’]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'Station'
  const extension = format === 'jpeg' ? 'jpg' : 'png'
  return `Station-usage-graph-for-${slug}.${extension}`
}
