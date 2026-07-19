'use client'

import { useEffect, useId, useState, type MouseEvent, type ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { ChevronRightIcon } from '@/components/icons'
import AutoAnimateCollapse from '@/components/misc/AutoAnimateCollapse/AutoAnimateCollapse'
import { getStationDetailsSubsectionIcon } from '@/utils/stationDetailFieldIcons'
import '@/components/misc/SidebarDropdownSection/SidebarDropdownSection.css'
import './SidebarPanel.css'

type SidebarPanelNavProps = {
  children: ReactNode
  className?: string
  'aria-label'?: string
}

/** Nav list wrapper for details-style exclusive section tabs. */
export function SidebarPanelNav({
  children,
  className = '',
  'aria-label': ariaLabel,
}: SidebarPanelNavProps) {
  return (
    <nav
      className={['sidebar-panel-nav', className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
    >
      {children}
    </nav>
  )
}

type SidebarPanelNavItemProps = {
  label: string
  selected?: boolean
  onSelect: () => void
  /** Fired when a subsection child is activated (after parent select). */
  onSubheaderSelect?: (title: string) => void
  icon?: Icon | null
  className?: string
  /** Content subsection titles shown under this section in the left panel. */
  subheaders?: string[]
  /** Controlled expand; defaults to open when selected. */
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

/**
 * Details-style section tab row with optional collapsible subsection children.
 */
export function SidebarPanelNavItem({
  label,
  selected = false,
  onSelect,
  onSubheaderSelect,
  icon: IconComponent,
  className = '',
  subheaders = [],
  expanded: expandedProp,
  onExpandedChange,
}: SidebarPanelNavItemProps) {
  const childrenId = useId()
  const hasChildren = subheaders.length > 0
  const [internalExpanded, setInternalExpanded] = useState(selected && hasChildren)
  const isControlled = expandedProp !== undefined
  const expanded = hasChildren ? (isControlled ? expandedProp : internalExpanded) : false

  useEffect(() => {
    if (!hasChildren || isControlled) return
    if (selected) setInternalExpanded(true)
  }, [selected, hasChildren, isControlled])

  const setExpanded = (next: boolean) => {
    if (!hasChildren) return
    if (isControlled) {
      onExpandedChange?.(next)
      return
    }
    setInternalExpanded(next)
  }

  const handleTitleClick = () => {
    onSelect()
    if (hasChildren) setExpanded(true)
  }

  const handleChevronClick = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!hasChildren) {
      onSelect()
      return
    }
    const next = !expanded
    setExpanded(next)
    if (next) onSelect()
  }

  const handleSubheaderClick = (title: string) => {
    onSelect()
    onSubheaderSelect?.(title)
  }

  return (
    <div
      className={[
        'sidebar-dropdown',
        'sidebar-panel-nav-item',
        selected ? 'sidebar-dropdown--selected' : '',
        expanded ? 'sidebar-dropdown--open' : '',
        hasChildren ? 'sidebar-panel-nav-item--has-children' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="sidebar-dropdown__header-row">
        <button
          type="button"
          className="sidebar-dropdown__header"
          aria-current={selected ? 'page' : undefined}
          aria-expanded={hasChildren ? expanded : undefined}
          aria-controls={hasChildren ? childrenId : undefined}
          onClick={handleTitleClick}
        >
          <span className="sidebar-dropdown__title">
            {IconComponent ? (
              <IconComponent
                className="sidebar-panel-nav-item__icon"
                size={16}
                weight="bold"
                aria-hidden
              />
            ) : null}
            {label}
          </span>
        </button>
        <button
          type="button"
          className="sidebar-panel-nav-item__chevron-btn"
          aria-label={
            hasChildren
              ? expanded
                ? `Collapse ${label} subsections`
                : `Expand ${label} subsections`
              : label
          }
          aria-expanded={hasChildren ? expanded : undefined}
          aria-controls={hasChildren ? childrenId : undefined}
          onClick={handleChevronClick}
        >
          <ChevronRightIcon className="sidebar-dropdown__chevron" aria-hidden />
        </button>
      </div>

      {hasChildren ? (
        <AutoAnimateCollapse isOpen={expanded} id={childrenId} ariaHidden={!expanded}>
          <ul className="sidebar-panel-nav-item__children" aria-label={`${label} subsections`}>
            {subheaders.map((title) => {
              const ChildIcon = getStationDetailsSubsectionIcon(title)
              return (
                <li key={title}>
                  <button
                    type="button"
                    className="sidebar-panel-nav-item__child"
                    onClick={() => handleSubheaderClick(title)}
                  >
                    <span className="sidebar-panel-nav-item__child-label">
                      {ChildIcon ? (
                        <ChildIcon
                          className="sidebar-panel-nav-item__child-icon"
                          size={14}
                          weight="bold"
                          aria-hidden
                        />
                      ) : null}
                      {title}
                    </span>
                    <ChevronRightIcon
                      className="sidebar-panel-nav-item__child-chevron"
                      aria-hidden
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        </AutoAnimateCollapse>
      ) : null}
    </div>
  )
}
