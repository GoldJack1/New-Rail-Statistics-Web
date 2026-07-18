'use client'

import React, { useEffect, useId, useState } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { ChevronRightIcon } from '@/components/icons'
import {
  MobileHeaderMenu,
  MobileHeaderPanel,
  MobileHeaderToggle,
} from '@/components/misc/Header/MobileHeader'
import type { StationDetailsTab } from '@/utils/stationCollectionFieldSchema'
import { getStationDetailsSectionIcon } from '@/utils/stationDetailFieldIcons'
import '@/components/misc/SidebarDropdownSection/SidebarDropdownSection.css'

export type StationDetailsSectionTab = {
  id: StationDetailsTab
  label: string
  knowledgebase?: boolean
  sectionKey?: string
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
  return (
    <aside className="station-details-sidebar">
      <div className="station-details-sidebar-panel">
        <nav className="station-details-tabs" aria-label={ariaLabel}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const TabIcon = tabIconFor(tab, showIcons ?? true)
            return (
              <div
                key={tab.id}
                className={[
                  'sidebar-dropdown',
                  'station-details-tab',
                  'rs-button--color-primary',
                  isActive ? 'station-details-tab--active' : 'station-details-tab--idle',
                  tab.knowledgebase ? 'station-details-tab--knowledgebase' : '',
                  markFirebaseTabs && !tab.knowledgebase
                    ? 'station-details-tab--firebase'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="sidebar-dropdown__header-row">
                  <button
                    type="button"
                    className="sidebar-dropdown__header"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onSelect(tab.id)}
                  >
                    <span className="sidebar-dropdown__title">
                      {TabIcon ? (
                        <TabIcon
                          className="station-details-tab__icon"
                          size={16}
                          weight="bold"
                          aria-hidden
                        />
                      ) : null}
                      {tab.label}
                    </span>
                    <ChevronRightIcon className="sidebar-dropdown__chevron" aria-hidden />
                  </button>
                </div>
              </div>
            )
          })}
        </nav>
      </div>
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
