'use client'

import type { ReactNode } from 'react'
import './SidebarPanel.css'

type SidebarPanelProps = {
  children: ReactNode
  className?: string
  /** Optional busy state for loading shells (e.g. stations list). */
  'aria-busy'?: boolean | 'true' | 'false'
}

/**
 * Shared left-panel shell (bleed chrome, hover/selected washes).
 *
 * Usages:
 * - Stations-like: children are SidebarDropdownSection only
 * - Details-like: children are SidebarPanelNav / NavItems only
 * - Combined: mix both as siblings inside one SidebarPanel
 *
 * @example Combined
 * ```tsx
 * <SidebarPanel>
 *   <SidebarDropdownSection title="Filters" expanded={…} onExpandedChange={…}>
 *     {filterControls}
 *   </SidebarDropdownSection>
 *   <SidebarPanelNav aria-label="Sections">
 *     <SidebarPanelNavItem label="Overview" selected={…} onSelect={…} />
 *   </SidebarPanelNav>
 * </SidebarPanel>
 * ```
 */
export function SidebarPanel({
  children,
  className = '',
  'aria-busy': ariaBusy,
}: SidebarPanelProps) {
  return (
    <div
      className={['sidebar-panel', className].filter(Boolean).join(' ')}
      aria-busy={ariaBusy}
    >
      {children}
    </div>
  )
}

export default SidebarPanel
