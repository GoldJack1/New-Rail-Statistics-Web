/**
 * Map tile layer config per theme.
 * Light and dark both use standard OSM; dark mode tiles are tuned via leafletDarkTiles.css.
 * Both themes use the OpenRailwayMap vector overlay from mapTileLayers.ts.
 */

import { shouldUseOsmBackendProxy } from './osmBackendProxy'

export interface TileLayerConfig {
  url: string
  options: {
    attribution: string
    subdomains?: string
    maxZoom?: number
  }
}

const OSM_DIRECT = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_PROXY = '/api/osm-tile/{s}/{z}/{x}/{y}.png'

export function getTileLayersConfig(): { light: TileLayerConfig; dark: TileLayerConfig } {
  const config: TileLayerConfig = {
    url: shouldUseOsmBackendProxy() ? OSM_PROXY : OSM_DIRECT,
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  }
  return { light: config, dark: config }
}
