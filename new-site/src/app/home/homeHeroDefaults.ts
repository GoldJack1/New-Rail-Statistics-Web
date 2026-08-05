import type { HeroMediaFit, HeroMobileTabletUncroppedSettings } from '@/components/heros'

/** Shared square-media defaults for home hero sections. */
export const HOME_SQUARE_MEDIA_FIT: HeroMediaFit = 'contain'

/**
 * Scroll zoom for square art. It stays still while the hero scrolls into view and only ramps as
 * the hero leaves the top of the screen. `maxScale` is how far it zooms by the end of that ramp;
 * `scaleSpeed` shortens the ramp, and sits at 2 so the zoom completes while the art is still on
 * screen — the art sits above the copy panel, so it clears the top well before the band does.
 */
export const HOME_SQUARE_MEDIA_DEFAULTS: HeroMobileTabletUncroppedSettings = {
  scaleSpeed: 2,
  maxScale: 1.6
}
