'use client'

import React, { useState } from 'react'
import { BUTBaseButton as Button, BUTSquaredWideButton } from '@/components/buttons'
import { BackIcon } from '@/components/icons'
import { PageTopHeader } from '@/components/misc'
import './ColoursPage.css'

type TokenItem = {
  label: string
  token: string
}

const SURFACE_TOKENS: TokenItem[] = [
  { label: 'Background Primary', token: '--bg-primary' },
  { label: 'Background Secondary', token: '--bg-secondary' },
  { label: 'Background Tertiary', token: '--bg-tertiary' },
  { label: 'Background Quaternary', token: '--bg-quaternary' },
  { label: 'Background Quinary', token: '--bg-quinary' },
  { label: 'Background Table A', token: '--bg-table-a' },
  { label: 'Background Table B', token: '--bg-table-b' },
  { label: 'Background Hover (50% Quinary)', token: '--bg-hover' },
]

const TEXT_TOKENS: TokenItem[] = [
  { label: 'Text Primary', token: '--text-primary' },
  { label: 'Text Secondary', token: '--text-secondary' },
  { label: 'Text Disabled', token: '--text-disabled' },
]

const ACCENT_TOKENS: TokenItem[] = [
  { label: 'Accent Bright', token: '--accent-bright' },
  { label: 'Accent Strong', token: '--accent-strong' },
  { label: 'Accent Base', token: '--accent-base' },
  { label: 'Accent Deep', token: '--accent-deep' },
  { label: 'Accent Darkest', token: '--accent-darkest' },
]

const UI_COLOUR_TOKENS: TokenItem[] = [
  { label: 'Border Color', token: '--border-color' },
  { label: 'Accent Color (Alias)', token: '--accent-color' },
  { label: 'Accent Hover', token: '--accent-hover' },
  { label: 'Accent Pressed', token: '--accent-pressed' },
  { label: 'Accent Light', token: '--accent-light' },
]

const ALL_TOKENS = [...SURFACE_TOKENS, ...TEXT_TOKENS, ...ACCENT_TOKENS, ...UI_COLOUR_TOKENS]

const LIGHT_TOKEN_FILLS: Record<string, string> = {
  '--bg-primary': '#FCFCFC',
  '--bg-secondary': '#F0F0F0',
  '--bg-tertiary': '#E0E0E0',
  '--bg-quaternary': '#D9D9D9',
  '--bg-quinary': '#C7C7C7',
  '--bg-table-a': '#F2F2F2',
  '--bg-table-b': '#E8E8E8',
  '--bg-hover': 'color-mix(in srgb, #C7C7C7 50%, transparent)',
  '--text-primary': '#000000',
  '--text-secondary': '#404040',
  '--text-disabled': '#737373',
  '--accent-bright': '#E50000',
  '--accent-strong': '#CC0000',
  '--accent-base': '#B20016',
  '--accent-deep': '#990000',
  '--accent-darkest': '#7F0000',
  '--border-color': 'transparent',
  '--accent-color': '#B20016',
  '--accent-hover': '#000000',
  '--accent-pressed': '#990000',
  '--accent-light': '#F0F0F0',
}

const DARK_TOKEN_FILLS: Record<string, string> = {
  '--bg-primary': '#383838',
  '--bg-secondary': '#262626',
  '--bg-tertiary': '#1A1A1A',
  '--bg-quaternary': '#0D0D0D',
  '--bg-quinary': '#030303',
  '--bg-table-a': '#2E2E2E',
  '--bg-table-b': '#212121',
  '--bg-hover': 'color-mix(in srgb, #030303 50%, transparent)',
  '--text-primary': '#FFFFFF',
  '--text-secondary': '#BFBFBF',
  '--text-disabled': '#8C8C8C',
  '--accent-bright': '#E50000',
  '--accent-strong': '#CC0000',
  '--accent-base': '#B20016',
  '--accent-deep': '#990000',
  '--accent-darkest': '#7F0000',
  '--border-color': 'transparent',
  '--accent-color': '#B20016',
  '--accent-hover': '#FFFFFF',
  '--accent-pressed': '#990000',
  '--accent-light': '#262626',
}

type ColorVariant = 'primary' | 'secondary' | 'accent' | 'green-action' | 'red-action' | 'fav-action'

type StateValues = {
  bg: { hsl: string; hex: string }
  text: { hsl: string; hex: string }
}

type VariantToken = {
  id: ColorVariant
  label: string
  active: { light: StateValues; dark: StateValues }
  pressed: { light: StateValues; dark: StateValues }
  disabled: {
    light: StateValues
    dark: StateValues
  }
}

const formatHsbFromHex = (hex: string): string => {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return 'hsb(0 0% 0%)'

  const r = parseInt(normalized.slice(0, 2), 16) / 255
  const g = parseInt(normalized.slice(2, 4), 16) / 255
  const b = parseInt(normalized.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let hue = 0
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4
  }

  hue = Math.round(hue * 60)
  if (hue < 0) hue += 360

  const saturation = max === 0 ? 0 : Math.round((delta / max) * 100)
  const brightness = Math.round(max * 100)

  return `hsb(${hue} ${saturation}% ${brightness}%)`
}

const formatColorValues = (hsl: string, hex: string): string => `${hsl} / ${formatHsbFromHex(hex)} / ${hex}`

const VARIANT_TOKENS: VariantToken[] = [
  {
    id: 'primary',
    label: 'Primary',
    active: {
      light: { bg: { hsl: 'hsl(0 0% 99%)', hex: '#FCFCFC' }, text: { hsl: 'hsl(0 0% 0%)', hex: '#000000' } },
      dark: { bg: { hsl: 'hsl(0 0% 22%)', hex: '#383838' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
    },
    pressed: {
      light: { bg: { hsl: 'hsl(0 0% 88%)', hex: '#E0E0E0' }, text: { hsl: 'hsl(0 0% 0%)', hex: '#000000' } },
      dark: { bg: { hsl: 'hsl(0 0% 10%)', hex: '#1A1A1A' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
    },
    disabled: {
      light: {
        bg: { hsl: 'hsl(0 0% 88%)', hex: '#E0E0E0' },
        text: { hsl: 'hsl(0 0% 45%)', hex: '#737373' },
      },
      dark: {
        bg: { hsl: 'hsl(0 0% 10%)', hex: '#1A1A1A' },
        text: { hsl: 'hsl(0 0% 55%)', hex: '#8C8C8C' },
      },
    },
  },
  {
    id: 'secondary',
    label: 'Secondary',
    active: {
      light: { bg: { hsl: 'hsl(0 0% 5%)', hex: '#0D0D0D' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
      dark: { bg: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' }, text: { hsl: 'hsl(0 0% 0%)', hex: '#000000' } },
    },
    pressed: {
      light: { bg: { hsl: 'hsl(0 0% 20%)', hex: '#333333' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
      dark: { bg: { hsl: 'hsl(0 0% 89%)', hex: '#E3E3E3' }, text: { hsl: 'hsl(0 0% 0%)', hex: '#000000' } },
    },
    disabled: {
      light: {
        bg: { hsl: 'hsl(0 0% 20%)', hex: '#333333' },
        text: { hsl: 'hsl(0 0% 77%)', hex: '#C4C4C4' },
      },
      dark: {
        bg: { hsl: 'hsl(0 0% 89%)', hex: '#E3E3E3' },
        text: { hsl: 'hsl(0 0% 55%)', hex: '#8C8C8C' },
      },
    },
  },
  {
    id: 'accent',
    label: 'Accent',
    active: {
      light: { bg: { hsl: 'hsl(353 57% 48%)', hex: '#C03545' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
      dark: { bg: { hsl: 'hsl(353 100% 19%)', hex: '#61000B' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
    },
    pressed: {
      light: { bg: { hsl: 'hsl(353 57% 38%)', hex: '#982A37' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
      dark: { bg: { hsl: 'hsl(352 100% 12%)', hex: '#3D0008' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
    },
    disabled: {
      light: {
        bg: { hsl: 'hsl(353 57% 38%)', hex: '#982A37' },
        text: { hsl: 'hsl(0 0% 80%)', hex: '#CCCCCC' },
      },
      dark: {
        bg: { hsl: 'hsl(352 100% 12%)', hex: '#3D0008' },
        text: { hsl: 'hsl(0 0% 40%)', hex: '#666666' },
      },
    },
  },
  {
    id: 'green-action',
    label: 'Green Action',
    active: {
      light: { bg: { hsl: 'hsl(141 60% 40%)', hex: '#29A354' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
      dark: { bg: { hsl: 'hsl(141 100% 19%)', hex: '#006122' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
    },
    pressed: {
      light: { bg: { hsl: 'hsl(141 60% 35%)', hex: '#248F49' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
      dark: { bg: { hsl: 'hsl(141 100% 12%)', hex: '#003D15' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
    },
    disabled: {
      light: {
        bg: { hsl: 'hsl(141 60% 35%)', hex: '#248F49' },
        text: { hsl: 'hsl(0 0% 80%)', hex: '#CCCCCC' },
      },
      dark: {
        bg: { hsl: 'hsl(141 100% 12%)', hex: '#003D15' },
        text: { hsl: 'hsl(0 0% 40%)', hex: '#666666' },
      },
    },
  },
  {
    id: 'red-action',
    label: 'Red Action',
    active: {
      light: { bg: { hsl: 'hsl(0 68% 58%)', hex: '#DD4B4B' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
      dark: { bg: { hsl: 'hsl(359 100% 25%)', hex: '#800002' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
    },
    pressed: {
      light: { bg: { hsl: 'hsl(0 68% 48%)', hex: '#CE2727' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
      dark: { bg: { hsl: 'hsl(359 100% 17%)', hex: '#570001' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
    },
    disabled: {
      light: {
        bg: { hsl: 'hsl(0 68% 48%)', hex: '#CE2727' },
        text: { hsl: 'hsl(0 0% 80%)', hex: '#CCCCCC' },
      },
      dark: {
        bg: { hsl: 'hsl(359 100% 17%)', hex: '#570001' },
        text: { hsl: 'hsl(0 0% 40%)', hex: '#666666' },
      },
    },
  },
  {
    id: 'fav-action',
    label: 'Favourite',
    active: {
      light: { bg: { hsl: 'hsl(53 59% 60%)', hex: '#D6C85C' }, text: { hsl: 'hsl(0 0% 0%)', hex: '#000000' } },
      dark: { bg: { hsl: 'hsl(53 100% 24%)', hex: '#7A6C00' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
    },
    pressed: {
      light: { bg: { hsl: 'hsl(53 55% 50%)', hex: '#C6B539' }, text: { hsl: 'hsl(0 0% 0%)', hex: '#000000' } },
      dark: { bg: { hsl: 'hsl(53 100% 12%)', hex: '#3D3600' }, text: { hsl: 'hsl(0 0% 100%)', hex: '#FFFFFF' } },
    },
    disabled: {
      light: {
        bg: { hsl: 'hsl(53 55% 50%)', hex: '#C6B539' },
        text: { hsl: 'hsl(0 0% 35%)', hex: '#595959' },
      },
      dark: {
        bg: { hsl: 'hsl(53 100% 12%)', hex: '#3D3600' },
        text: { hsl: 'hsl(0 0% 40%)', hex: '#666666' },
      },
    },
  },
]

const BUTTON_VALUES_PROMPT = `Button colour values (all variants)

${VARIANT_TOKENS.map((token) => {
  return [
    `${token.label}`,
    `- Active`,
    `  - Light bg: ${formatColorValues(token.active.light.bg.hsl, token.active.light.bg.hex)}`,
    `  - Light text: ${formatColorValues(token.active.light.text.hsl, token.active.light.text.hex)}`,
    `  - Dark bg: ${formatColorValues(token.active.dark.bg.hsl, token.active.dark.bg.hex)}`,
    `  - Dark text: ${formatColorValues(token.active.dark.text.hsl, token.active.dark.text.hex)}`,
    `- Pressed`,
    `  - Light bg: ${formatColorValues(token.pressed.light.bg.hsl, token.pressed.light.bg.hex)}`,
    `  - Light text: ${formatColorValues(token.pressed.light.text.hsl, token.pressed.light.text.hex)}`,
    `  - Dark bg: ${formatColorValues(token.pressed.dark.bg.hsl, token.pressed.dark.bg.hex)}`,
    `  - Dark text: ${formatColorValues(token.pressed.dark.text.hsl, token.pressed.dark.text.hex)}`,
    `- Disabled`,
    `  - Light bg: ${formatColorValues(token.disabled.light.bg.hsl, token.disabled.light.bg.hex)}`,
    `  - Light text: ${formatColorValues(token.disabled.light.text.hsl, token.disabled.light.text.hex)}`,
    `  - Dark bg: ${formatColorValues(token.disabled.dark.bg.hsl, token.disabled.dark.bg.hex)}`,
    `  - Dark text: ${formatColorValues(token.disabled.dark.text.hsl, token.disabled.dark.text.hex)}`,
  ].join('\n')
}).join('\n\n')}`

const SITE_TEXT_COLOURS_PROMPT = `Site text colours

Light theme
- Primary text: hsl(0 0% 0%) / #000000
- Secondary text: hsl(0 0% 25%) / #404040
- Disabled text: hsl(0 0% 45%) / #737373

Dark theme
- Primary text: hsl(0 0% 100%) / #FFFFFF
- Secondary text: hsl(0 0% 75%) / #BFBFBF
- Disabled text: hsl(0 0% 55%) / #8C8C8C`

const SITE_COLOURS_PROMPT = `Site colour tokens

Light theme (true neutral, 5-step elevated → recessed ladder)
- Background primary: hsl(0 0% 99%) / #FCFCFC
- Background secondary: hsl(0 0% 94%) / #F0F0F0
- Background tertiary: hsl(0 0% 88%) / #E0E0E0
- Background quaternary: hsl(0 0% 85%) / #D9D9D9
- Background quinary: hsl(0 0% 78%) / #C7C7C7
- Background table A: hsl(0 0% 95%) / #F2F2F2
- Background table B: hsl(0 0% 91%) / #E8E8E8
- Accent bright: #E50000
- Accent strong: #CC0000
- Accent base: #B20016
- Accent deep: #990000
- Accent darkest: #7F0000

Dark theme (true neutral, paired ladder to light)
- Background primary: hsl(0 0% 22%) / #383838
- Background secondary: hsl(0 0% 15%) / #262626
- Background tertiary: hsl(0 0% 10%) / #1A1A1A
- Background quaternary: hsl(0 0% 5%) / #0D0D0D
- Background quinary: hsl(0 0% 1%) / #030303
- Background table A: hsl(0 0% 18%) / #2E2E2E
- Background table B: hsl(0 0% 13%) / #212121
- Accent bright: #E50000
- Accent strong: #CC0000
- Accent base: #B20016
- Accent deep: #990000
- Accent darkest: #7F0000`

type SurfaceStepKey = 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary'

type SurfaceStep = {
  key: SurfaceStepKey
  label: string
  hsl: string
  hex: string
}

type SurfaceNeutralOption = {
  id: string
  label: string
  note: string
  badge?: string
  steps: SurfaceStep[]
  text: string
  textSecondary: string
}

const step = (key: SurfaceStepKey, label: string, hsl: string, hex: string): SurfaceStep => ({
  key,
  label,
  hsl,
  hex,
})

/** Live palette + previous (kept) + other candidates for comparison. */
const SURFACE_LIVE: SurfaceNeutralOption[] = [
  {
    id: 'true-neutral-light',
    label: 'True Neutral · Light',
    note: 'Live — no colour cast, near-white primary',
    badge: 'Live',
    steps: [
      step('primary', 'Primary', 'hsl(0 0% 99%)', '#FCFCFC'),
      step('secondary', 'Secondary', 'hsl(0 0% 94%)', '#F0F0F0'),
      step('tertiary', 'Tertiary', 'hsl(0 0% 88%)', '#E0E0E0'),
      step('quaternary', 'Quaternary', 'hsl(0 0% 85%)', '#D9D9D9'),
      step('quinary', 'Quinary', 'hsl(0 0% 78%)', '#C7C7C7'),
    ],
    text: '#000000',
    textSecondary: 'hsl(0 0% 25%)',
  },
  {
    id: 'true-neutral-dark',
    label: 'True Neutral · Dark',
    note: 'Live — paired ladder to light',
    badge: 'Live',
    steps: [
      step('primary', 'Primary', 'hsl(0 0% 22%)', '#383838'),
      step('secondary', 'Secondary', 'hsl(0 0% 15%)', '#262626'),
      step('tertiary', 'Tertiary', 'hsl(0 0% 10%)', '#1A1A1A'),
      step('quaternary', 'Quaternary', 'hsl(0 0% 5%)', '#0D0D0D'),
      step('quinary', 'Quinary', 'hsl(0 0% 1%)', '#030303'),
    ],
    text: '#ffffff',
    textSecondary: 'hsl(0 0% 75%)',
  },
]

const SURFACE_PREVIOUS: SurfaceNeutralOption[] = [
  {
    id: 'previous-cool-light',
    label: 'Previous Cool · Light',
    note: 'Kept — original cool blue-gray (hsl 210 14%). CSS: --bg-*-previous',
    badge: 'Previous',
    steps: [
      step('primary', 'Primary', 'hsl(210 14% 99%)', '#FCFCFD'),
      step('secondary', 'Secondary', 'hsl(210 14% 90%)', '#E2E6E9'),
      step('tertiary', 'Tertiary', 'hsl(210 14% 80%)', '#C5CCD3'),
      step('quaternary', 'Quaternary', 'hsl(210 14% 72%)', '#AEB8C2'),
      step('quinary', 'Quinary', 'hsl(210 14% 61%)', '#8E9CA9'),
    ],
    text: '#000000',
    textSecondary: 'hsl(0 0% 25%)',
  },
  {
    id: 'previous-cool-dark',
    label: 'Previous Cool · Dark',
    note: 'Kept — original cool blue-gray. CSS: --bg-*-previous',
    badge: 'Previous',
    steps: [
      step('primary', 'Primary', 'hsl(210 14% 20%)', '#2C333A'),
      step('secondary', 'Secondary', 'hsl(210 14% 12%)', '#1A1F23'),
      step('tertiary', 'Tertiary', 'hsl(210 14% 8%)', '#121417'),
      step('quaternary', 'Quaternary', 'hsl(210 14% 4%)', '#090A0C'),
      step('quinary', 'Quinary', 'hsl(210 14% 2%)', '#040506'),
    ],
    text: '#ffffff',
    textSecondary: 'hsl(0 0% 75%)',
  },
]

const SURFACE_ALTERNATIVES: SurfaceNeutralOption[] = [
  {
    id: 'zinc-cool-light',
    label: 'Zinc Cool · Light',
    note: 'Alternative — whisper of blue-violet',
    steps: [
      step('primary', 'Primary', 'hsl(240 2% 99%)', '#FCFCFD'),
      step('secondary', 'Secondary', 'hsl(240 2% 96%)', '#F5F5F5'),
      step('tertiary', 'Tertiary', 'hsl(240 2% 92%)', '#EAEAEB'),
      step('quaternary', 'Quaternary', 'hsl(240 2% 86%)', '#DBDBDC'),
      step('quinary', 'Quinary', 'hsl(240 2% 79%)', '#C8C8CB'),
    ],
    text: '#000000',
    textSecondary: 'hsl(0 0% 25%)',
  },
  {
    id: 'zinc-cool-dark',
    label: 'Zinc Cool · Dark',
    note: 'Alternative — whisper of blue-violet charcoal',
    steps: [
      step('primary', 'Primary', 'hsl(240 3% 26%)', '#404044'),
      step('secondary', 'Secondary', 'hsl(240 3% 19%)', '#2F2F32'),
      step('tertiary', 'Tertiary', 'hsl(240 3% 13%)', '#202022'),
      step('quaternary', 'Quaternary', 'hsl(240 3% 8%)', '#141415'),
      step('quinary', 'Quinary', 'hsl(240 3% 3%)', '#070708'),
    ],
    text: '#ffffff',
    textSecondary: 'hsl(0 0% 75%)',
  },
  {
    id: 'graphite-light',
    label: 'Graphite · Light',
    note: 'Alternative — slightly deeper midtones',
    steps: [
      step('primary', 'Primary', 'hsl(0 0% 99%)', '#FCFCFC'),
      step('secondary', 'Secondary', 'hsl(0 0% 95%)', '#F2F2F2'),
      step('tertiary', 'Tertiary', 'hsl(0 0% 90%)', '#E6E6E6'),
      step('quaternary', 'Quaternary', 'hsl(0 0% 84%)', '#D6D6D6'),
      step('quinary', 'Quinary', 'hsl(0 0% 76%)', '#C2C2C2'),
    ],
    text: '#000000',
    textSecondary: 'hsl(0 0% 25%)',
  },
  {
    id: 'graphite-dark',
    label: 'Graphite · Dark',
    note: 'Alternative — deeper charcoal',
    steps: [
      step('primary', 'Primary', 'hsl(0 0% 24%)', '#3D3D3D'),
      step('secondary', 'Secondary', 'hsl(0 0% 17%)', '#2B2B2B'),
      step('tertiary', 'Tertiary', 'hsl(0 0% 11%)', '#1C1C1C'),
      step('quaternary', 'Quaternary', 'hsl(0 0% 6%)', '#0F0F0F'),
      step('quinary', 'Quinary', 'hsl(0 0% 2%)', '#050505'),
    ],
    text: '#ffffff',
    textSecondary: 'hsl(0 0% 75%)',
  },
]

const SurfaceNeutralPreview: React.FC<{ option: SurfaceNeutralOption }> = ({ option }) => {
  const byKey = Object.fromEntries(option.steps.map((s) => [s.key, s])) as Record<SurfaceStepKey, SurfaceStep>

  return (
    <article
      className={[
        'ds-colours__neutral-card',
        option.badge === 'Live' ? 'ds-colours__neutral-card--live' : '',
        option.badge === 'Previous' ? 'ds-colours__neutral-card--previous' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        {
          '--preview-primary': byKey.primary.hsl,
          '--preview-secondary': byKey.secondary.hsl,
          '--preview-tertiary': byKey.tertiary.hsl,
          '--preview-quaternary': byKey.quaternary.hsl,
          '--preview-quinary': byKey.quinary.hsl,
          '--preview-text': option.text,
          '--preview-text-secondary': option.textSecondary,
        } as React.CSSProperties
      }
    >
      <header className="ds-colours__neutral-card-head">
        <div className="ds-colours__neutral-card-title-row">
          <h3>{option.label}</h3>
          {option.badge ? (
            <span
              className={`ds-colours__neutral-badge${
                option.badge === 'Previous' ? ' ds-colours__neutral-badge--previous' : ''
              }`}
            >
              {option.badge}
            </span>
          ) : null}
        </div>
        <p>{option.note}</p>
      </header>

      <div className="ds-colours__neutral-ladder" aria-hidden="true">
        {option.steps.map((s) => (
          <div key={s.key} className="ds-colours__neutral-ladder-step">
            <span className="ds-colours__neutral-ladder-swatch" style={{ background: s.hsl }} />
            <span className="ds-colours__neutral-ladder-label">{s.label}</span>
            <span className="ds-colours__neutral-ladder-hex">{s.hex}</span>
          </div>
        ))}
      </div>

      <div className="ds-colours__neutral-stage" aria-hidden="true">
        <div className="ds-colours__neutral-layer ds-colours__neutral-layer--quinary">
          <span className="ds-colours__neutral-layer-tag">Quinary</span>
          <div className="ds-colours__neutral-layer ds-colours__neutral-layer--quaternary">
            <span className="ds-colours__neutral-layer-tag">Quaternary</span>
            <div className="ds-colours__neutral-layer ds-colours__neutral-layer--tertiary">
              <span className="ds-colours__neutral-layer-tag">Tertiary page</span>
              <div className="ds-colours__neutral-panel">
                <div className="ds-colours__neutral-chrome">Primary chrome</div>
                <div className="ds-colours__neutral-surface">
                  <div className="ds-colours__neutral-card-surface">
                    <span className="ds-colours__neutral-card-title">Secondary panel</span>
                    <span className="ds-colours__neutral-card-meta">
                      Nested over tertiary, with Q/Quin behind for deeper contrast
                    </span>
                    <span className="ds-colours__neutral-accent">Accent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ds-colours__value-block">
        {option.steps.map((s) => (
          <div key={s.key}>
            <strong>{s.label}</strong> {s.hsl} / {s.hex}
          </div>
        ))}
        <div><strong>Accent</strong> #B20016</div>
      </div>
    </article>
  )
}

const StateColorChips: React.FC<{ values: { light: StateValues; dark: StateValues } }> = ({ values }) => (
  <div className="ds-colours__chip-grid">
    <div className="ds-colours__chip">
      <span className="ds-colours__chip-label">Light bg</span>
      <span className="ds-colours__chip-swatch" style={{ backgroundColor: values.light.bg.hex }} aria-hidden="true" />
    </div>
    <div className="ds-colours__chip">
      <span className="ds-colours__chip-label">Light text</span>
      <span className="ds-colours__chip-swatch" style={{ backgroundColor: values.light.text.hex }} aria-hidden="true" />
    </div>
    <div className="ds-colours__chip">
      <span className="ds-colours__chip-label">Dark bg</span>
      <span className="ds-colours__chip-swatch" style={{ backgroundColor: values.dark.bg.hex }} aria-hidden="true" />
    </div>
    <div className="ds-colours__chip">
      <span className="ds-colours__chip-label">Dark text</span>
      <span className="ds-colours__chip-swatch" style={{ backgroundColor: values.dark.text.hex }} aria-hidden="true" />
    </div>
  </div>
)

const ColoursPage: React.FC = () => {
  const [selectedToken, setSelectedToken] = useState<TokenItem>(ALL_TOKENS[0])
  const lightFill = LIGHT_TOKEN_FILLS[selectedToken.token] ?? '#000000'
  const darkFill = DARK_TOKEN_FILLS[selectedToken.token] ?? '#000000'
  const lightPreviewBg =
    selectedToken.token === '--bg-tertiary' ||
    selectedToken.token === '--bg-quaternary' ||
    selectedToken.token === '--bg-quinary' ||
    selectedToken.token === '--bg-table-b' ||
    selectedToken.token === '--bg-hover'
      ? LIGHT_TOKEN_FILLS['--bg-primary']
      : undefined
  const darkPreviewBg =
    selectedToken.token === '--bg-tertiary' ||
    selectedToken.token === '--bg-quaternary' ||
    selectedToken.token === '--bg-quinary' ||
    selectedToken.token === '--bg-table-b' ||
    selectedToken.token === '--bg-hover'
      ? DARK_TOKEN_FILLS['--bg-primary']
      : undefined

  return (
    <div className="ds-colours-page">
      <PageTopHeader
        title="Colours"
        subtitle="Reference for colour tokens used by surfaces, text, and interactive UI states."
        actionButton={{
          to: '/admin/design-system',
          label: 'Back',
          mode: 'iconText',
          iconPosition: 'left',
          icon: <BackIcon />,
        }}
      />
      <div className="container container--full-bleed">
        <div className="ds-colours">
          <section className="ds-colours__section-panel">
            <h2>Surface neutrals — Live</h2>
            <p className="ds-colours__hint">
              Site is on <strong>True Neutral</strong> (5-step). Light and dark use the paired ladder below.
            </p>
            <div className="ds-colours__neutral-grid">
              {SURFACE_LIVE.map((option) => (
                <SurfaceNeutralPreview key={option.id} option={option} />
              ))}
            </div>
          </section>

          <section className="ds-colours__section-panel">
            <h2>Surface neutrals — Previous (kept)</h2>
            <p className="ds-colours__hint">
              Original cool blue-gray ladder retained as <code>--bg-*-previous</code> in{' '}
              <code>globals.css</code> for reference or rollback — not used by the UI.
            </p>
            <div className="ds-colours__neutral-grid">
              {SURFACE_PREVIOUS.map((option) => (
                <SurfaceNeutralPreview key={option.id} option={option} />
              ))}
            </div>
          </section>

          <section className="ds-colours__section-panel">
            <h2>Surface neutrals — Alternatives</h2>
            <p className="ds-colours__hint">Other directions kept for comparison only.</p>
            <div className="ds-colours__neutral-grid">
              {SURFACE_ALTERNATIVES.map((option) => (
                <SurfaceNeutralPreview key={option.id} option={option} />
              ))}
            </div>
          </section>

          <section className="ds-colours__section-panel ds-colours__section-panel--comparison">
            <h2>Token Light vs Dark Comparison</h2>
            <p className="ds-colours__hint">
              Pick a token on the left and compare its light/dark rendering on the right.
            </p>
            <div className="ds-colours__token-compare-layout">
              <div className="ds-colours__token-list">
                {ALL_TOKENS.map((item) => (
                  <BUTSquaredWideButton
                    key={item.token}
                    width="fill"
                    colorVariant="primary"
                    pressed={selectedToken.token === item.token}
                    onClick={() => setSelectedToken(item)}
                    className="ds-colours__token-button"
                  >
                    {item.label}
                  </BUTSquaredWideButton>
                ))}
              </div>

              <div className="ds-colours__token-preview-panel">
                <div className="ds-colours__token-preview-head">
                  <h3>{selectedToken.label}</h3>
                  <p>{selectedToken.token}</p>
                </div>

                <div className="ds-colours__theme-compare">
                  <div className="ds-colours__theme-column">
                    <h3 className="ds-colours__theme-column-title">Light Theme</h3>
                    <div className="ds-colours__theme-preview" style={{ backgroundColor: lightPreviewBg }}>
                      <div
                        className="ds-colours__single-swatch"
                        style={{ backgroundColor: lightFill }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <div className="ds-colours__theme-column">
                    <h3 className="ds-colours__theme-column-title">Dark Theme</h3>
                    <div className="ds-colours__theme-preview" style={{ backgroundColor: darkPreviewBg }}>
                      <div
                        className="ds-colours__single-swatch"
                        style={{ backgroundColor: darkFill }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="ds-colours__section-panel">
            <h2>Button States + Values</h2>
            <p className="ds-colours__hint">
              Each state shows the button plus light/dark HSL, HSB, and HEX values for background and text.
            </p>
            <div className="ds-colours__matrix">
              {VARIANT_TOKENS.map((token) => (
                <article key={token.id} className="ds-colours__card">
                  <h3 className="ds-colours__matrix-title">{token.label}</h3>
                  <div className="ds-colours__state-detail-grid">
                    <div className="ds-colours__state-detail">
                      <div className="ds-colours__state-detail-title">Active</div>
                      <Button variant="wide" width="hug" colorVariant={token.id}>
                        Active
                      </Button>
                      <StateColorChips values={token.active} />
                      <div className="ds-colours__value-block">
                        <div><strong>Light bg</strong> {formatColorValues(token.active.light.bg.hsl, token.active.light.bg.hex)}</div>
                        <div><strong>Light text</strong> {formatColorValues(token.active.light.text.hsl, token.active.light.text.hex)}</div>
                        <div><strong>Dark bg</strong> {formatColorValues(token.active.dark.bg.hsl, token.active.dark.bg.hex)}</div>
                        <div><strong>Dark text</strong> {formatColorValues(token.active.dark.text.hsl, token.active.dark.text.hex)}</div>
                      </div>
                    </div>
                    <div className="ds-colours__state-detail">
                      <div className="ds-colours__state-detail-title">Pressed</div>
                      <Button variant="wide" width="hug" colorVariant={token.id} pressed>
                        Pressed
                      </Button>
                      <StateColorChips values={token.pressed} />
                      <div className="ds-colours__value-block">
                        <div><strong>Light bg</strong> {formatColorValues(token.pressed.light.bg.hsl, token.pressed.light.bg.hex)}</div>
                        <div><strong>Light text</strong> {formatColorValues(token.pressed.light.text.hsl, token.pressed.light.text.hex)}</div>
                        <div><strong>Dark bg</strong> {formatColorValues(token.pressed.dark.bg.hsl, token.pressed.dark.bg.hex)}</div>
                        <div><strong>Dark text</strong> {formatColorValues(token.pressed.dark.text.hsl, token.pressed.dark.text.hex)}</div>
                      </div>
                    </div>
                    <div className="ds-colours__state-detail">
                      <div className="ds-colours__state-detail-title">Disabled</div>
                      <Button variant="wide" width="hug" colorVariant={token.id} disabled>
                        Disabled
                      </Button>
                      <StateColorChips values={token.disabled} />
                      <div className="ds-colours__value-block">
                        <div><strong>Light bg</strong> {formatColorValues(token.disabled.light.bg.hsl, token.disabled.light.bg.hex)}</div>
                        <div><strong>Light text</strong> {formatColorValues(token.disabled.light.text.hsl, token.disabled.light.text.hex)}</div>
                        <div><strong>Dark bg</strong> {formatColorValues(token.disabled.dark.bg.hsl, token.disabled.dark.bg.hex)}</div>
                        <div><strong>Dark text</strong> {formatColorValues(token.disabled.dark.text.hsl, token.disabled.dark.text.hex)}</div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="ds-colours__section-panel">
            <h2>Copy Prompt</h2>
            <p className="ds-colours__hint">Copy this text block to share all button colour values.</p>
            <textarea className="ds-colours__prompt-textarea" value={BUTTON_VALUES_PROMPT} readOnly />
          </section>

          <section className="ds-colours__section-panel">
            <h2>Copy Prompt: Site Text Colours</h2>
            <p className="ds-colours__hint">Copy this text block for the site text colour tokens.</p>
            <textarea className="ds-colours__prompt-textarea" value={SITE_TEXT_COLOURS_PROMPT} readOnly />
          </section>

          <section className="ds-colours__section-panel">
            <h2>Copy Prompt: Site Colours</h2>
            <p className="ds-colours__hint">Copy this text block for the site background and accent colour tokens.</p>
            <textarea className="ds-colours__prompt-textarea" value={SITE_COLOURS_PROMPT} readOnly />
          </section>
        </div>
      </div>
    </div>
  )
}

export default ColoursPage

