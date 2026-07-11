'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type TransitionEvent } from 'react'

interface UseRevealBelowHeaderPanelOptions {
  isExpanded: boolean
  measureDeps?: ReadonlyArray<unknown>
  replayKey?: unknown
}

export function useRevealBelowHeaderPanel({
  isExpanded,
  measureDeps = [],
  replayKey,
}: UseRevealBelowHeaderPanelOptions) {
  const innerRef = useRef<HTMLDivElement>(null)
  const panelHeightRef = useRef(0)
  const previousExpandedRef = useRef(isExpanded)
  const previousReplayKeyRef = useRef(replayKey)
  const [panelHeight, setPanelHeight] = useState(0)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [animatedMaxHeight, setAnimatedMaxHeight] = useState<'0px' | 'none' | string>('0px')

  const updatePanelHeight = useCallback(() => {
    const element = innerRef.current
    if (!element) return 0
    const nextHeight = element.scrollHeight
    if (nextHeight > 0) {
      panelHeightRef.current = nextHeight
    }
    setPanelHeight(nextHeight)
    return nextHeight
  }, [])

  useLayoutEffect(() => {
    updatePanelHeight()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatePanelHeight, ...measureDeps])

  useEffect(() => {
    const element = innerRef.current
    if (!element) return

    const observer = new ResizeObserver(() => {
      if (isClosing || !isPanelOpen) return
      updatePanelHeight()
      setAnimatedMaxHeight((current) => {
        if (current === 'none') return 'none'
        const nextHeight = panelHeightRef.current
        return nextHeight > 0 ? `${nextHeight}px` : current
      })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [isClosing, isPanelOpen, updatePanelHeight, ...measureDeps])

  useLayoutEffect(() => {
    const wasExpanded = previousExpandedRef.current
    previousExpandedRef.current = isExpanded

    if (isExpanded) {
      if (replayKey !== undefined && previousReplayKeyRef.current !== replayKey) {
        previousReplayKeyRef.current = replayKey
        setIsPanelOpen(false)
        setIsClosing(false)
        setAnimatedMaxHeight('0px')
      }
      return
    }

    if (!wasExpanded) {
      setIsPanelOpen(false)
      setIsClosing(false)
      setAnimatedMaxHeight('0px')
      return
    }

    const collapsedHeight = updatePanelHeight() || panelHeightRef.current || panelHeight
    setIsPanelOpen(false)
    setIsClosing(true)
    setAnimatedMaxHeight(`${collapsedHeight}px`)

    const raf = requestAnimationFrame(() => {
      setAnimatedMaxHeight('0px')
    })

    return () => cancelAnimationFrame(raf)
  }, [isExpanded, replayKey, panelHeight, updatePanelHeight])

  useEffect(() => {
    if (!isExpanded) return

    setIsPanelOpen(false)
    setIsClosing(false)
    setAnimatedMaxHeight('0px')

    const raf = requestAnimationFrame(() => {
      const nextHeight = updatePanelHeight() || panelHeightRef.current || panelHeight
      setIsPanelOpen(true)
      setAnimatedMaxHeight(`${nextHeight}px`)
    })

    return () => cancelAnimationFrame(raf)
  }, [isExpanded, replayKey, panelHeight, updatePanelHeight, ...measureDeps])

  const handlePanelTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return
      if (event.propertyName !== 'max-height') return

      if (isExpanded) {
        setAnimatedMaxHeight('none')
        setIsClosing(false)
        return
      }

      setIsClosing(false)
      setAnimatedMaxHeight('0px')
    },
    [isExpanded]
  )

  const isPanelSettled = animatedMaxHeight === 'none'

  return {
    innerRef,
    isPanelOpen,
    isClosing,
    isPanelSettled,
    animatedMaxHeight,
    updatePanelHeight,
    handlePanelTransitionEnd,
  }
}
