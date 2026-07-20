import { describe, expect, it } from 'vitest'
import {
  getExportCanvasSize,
  getExportCapturePlotSize,
  resolveExportAspectValue,
} from './exportChartImage'

describe('resolveExportAspectValue', () => {
  it('keeps landscape 16:9 and flips portrait', () => {
    expect(resolveExportAspectValue('16:9', 'landscape')).toBeCloseTo(16 / 9)
    expect(resolveExportAspectValue('16:9', 'portrait')).toBeCloseTo(9 / 16)
  })
})

describe('getExportCanvasSize', () => {
  it('returns a landscape 16:9 canvas', () => {
    expect(getExportCanvasSize('16:9', 'landscape')).toEqual({ width: 1920, height: 1080 })
  })
})

describe('getExportCapturePlotSize', () => {
  it('returns a design-size plot that can scale up into the 16:9 frame', () => {
    const canvas = getExportCanvasSize('16:9', 'landscape')
    const plot = getExportCapturePlotSize('16:9', 'landscape')
    expect(plot.width).toBeLessThan(canvas.width)
    expect(plot.height).toBeLessThan(canvas.height)
    expect(plot.width).toBeGreaterThan(plot.height)
    expect(plot.height).toBeGreaterThanOrEqual(520)
  })
})
