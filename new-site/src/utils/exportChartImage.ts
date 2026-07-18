export type ChartExportFormat = 'png' | 'jpeg'
export type ChartExportTheme = 'light' | 'dark'

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
  branding?: ChartExportBranding
  /** Optional year callout drawn above the chart point (matches on-screen tooltip). */
  overlayCallout?: ChartExportOverlayCallout
  fileName?: string
  scale?: number
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

const EXPORT_PALETTES: Record<ChartExportTheme, ExportPalette> = {
  light: {
    line: '#111111',
    muted: '#666666',
    bg: '#ffffff',
    bar: '#3a3a3a',
    grid: '#d4d4d4',
    baseline: '#8a8a8a',
    dotFill: '#ffffff',
    accent: '#b20016',
    tooltipBg: '#f4f4f4',
    tooltipBorder: '#d4d4d4',
  },
  dark: {
    line: '#ffffff',
    muted: '#b0b0b0',
    bg: '#383838',
    bar: '#cfcfcf',
    grid: '#555555',
    baseline: '#8a8a8a',
    dotFill: '#383838',
    accent: '#ff8a95',
    tooltipBg: '#2c2c2c',
    tooltipBorder: '#555555',
  },
}

const TITLE_BAND = 72
const EXPORT_MARGIN = 28
const FOOTER_PAD = 10
const FOOTER_LINE = 14
const FOOTER_GAP = 6
const COPYRIGHT_LINE = 15
const MAX_ATTRIBUTION_LINES = 2
const MAX_COPYRIGHT_LINES = 4
const OVERLAY_CALLOUT_GAP = 12
const EXPORT_FONT_FAMILY = 'GeologicaExport'
const EXPORT_FONT_URL = '/fonts/Geologica_Cursive-Regular.ttf'

/** Marker attribute on the SVG overlay point used when painting the export callout. */
export const STATION_USAGE_OVERLAY_ANCHOR_ATTR = 'data-station-usage-overlay-anchor'

let embeddedGeologicaFontFaceCss: string | null = null
let geologicaFontReady: Promise<string> | null = null

function exportCanvasFont(weight: number | string, sizePx: number): string {
  return `${weight} ${sizePx}px ${EXPORT_FONT_FAMILY}, sans-serif`
}

function applyExportFontVariation(ctx: CanvasRenderingContext2D) {
  try {
    ctx.fontVariationSettings = "'CRSV' 1, 'MONO' 0, 'slnt' 0"
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
  valueLabel?: string
) {
  const valueText = valueLabel ?? value.toLocaleString()
  applyExportFontVariation(ctx)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = exportCanvasFont(500, 11)
  const yearWidth = ctx.measureText(year).width
  ctx.font = exportCanvasFont(700, 16)
  const valueWidth = ctx.measureText(valueText).width

  const padX = 12
  const padTop = 8
  const padBottom = 9
  const gap = 3
  const boxW = Math.max(yearWidth, valueWidth, 44) + padX * 2
  const boxH = padTop + 11 + gap + 16 + padBottom
  const boxX = pointX - boxW / 2
  const boxY = pointY - OVERLAY_CALLOUT_GAP - boxH

  roundRectPath(ctx, boxX, boxY, boxW, boxH, 8)
  ctx.fillStyle = palette.tooltipBg
  ctx.fill()
  ctx.strokeStyle = palette.tooltipBorder
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = palette.muted
  ctx.font = exportCanvasFont(500, 11)
  ctx.fillText(year, pointX, boxY + padTop)

  ctx.fillStyle = palette.line
  ctx.font = exportCanvasFont(700, 16)
  ctx.fillText(valueText, pointX, boxY + padTop + 11 + gap)
}

function mapExportColor(value: string, palette: ExportPalette): string {
  const v = value.trim()
  if (!v || v === 'none' || v === 'transparent') return v

  if (v.includes('color-mix') && v.includes('--text-primary')) {
    if (v.includes('72%')) return palette.bar
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
  const { format, theme, fileName, scale = 2, branding, overlayCallout } = options
  const background = format === 'jpeg' ? true : options.background
  const palette = EXPORT_PALETTES[theme]

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
    // Measure footer height after fonts are set; start with a provisional canvas.
    const canvas = document.createElement('canvas')
    const measureCtx = canvas.getContext('2d')
    if (!measureCtx) throw new Error('Canvas is not available for chart export')

    applyExportFontVariation(measureCtx)
    const textWidth = Math.max(1, width)
    let attributionLineCount = 0
    let copyrightLineCount = 0
    if (branding?.attribution) {
      measureCtx.font = exportCanvasFont(400, 11)
      attributionLineCount = Math.min(
        wrapCanvasText(measureCtx, branding.attribution, textWidth).length,
        MAX_ATTRIBUTION_LINES
      )
    }
    if (branding?.copyright) {
      measureCtx.font = exportCanvasFont(500, 11)
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
    const contentHeight = height + titleBand + footerBand
    const totalWidth = width + EXPORT_MARGIN * 2
    const totalHeight = contentHeight + EXPORT_MARGIN * 2
    const originX = EXPORT_MARGIN
    const originY = EXPORT_MARGIN

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
      ctx.font = exportCanvasFont(700, 22)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      const titleLines = wrapCanvasText(ctx, branding.title, textWidth)
      titleLines.slice(0, 2).forEach((line, index) => {
        ctx.fillText(line, originX, originY + 14 + index * 26)
      })
    }

    ctx.drawImage(image, originX, originY + titleBand, width, height)

    if (overlayCallout) {
      const anchor = sourceSvg.querySelector(`[${STATION_USAGE_OVERLAY_ANCHOR_ATTR}]`)
      const cx = anchor ? Number(anchor.getAttribute('cx')) : NaN
      const cy = anchor ? Number(anchor.getAttribute('cy')) : NaN
      if (Number.isFinite(cx) && Number.isFinite(cy)) {
        drawOverlayCallout(
          ctx,
          palette,
          originX + cx,
          originY + titleBand + cy,
          overlayCallout.year,
          overlayCallout.value,
          overlayCallout.valueLabel
        )
      }
    }

    if (hasFooter) {
      let y = originY + titleBand + height + FOOTER_PAD

      if (branding?.attribution && attributionLineCount > 0) {
        ctx.fillStyle = palette.muted
        ctx.font = exportCanvasFont(400, 11)
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
        ctx.font = exportCanvasFont(500, 11)
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
