'use client'

import React, { useEffect, useId, useState } from 'react'
import type { Icon } from '@phosphor-icons/react'
import {
  MobileHeaderMenu,
  MobileHeaderPanel,
  MobileHeaderToggle,
} from '@/components/misc/Header/MobileHeader'
import { SidebarPanel, SidebarPanelNav, SidebarPanelNavItem } from '@/components/misc/SidebarPanel'
import type { StationDetailsTab } from '@/utils/stationCollectionFieldSchema'
import { getStationDetailsSectionIcon } from '@/utils/stationDetailFieldIcons'
import { stationDetailsSubsectionId } from '@/utils/stationDetailsTabSubheaders'

export type StationDetailsSectionTab = {
  id: StationDetailsTab
  label: string
  knowledgebase?: boolean
  sectionKey?: string
  /** Content subsection titles shown under this section in the left panel. */
  subheaders?: string[]
}

type StationDetailsSectionNavProps = {
  tabs: StationDetailsSectionTab[]
  activeTab: StationDetailsTab
  onSelect: (tabId: StationDetailsTab) => void
  ariaLabel?: string
  /** When knowledgebase is enabled, mark non-KB tabs for source-compare styling. */
  markFirebaseTabs?: boolean
  showIcons?: boolean
}

function tabIconFor(
  tab: StationDetailsSectionTab,
  showIcons: boolean
): Icon | null {
  if (!showIcons) return null
  return getStationDetailsSectionIcon(tab.id, {
    knowledgebaseSectionKey: tab.sectionKey,
    label: tab.label,
  })
}

function DesktopSectionTabs({
  tabs,
  activeTab,
  onSelect,
  ariaLabel,
  markFirebaseTabs,
  showIcons,
}: StationDetailsSectionNavProps) {
  const scrollToSubheader = (title: string) => {
    const id = stationDetailsSubsectionId(title)
    const run = () => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // Allow tab content to mount before scrolling.
    requestAnimationFrame(() => {
      window.setTimeout(run, 50)
    })
  }

  return (
    <aside className="station-details-sidebar">
      <SidebarPanel className="station-details-sidebar-panel">
        <SidebarPanelNav className="station-details-tabs" aria-label={ariaLabel}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const TabIcon = tabIconFor(tab, showIcons ?? true)
            return (
              <SidebarPanelNavItem
                key={tab.id}
                label={tab.label}
                selected={isActive}
                onSelect={() => onSelect(tab.id)}
                onSubheaderSelect={(title) => {
                  onSelect(tab.id)
                  scrollToSubheader(title)
                }}
                icon={TabIcon}
                subheaders={tab.subheaders}
                className={[
                  'station-details-tab',
                  'rs-button--color-primary',
                  tab.knowledgebase ? 'station-details-tab--knowledgebase' : '',
                  markFirebaseTabs && !tab.knowledgebase
                    ? 'station-details-tab--firebase'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            )
          })}
        </SidebarPanelNav>
      </SidebarPanel>
    </aside>
  )
}

/**
 * Desktop: left sidebar section tabs.
 * Mobile (≤1023px): reusable header menu (hamburger + collapsible panel).
 */
export function StationDetailsSectionNav({
  tabs,
  activeTab,
  onSelect,
  ariaLabel = 'Station sections',
  markFirebaseTabs = false,
  showIcons = true,
}: StationDetailsSectionNavProps) {
  const navId = useId()
  const [menuOpen, setMenuOpen] = useState(false)
  const activeTabItem = tabs.find((tab) => tab.id === activeTab)
  const activeLabel = activeTabItem?.label ?? 'Sections'
  const ActiveIcon = activeTabItem ? tabIconFor(activeTabItem, showIcons) : null

  useEffect(() => {
    setMenuOpen(false)
  }, [activeTab])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <DesktopSectionTabs
        tabs={tabs}
        activeTab={activeTab}
        onSelect={onSelect}
        ariaLabel={ariaLabel}
        markFirebaseTabs={markFirebaseTabs}
        showIcons={showIcons}
      />

      <div className="station-details-mobile-sections">
        <MobileHeaderMenu
          menuOpen={menuOpen}
          className="station-details-mobile-sections__menu"
        >
          <div className="station-details-mobile-sections__bar">
            <span className="station-details-mobile-sections__title">
              {ActiveIcon ? (
                <ActiveIcon
                  className="station-details-tab__icon"
                  size={16}
                  weight="bold"
                  aria-hidden
                />
              ) : null}
              {activeLabel}
            </span>
            <MobileHeaderToggle
              menuOpen={menuOpen}
              navId={navId}
              onMenuOpenChange={setMenuOpen}
              ariaLabelOpen="Open section menu"
              ariaLabelClose="Close section menu"
            />
          </div>
          <MobileHeaderPanel menuOpen={menuOpen} navId={navId} onClose={closeMenu}>
            <nav className="header-nav header-nav--mobile" aria-label={ariaLabel}>
              <ul className="header-mobile-nav-list">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id
                  const TabIcon = tabIconFor(tab, showIcons)
                  return (
                    <li key={tab.id}>
                      <button
                        type="button"
                        className={[
                          'header-nav-link',
                          isActive ? 'header-nav-link--active' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => {
                          onSelect(tab.id)
                          closeMenu()
                        }}
                      >
                        {TabIcon ? (
                          <TabIcon
                            className="station-details-tab__icon"
                            size={16}
                            weight="bold"
                            aria-hidden
                          />
                        ) : null}
                        <span className="header-nav-link__label">{tab.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </MobileHeaderPanel>
        </MobileHeaderMenu>
      </div>
    </>
  )
}

export default StationDetailsSectionNav
