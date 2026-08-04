'use client'

import React, { useEffect, useId, useState } from 'react'
import {
  MobileHeaderMenu,
  MobileHeaderPanel,
  MobileHeaderToggle,
} from '@/components/misc/Header/MobileHeader'
import { SidebarPanel, SidebarPanelNav, SidebarPanelNavItem } from '@/components/misc/SidebarPanel'
import './LegalDocsLayout.css'

export type LegalDocsSection = {
  id: string
  label: string
  /** Content subsection titles shown under this section in the left panel. */
  subheaders?: string[]
}

type LegalDocsSectionNavProps = {
  sections: LegalDocsSection[]
  activeSectionId: string
  onSelect: (sectionId: string) => void
  onSubheaderSelect?: (sectionId: string, title: string) => void
  ariaLabel?: string
}

/** DOM id for a legal-doc content subsection (scroll target from left nav). */
export function legalDocsSubsectionId(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `legal-docs-subsection--${slug || 'section'}`
}

function DesktopSectionTabs({
  sections,
  activeSectionId,
  onSelect,
  onSubheaderSelect,
  ariaLabel,
}: LegalDocsSectionNavProps) {
  return (
    <aside className="station-details-sidebar legal-docs-sidebar">
      <SidebarPanel className="station-details-sidebar-panel">
        <SidebarPanelNav className="station-details-tabs" aria-label={ariaLabel}>
          {sections.map((section) => {
            const isActive = activeSectionId === section.id
            return (
              <SidebarPanelNavItem
                key={section.id}
                label={section.label}
                selected={isActive}
                onSelect={() => onSelect(section.id)}
                onSubheaderSelect={(title) => {
                  onSelect(section.id)
                  onSubheaderSelect?.(section.id, title)
                }}
                subheaders={section.subheaders}
                className="station-details-tab rs-button--color-primary"
              />
            )
          })}
        </SidebarPanelNav>
      </SidebarPanel>
    </aside>
  )
}

/**
 * Desktop: station-details-style left sidebar with optional subsections.
 * Mobile (≤1023px): header menu (hamburger + collapsible panel).
 */
export function LegalDocsSectionNav({
  sections,
  activeSectionId,
  onSelect,
  onSubheaderSelect,
  ariaLabel = 'Document sections',
}: LegalDocsSectionNavProps) {
  const navId = useId()
  const [menuOpen, setMenuOpen] = useState(false)
  const activeSection = sections.find((section) => section.id === activeSectionId)
  const activeLabel = activeSection?.label ?? 'Sections'

  useEffect(() => {
    setMenuOpen(false)
  }, [activeSectionId])

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
        sections={sections}
        activeSectionId={activeSectionId}
        onSelect={onSelect}
        onSubheaderSelect={onSubheaderSelect}
        ariaLabel={ariaLabel}
      />

      <div className="station-details-mobile-sections legal-docs-mobile-sections">
        <MobileHeaderMenu
          menuOpen={menuOpen}
          className="station-details-mobile-sections__menu"
        >
          <div className="station-details-mobile-sections__bar">
            <span className="station-details-mobile-sections__title">
              <span className="station-details-mobile-sections__title-text">{activeLabel}</span>
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
                {sections.map((section) => {
                  const isActive = activeSectionId === section.id
                  return (
                    <li key={section.id}>
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
                          onSelect(section.id)
                          closeMenu()
                        }}
                      >
                        <span className="header-nav-link__label">{section.label}</span>
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

export default LegalDocsSectionNav
