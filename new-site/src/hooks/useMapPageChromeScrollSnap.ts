'use client'

import { useEffect } from 'react'

/** Slow scrolls: wait for inertia to ease before snapping. */
const SETTLE_MS = 48
/** Fast flicks: commit as soon as we leave the top edge. */
const FAST_VELOCITY_PX_MS = 0.55
const FAST_DELTA_PX = 28
/** Ignore tiny movement when classifying direction. */
const DIRECTION_EPS_PX = 1
const EDGE_PX = 2
const ANIMATION_MS = 380

function readCssLengthPx(cssLength: string): number {
  const probe = document.createElement('div')
  probe.style.cssText = `position:fixed;top:${cssLength};left:0;width:0;height:0;visibility:hidden;pointer-events:none`
  document.body.appendChild(probe)
  const px = probe.getBoundingClientRect().top
  probe.remove()
  return px
}

function toolbarDockScrollY(toolbar: HTMLElement, headerOffsetPx: number): number {
  return Math.max(0, Math.round(window.scrollY + toolbar.getBoundingClientRect().top - headerOffsetPx))
}

/**
 * On the maps page, scrolling through the title band snaps so the network tab bar
 * docks under the site header (title scrolls away). Scrolling back up snaps to top.
 * Fast flicks commit immediately; slow scrolls wait for settle / scrollend.
 */
export function useMapPageChromeScrollSnap(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    const page = document.querySelector('.stations-map-page')
    if (!(page instanceof HTMLElement)) return

    const title = page.querySelector('.rs-page-top-header')
    const toolbar = page.querySelector('.stations-toolbar-band')
    if (!(title instanceof HTMLElement) || !(toolbar instanceof HTMLElement)) return

    let lastY = window.scrollY
    let lastT = performance.now()
    let lastDirection: 'up' | 'down' | null = null
    let settleTimer: number | null = null
    let releaseTimer: number | null = null
    let animating = false
    let animTarget: number | null = null

    const prefersReducedMotion = () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const titleSnapEnabled = () =>
      title.offsetParent !== null && title.getBoundingClientRect().height >= 1

    const clearSettle = () => {
      if (settleTimer != null) {
        window.clearTimeout(settleTimer)
        settleTimer = null
      }
    }

    const computeSnapY = () => {
      const headerOffsetPx = readCssLengthPx('var(--app-header-offset)')
      return toolbarDockScrollY(toolbar, headerOffsetPx)
    }

    const releaseAnimationLock = () => {
      animating = false
      animTarget = null
      if (releaseTimer != null) {
        window.clearTimeout(releaseTimer)
        releaseTimer = null
      }
    }

    const scrollToTarget = (target: number) => {
      const y = window.scrollY
      if (Math.abs(target - y) <= EDGE_PX) return

      // Already animating to the same place — let it finish.
      if (animating && animTarget != null && Math.abs(animTarget - target) <= EDGE_PX) return

      animating = true
      animTarget = target
      clearSettle()

      const reduced = prefersReducedMotion()
      window.scrollTo({
        top: target,
        behavior: reduced ? 'auto' : 'smooth',
      })

      if (releaseTimer != null) window.clearTimeout(releaseTimer)
      releaseTimer = window.setTimeout(
        () => {
          releaseAnimationLock()
          // Final settle in case smooth scroll was interrupted by inertia.
          const snapY = computeSnapY()
          const current = window.scrollY
          if (!titleSnapEnabled() || snapY <= EDGE_PX) return
          if (current > EDGE_PX && current < snapY - EDGE_PX) {
            const fallback = lastDirection === 'up' ? 0 : snapY
            if (Math.abs(fallback - current) > EDGE_PX) {
              window.scrollTo({ top: fallback, behavior: 'auto' })
            }
          }
        },
        reduced ? 0 : ANIMATION_MS
      )
    }

    const pickTarget = (
      y: number,
      snapY: number,
      direction: 'up' | 'down' | null
    ): number => {
      if (direction === 'down') return snapY
      if (direction === 'up') return 0
      return y >= snapY / 2 ? snapY : 0
    }

    const snapIfNeeded = (direction: 'up' | 'down' | null, force = false) => {
      if (!titleSnapEnabled()) return

      const snapY = computeSnapY()
      if (snapY <= EDGE_PX) return

      const y = window.scrollY
      if (y <= EDGE_PX || y >= snapY - EDGE_PX) return

      const target = pickTarget(y, snapY, direction ?? lastDirection)
      if (!force && Math.abs(target - y) <= EDGE_PX) return
      scrollToTarget(target)
    }

    const scheduleSettle = () => {
      clearSettle()
      settleTimer = window.setTimeout(() => {
        settleTimer = null
        if (animating) return
        snapIfNeeded(lastDirection)
      }, SETTLE_MS)
    }

    const onScroll = () => {
      const y = window.scrollY
      const now = performance.now()
      const dt = Math.max(1, now - lastT)
      const dy = y - lastY
      const velocity = dy / dt

      if (Math.abs(dy) > DIRECTION_EPS_PX) {
        lastDirection = dy > 0 ? 'down' : 'up'
      }

      lastY = y
      lastT = now

      if (!titleSnapEnabled()) {
        clearSettle()
        return
      }

      const snapY = computeSnapY()
      if (snapY <= EDGE_PX) {
        clearSettle()
        return
      }

      // Past the dock or at the top — no chrome snap needed.
      if (y <= EDGE_PX || y >= snapY - EDGE_PX) {
        clearSettle()
        // Fast flick finished past the dock: drop the animation lock so we don't
        // yank the page back after inertia.
        if (animating && animTarget != null) {
          if (lastDirection === 'down' && y >= snapY - EDGE_PX) releaseAnimationLock()
          if (lastDirection === 'up' && y <= EDGE_PX) releaseAnimationLock()
        }
        return
      }

      // User scrolled opposite to an in-flight snap — retarget.
      if (animating && animTarget != null && lastDirection != null) {
        const desired = pickTarget(y, snapY, lastDirection)
        if (Math.abs(desired - animTarget) > EDGE_PX) {
          scrollToTarget(desired)
        }
        return
      }

      if (animating) return

      const fastDown = lastDirection === 'down' && (velocity >= FAST_VELOCITY_PX_MS || dy >= FAST_DELTA_PX)
      const fastUp = lastDirection === 'up' && (velocity <= -FAST_VELOCITY_PX_MS || dy <= -FAST_DELTA_PX)

      // Fast flicks: commit immediately once we've left the resting edge.
      if (fastDown && y > EDGE_PX) {
        scrollToTarget(snapY)
        return
      }
      if (fastUp && y < snapY - EDGE_PX) {
        scrollToTarget(0)
        return
      }

      scheduleSettle()
    }

    const onScrollEnd = () => {
      if (animating) return
      snapIfNeeded(lastDirection, true)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scrollend', onScrollEnd as EventListener)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('scrollend', onScrollEnd as EventListener)
      clearSettle()
      if (releaseTimer != null) window.clearTimeout(releaseTimer)
    }
  }, [enabled])
}
