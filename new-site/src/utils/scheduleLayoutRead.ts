let layoutReadRaf = 0
const layoutReadCallbacks = new Set<() => void>()

/** Coalesce layout reads from multiple components into one animation frame. */
export function scheduleLayoutRead(fn: () => void): void {
  layoutReadCallbacks.add(fn)
  if (layoutReadRaf !== 0) return
  layoutReadRaf = requestAnimationFrame(() => {
    layoutReadRaf = 0
    const callbacks = Array.from(layoutReadCallbacks)
    layoutReadCallbacks.clear()
    for (const callback of callbacks) callback()
  })
}
