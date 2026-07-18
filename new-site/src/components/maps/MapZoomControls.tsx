'use client'

import { useCallback, useEffect, useState } from 'react'
import { Minus, Plus } from '@phosphor-icons/react'
import { createPortal } from 'react-dom'
import type L from 'leaflet'
import { BUTCircleButton } from '../buttons'
import './MapZoomControls.css'

interface MapZoomControlsProps {
  map: L.Map | null
}

/**
 * BUTCircleButton +/- zoom controls (same as /stations/map), portaled into the Leaflet container.
 */
export function MapZoomControls({ map }: MapZoomControlsProps) {
  const [zoomBounds, setZoomBounds] = useState<{ zoom: number; min: number; max: number } | null>(
    null
  )

  useEffect(() => {
    if (!map) {
      setZoomBounds(null)
      return
    }

    const syncZoomBounds = () => {
      setZoomBounds({ zoom: map.getZoom(), min: map.getMinZoom(), max: map.getMaxZoom() })
    }
    syncZoomBounds()
    map.on('zoomend', syncZoomBounds)
    map.on('zoomlevelschange', syncZoomBounds)
    return () => {
      map.off('zoomend', syncZoomBounds)
      map.off('zoomlevelschange', syncZoomBounds)
    }
  }, [map])

  const handleZoomIn = useCallback(() => {
    map?.zoomIn()
  }, [map])

  const handleZoomOut = useCallback(() => {
    map?.zoomOut()
  }, [map])

  if (!map) return null

  return createPortal(
    <div className="map-zoom-control">
      <BUTCircleButton
        type="button"
        ariaLabel="Zoom in"
        icon={<Plus size={16} weight="bold" aria-hidden />}
        disabled={zoomBounds != null && zoomBounds.zoom >= zoomBounds.max}
        onClick={handleZoomIn}
      />
      <BUTCircleButton
        type="button"
        ariaLabel="Zoom out"
        icon={<Minus size={16} weight="bold" aria-hidden />}
        disabled={zoomBounds != null && zoomBounds.zoom <= zoomBounds.min}
        onClick={handleZoomOut}
      />
    </div>,
    map.getContainer()
  )
}

export default MapZoomControls
