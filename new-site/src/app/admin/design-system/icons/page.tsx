'use client'

import React, { useMemo, useState } from 'react'
import type { Icon, IconWeight } from '@phosphor-icons/react'
import { PageTopHeader } from '@/components/misc'
import { BUTLink, BUTTabButton } from '@/components/buttons'
import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  BackIcon,
  ChartBar,
  CheckCircle,
  Database,
  DownloadSimple,
  FileText,
  Files,
  Gear,
  List,
  MagnifyingGlass,
  MagnifyingGlassPlus,
  MapPin,
  Moon,
  Plus,
  RAIL_PHOSPHOR_ICONS,
  ShareNetwork,
  SquaresFour,
  Star,
  Sun,
  X,
  XCircle,
} from '@/components/icons'
import './IconsPage.css'

type IconSet = 'all' | 'rail' | 'website'

type ColorOption = {
  id: string
  label: string
  /** CSS color value applied to icons (token or hex) */
  value: string
}

const WEIGHT_TABS: { value: IconWeight; label: string }[] = [
  { value: 'thin', label: 'Thin' },
  { value: 'light', label: 'Light' },
  { value: 'regular', label: 'Regular' },
  { value: 'bold', label: 'Bold' },
  { value: 'fill', label: 'Fill' },
  { value: 'duotone', label: 'Duotone' },
]

const SET_TABS: { value: IconSet; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'rail', label: 'Rail-specific' },
  { value: 'website', label: 'Website' },
]

const COLOR_PRESETS: ColorOption[] = [
  { id: 'text-primary', label: 'Text primary', value: 'var(--text-primary)' },
  { id: 'text-secondary', label: 'Text secondary', value: 'var(--text-secondary)' },
  { id: 'accent', label: 'Accent', value: 'var(--accent-base)' },
  { id: 'accent-bright', label: 'Accent bright', value: 'var(--accent-bright)' },
  { id: 'green', label: 'Green action', value: '#29A354' },
  { id: 'red', label: 'Red action', value: '#B20016' },
  { id: 'white', label: 'White', value: '#ffffff' },
]

const SITE_ICONS: { name: string; phosphor: string; Icon: Icon }[] = [
  { name: 'Document List', phosphor: 'FileText', Icon: FileText },
  { name: 'Database Stack', phosphor: 'Database', Icon: Database },
  { name: 'Search', phosphor: 'MagnifyingGlass', Icon: MagnifyingGlass },
  { name: 'Bar Chart', phosphor: 'ChartBar', Icon: ChartBar },
  { name: 'Grid', phosphor: 'SquaresFour', Icon: SquaresFour },
  { name: 'Sun', phosphor: 'Sun', Icon: Sun },
  { name: 'Moon', phosphor: 'Moon', Icon: Moon },
  { name: 'Hamburger', phosphor: 'List', Icon: List },
  { name: 'Close', phosphor: 'X', Icon: X },
  { name: 'Map Pin', phosphor: 'MapPin', Icon: MapPin },
  { name: 'Error Circle', phosphor: 'XCircle', Icon: XCircle },
  { name: 'Search Plus', phosphor: 'MagnifyingGlassPlus', Icon: MagnifyingGlassPlus },
  { name: 'Arrow Right', phosphor: 'ArrowRight', Icon: ArrowRight },
  { name: 'Arrow Left', phosphor: 'ArrowLeft', Icon: ArrowLeft },
  { name: 'Success Check', phosphor: 'CheckCircle', Icon: CheckCircle },
  { name: 'Star', phosphor: 'Star', Icon: Star },
  { name: 'Network', phosphor: 'ShareNetwork', Icon: ShareNetwork },
  { name: 'Download', phosphor: 'DownloadSimple', Icon: DownloadSimple },
  { name: 'Document Compare', phosphor: 'Files', Icon: Files },
  { name: 'Plus', phosphor: 'Plus', Icon: Plus },
  { name: 'Settings', phosphor: 'Gear', Icon: Gear },
]

const PHOSPHOR_SITE_URL = 'https://phosphoricons.com'

const IconsPage: React.FC = () => {
  const [weight, setWeight] = useState<IconWeight>('regular')
  const [iconSet, setIconSet] = useState<IconSet>('all')
  const [colorId, setColorId] = useState(COLOR_PRESETS[0].id)
  const [customColor, setCustomColor] = useState('#b20016')

  const weightLabel = WEIGHT_TABS.find((tab) => tab.value === weight)?.label ?? weight
  const activePreset = COLOR_PRESETS.find((preset) => preset.id === colorId)
  const iconColor = colorId === 'custom' ? customColor : (activePreset?.value ?? 'var(--text-primary)')
  const colorLabel = colorId === 'custom' ? `Custom ${customColor}` : (activePreset?.label ?? 'Text primary')

  const railTiles = useMemo(
    () =>
      RAIL_PHOSPHOR_ICONS.map(({ name, phosphor, Icon }) => ({
        key: `rail-${phosphor}`,
        name,
        hint: phosphor,
        Icon,
      })),
    [],
  )

  const websiteTiles = useMemo(
    () =>
      SITE_ICONS.map(({ name, phosphor, Icon }) => ({
        key: `site-${phosphor}`,
        name,
        hint: phosphor,
        Icon,
      })),
    [],
  )

  const showRail = iconSet === 'all' || iconSet === 'rail'
  const showWebsite = iconSet === 'all' || iconSet === 'website'

  return (
    <div className="ds-icons-page">
      <PageTopHeader
        title="Icons"
        subtitle={`Phosphor Icons — browsing ${weightLabel.toLowerCase()} weight.`}
        actionButton={{
          to: '/admin/design-system',
          label: 'Back',
          mode: 'iconText',
          icon: <BackIcon />,
        }}
      />
      <div className="container container--full-bleed">
        <div className="ds-icons">
          <div className="ds-icons__toolbar">
            <p className="ds-icons__toolbar-copy">
              Browse weights and colours here, then look up more glyphs on the Phosphor site.
            </p>
            <BUTLink
              href={PHOSPHOR_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ds-icons__phosphor-link"
            >
              Open Phosphor Icons
              <ArrowSquareOut size={16} weight="bold" aria-hidden />
            </BUTLink>
          </div>

          <div className="ds-icons__controls">
            <div className="ds-icons__control">
              <span className="ds-icons__control-label" id="icons-set-label">
                Set
              </span>
              <div
                className="ds-icons__tab-bar"
                role="tablist"
                aria-labelledby="icons-set-label"
              >
                {SET_TABS.map((tab) => (
                  <BUTTabButton
                    key={tab.value}
                    type="button"
                    width="hug"
                    pressed={iconSet === tab.value}
                    onClick={() => setIconSet(tab.value)}
                    ariaLabel={tab.label}
                  >
                    {tab.label}
                  </BUTTabButton>
                ))}
              </div>
            </div>

            <div className="ds-icons__control">
              <span className="ds-icons__control-label" id="icons-weight-label">
                Weight
              </span>
              <div
                className="ds-icons__tab-bar"
                role="tablist"
                aria-labelledby="icons-weight-label"
              >
                {WEIGHT_TABS.map((tab) => (
                  <BUTTabButton
                    key={tab.value}
                    type="button"
                    width="hug"
                    pressed={weight === tab.value}
                    onClick={() => setWeight(tab.value)}
                    ariaLabel={tab.label}
                  >
                    {tab.label}
                  </BUTTabButton>
                ))}
              </div>
            </div>

            <div className="ds-icons__control">
              <span className="ds-icons__control-label" id="icons-color-label">
                Colour
              </span>
              <div
                className="ds-icons__color-bar"
                role="radiogroup"
                aria-labelledby="icons-color-label"
              >
                {COLOR_PRESETS.map((preset) => {
                  const selected = colorId === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={[
                        'ds-icons__swatch',
                        selected ? 'ds-icons__swatch--selected' : '',
                        preset.id === 'white' ? 'ds-icons__swatch--light' : '',
                      ].filter(Boolean).join(' ')}
                      style={{ color: preset.value }}
                      aria-checked={selected}
                      aria-label={preset.label}
                      role="radio"
                      title={preset.label}
                      onClick={() => setColorId(preset.id)}
                    >
                      <span className="ds-icons__swatch-fill" aria-hidden />
                    </button>
                  )
                })}
                <label
                  className={[
                    'ds-icons__swatch ds-icons__swatch--custom',
                    colorId === 'custom' ? 'ds-icons__swatch--selected' : '',
                  ].filter(Boolean).join(' ')}
                  title="Custom colour"
                >
                  <span className="ds-icons__swatch-fill" style={{ background: customColor }} aria-hidden />
                  <input
                    type="color"
                    className="ds-icons__color-input"
                    value={customColor}
                    aria-label="Custom icon colour"
                    onChange={(event) => {
                      setCustomColor(event.target.value)
                      setColorId('custom')
                    }}
                    onClick={() => setColorId('custom')}
                  />
                </label>
                <span className="ds-icons__color-name">{colorLabel}</span>
              </div>
            </div>
          </div>

          {showRail ? (
            <section aria-label="Rail-specific Phosphor icons">
              <div className="ds-icons__section-head">
                <h2 className="ds-icons__section-title">Rail-specific</h2>
                <p className="ds-icons__section-copy">
                  Product metaphors mapped to official Phosphor icons via <code>@phosphor-icons/react</code>.
                </p>
              </div>
              <div className="ds-icons__grid" style={{ color: iconColor }}>
                {railTiles.map(({ key, name, hint, Icon }) => (
                  <div
                    key={key}
                    className="ds-icons__icon-tile ds-icons__icon-tile--review"
                    title={`${name} · ${hint} · ${weightLabel} · ${colorLabel}`}
                    aria-label={`${name}, ${weightLabel}`}
                  >
                    <div className="ds-icons__icon">
                      <Icon size={28} weight={weight} color="currentColor" aria-hidden />
                    </div>
                    <div className="ds-icons__label">{name}</div>
                    <div className="ds-icons__hint">{hint}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {showWebsite ? (
            <section aria-label="Website icons gallery">
              <div className="ds-icons__section-head">
                <h2 className="ds-icons__section-title">Website icons</h2>
                <p className="ds-icons__section-copy">
                  Shared UI icons used across chrome, forms, maps, and admin.
                </p>
              </div>
              <div className="ds-icons__grid" style={{ color: iconColor }}>
                {websiteTiles.map(({ key, name, hint, Icon }) => (
                  <div
                    key={key}
                    className="ds-icons__icon-tile"
                    title={`${name} · ${hint} · ${weightLabel} · ${colorLabel}`}
                    aria-label={`${name}, ${weightLabel}`}
                  >
                    <div className="ds-icons__icon">
                      <Icon size={28} weight={weight} color="currentColor" aria-hidden />
                    </div>
                    <div className="ds-icons__label">{name}</div>
                    <div className="ds-icons__hint">{hint}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default IconsPage
