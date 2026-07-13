'use client'

import dynamic from 'next/dynamic'
import React, { useEffect, useMemo, useRef, useState } from 'react'

const StationLocationMapView = dynamic(() => import('./StationLocationMapView'), {
  ssr: false,
  loading: () => (
    <div
      className="station-location-map station-location-map--loading"
      style={{ minHeight: 240 }}
      aria-busy="true"
      aria-label="Loading map"
    />
  ),
})

interface StationResponsiveLocationMapProps {
  latitude: number
  longitude: number
}

function getResponsiveAspectRatio(width: number): number {
  // Scale from near-square on very small screens up to desktop-like ratio.
  if (width <= 0) return 4 / 3
  const minRatio = 1
  const maxRatio = 1.6
  const normalized = Math.min(1, Math.max(0, (width - 280) / 360))
  return minRatio + (maxRatio - minRatio) * normalized
}

const StationResponsiveLocationMap: React.FC<StationResponsiveLocationMapProps> = ({ latitude, longitude }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const updateWidth = () => {
      const next = Math.round(el.getBoundingClientRect().width)
      setWidth((prev) => (prev === next ? prev : next))
    }

    updateWidth()

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateWidth) : null
    observer?.observe(el)
    window.addEventListener('resize', updateWidth)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateWidth)
    }
  }, [])

  const aspectRatio = useMemo(() => getResponsiveAspectRatio(width), [width])
  const mapHeight = useMemo(() => {
    if (width <= 0) return undefined
    return Math.max(240, Math.round(width / aspectRatio))
  }, [width, aspectRatio])

  return (
    <div ref={wrapperRef} className="station-responsive-location-map">
      <StationLocationMapView
        latitude={latitude}
        longitude={longitude}
        height={mapHeight}
      />
    </div>
  )
}

export default StationResponsiveLocationMap
