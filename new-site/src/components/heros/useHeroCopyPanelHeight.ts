import { type RefObject, useEffect } from 'react'

/**
 * Publishes `--hero-copy-panel-height` on the hero section: the measured height of the copy panel
 * that overlays the art band on mobile/tablet.
 *
 * Square `contain` art has to fit the space the panel leaves behind, and that space is not a fixed
 * fraction of the band — the panel grows as copy wraps onto more lines on narrower viewports. A
 * hardcoded fraction therefore both wastes room on wide tablets and buries the art behind the panel
 * on phones, so the art is sized against this measurement instead.
 */
export function useHeroCopyPanelHeight(
  heroRef: RefObject<HTMLElement | null>,
  panelSelector: string
): void {
  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return
    const panel = hero.querySelector<HTMLElement>(panelSelector)
    if (!panel) return

    const sync = () => {
      const height = panel.getBoundingClientRect().height
      hero.style.setProperty('--hero-copy-panel-height', `${Math.round(height)}px`)
    }

    sync()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', sync)
      return () => {
        window.removeEventListener('resize', sync)
        hero.style.removeProperty('--hero-copy-panel-height')
      }
    }

    /** Observe the band too: its own height changes feed the `calc(100% - …)` the art is sized by. */
    const observer = new ResizeObserver(sync)
    observer.observe(panel)
    observer.observe(hero)
    return () => {
      observer.disconnect()
      hero.style.removeProperty('--hero-copy-panel-height')
    }
  }, [heroRef, panelSelector])
}
