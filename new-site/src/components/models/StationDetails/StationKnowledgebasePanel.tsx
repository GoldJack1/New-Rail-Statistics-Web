'use client'

import React, { useEffect, useState } from 'react'
import { Note } from '@phosphor-icons/react'
import type { KbJson } from '../../../utils/knowledgebaseStationXml'
import {
  FACILITIES_STAFFING_KEY,
  KNOWLEDGEBASE_OVERVIEW_KEY,
  humanizeKnowledgebaseKey,
} from '../../../utils/knowledgebaseStationSections'
import { getKnowledgebaseSectionIcon, getStationDetailFieldIcon } from '../../../utils/stationDetailFieldIcons'
import { StationSectionTitle } from './StationSectionTitle'
import './StationKnowledgebasePanel.css'

function decodeBasicEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

/** Convert KB HTML notes into readable plain text, keeping paragraph / list structure. */
function htmlToReadableText(input: string): string {
  let text = decodeBasicEntities(input)
  text = text.replace(/\r\n?/g, '\n')
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<\/h[1-6]>/gi, '\n\n')
  text = text.replace(/<\/li>/gi, '\n')
  text = text.replace(/<li[^>]*>/gi, '• ')
  text = text.replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
  text = text.replace(/<\/?(strong|b|em|i|u|span|a)[^>]*>/gi, '')
  text = text.replace(/<[^>]+>/g, '')
  text = text.replace(/[ \t]+\n/g, '\n')
  text = text.replace(/\n[ \t]+/g, '\n')
  text = text.replace(/[ \t]{2,}/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')
  // "Label:Item" after stripping tags → "Label: Item"
  text = text.replace(/([^\s]):([^\s])/g, '$1: $2')
  return text.trim()
}

function stripHtml(input: string): string {
  return htmlToReadableText(input).replace(/\s+/g, ' ').trim()
}

function noteTextFromString(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (trimmed.includes('<') && trimmed.includes('>')) return htmlToReadableText(trimmed)
  return trimmed
}

function isPlainObject(value: KbJson): value is { [key: string]: KbJson } {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function formatScalar(value: string | number | boolean | null): string {
  if (value === null) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return '—'
    if (trimmed.includes('<') && trimmed.includes('>')) return stripHtml(trimmed) || '—'
    // Camel / camelCase enums like fullTime → Full time
    if (/^[a-z]+[A-Z]/.test(trimmed) && !trimmed.includes(' ')) {
      return humanizeKnowledgebaseKey(trimmed)
    }
    return trimmed
  }
  return String(value)
}

function collectNotes(value: KbJson, out: string[] = []): string[] {
  if (typeof value === 'string') {
    const text = noteTextFromString(value)
    if (text) out.push(text)
    return out
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectNotes(item, out))
    return out
  }
  if (!isPlainObject(value)) return out
  for (const [key, child] of Object.entries(value)) {
    if (key === 'Note' || key === '#text') collectNotes(child, out)
    else if (isPlainObject(child) || Array.isArray(child)) collectNotes(child, out)
  }
  return out
}

function formatDayTypes(dayTypes: KbJson): string {
  if (!isPlainObject(dayTypes)) return ''
  const days: string[] = []
  for (const [key, value] of Object.entries(dayTypes)) {
    if (value === true || value === 'true') days.push(humanizeKnowledgebaseKey(key))
  }
  return days.join(', ')
}

function formatOpenHours(open: KbJson): string | null {
  if (!isPlainObject(open)) return null
  const blocks = open.DayAndTimeAvailability
  const list = Array.isArray(blocks) ? blocks : blocks != null ? [blocks] : []
  const lines: string[] = []
  for (const block of list) {
    if (!isPlainObject(block)) continue
    const days = formatDayTypes(block.DayTypes)
    const hours = block.OpeningHours
    if (isPlainObject(hours) && (hours.TwentyFourHours === true || hours.TwentyFourHours === 'true')) {
      lines.push(days ? `${days}: 24 hours` : '24 hours')
      continue
    }
    const periods =
      isPlainObject(hours) && hours.OpenPeriod != null
        ? Array.isArray(hours.OpenPeriod)
          ? hours.OpenPeriod
          : [hours.OpenPeriod]
        : []
    const times = periods
      .map((period) => {
        if (!isPlainObject(period)) return null
        const start = typeof period.StartTime === 'string' ? period.StartTime.slice(0, 5) : null
        const end = typeof period.EndTime === 'string' ? period.EndTime.slice(0, 5) : null
        if (start && end) return `${start}–${end}`
        return null
      })
      .filter(Boolean)
    if (days && times.length) lines.push(`${days}: ${times.join(', ')}`)
    else if (times.length) lines.push(times.join(', '))
    else if (days) lines.push(days)
  }
  return lines.length ? lines.join('\n') : null
}

type FacilityDisplay = { value: string; notes: string[]; location?: string | null }
type FacilityRow = {
  label: string
  value: string
  notes: string[]
  iconKey?: string
  location?: string | null
}

function uniqueNotes(notes: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const note of notes) {
    const trimmed = note.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

/** Pull standalone "Location: …" blocks/lines out of note text. */
function pullLocationFromNoteText(text: string): { text: string; location: string | null } {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
  const locations: string[] = []
  const keptBlocks: string[] = []

  for (const block of blocks) {
    const whole = block.match(/^Location:\s*(.+)$/is)
    if (whole) {
      const loc = whole[1].replace(/\s+/g, ' ').trim()
      if (loc) locations.push(loc)
      continue
    }

    const lines = block.split('\n')
    const keptLines: string[] = []
    for (const line of lines) {
      const lineMatch = line.match(/^\s*Location:\s*(.+)\s*$/i)
      if (lineMatch) {
        const loc = lineMatch[1].replace(/\s+/g, ' ').trim()
        if (loc) locations.push(loc)
        continue
      }
      keptLines.push(line)
    }
    const kept = keptLines.join('\n').trim()
    if (kept) keptBlocks.push(kept)
  }

  return {
    text: keptBlocks.join('\n\n').trim(),
    location: locations.length ? locations.join('; ') : null,
  }
}

function locationTextFromNode(node: KbJson): string | null {
  const rawNotes: string[] = []
  collectNotes(node, rawNotes)
  const joined = uniqueNotes(rawNotes).join('\n\n').trim()
  if (!joined) return null
  const pulled = pullLocationFromNoteText(
    /^Location:\s*/i.test(joined) ? joined : `Location: ${joined}`
  )
  return pulled.location || joined.replace(/^Location:\s*/i, '').trim() || null
}

function mergeLocations(...values: Array<string | null | undefined>): string | null {
  const parts = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
  if (parts.length === 0) return null
  return uniqueNotes(parts).join('; ')
}

/** Flatten a facility node into a compact value + separate notes for the overlay. */
function summarizeFacilityValue(value: KbJson): FacilityDisplay {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return { value: formatScalar(value), notes: [], location: null }
  }
  if (Array.isArray(value)) {
    const notes: string[] = []
    const locations: string[] = []
    const parts = value
      .map((item, index) => {
        const summary = summarizeFacilityValue(item)
        notes.push(...summary.notes)
        if (summary.location) locations.push(summary.location)
        if (!summary.value || summary.value === '—') return null
        if (isPlainObject(item) && value.length > 1) {
          return `${index + 1}. ${summary.value}`
        }
        return summary.value
      })
      .filter(Boolean)
    return {
      value: parts.join('\n\n') || '—',
      notes: uniqueNotes(notes),
      location: mergeLocations(...locations),
    }
  }
  if (!isPlainObject(value)) return { value: '—', notes: [], location: null }

  const parts: string[] = []
  const notes: string[] = []
  let location: string | null = null

  if ('Available' in value) {
    parts.push(formatScalar(value.Available as string | number | boolean | null))
  }
  if ('Coverage' in value) {
    parts.push(`Coverage: ${formatScalar(value.Coverage as string | number | boolean | null)}`)
  }
  if (typeof value.Url === 'string' && value.Url.trim()) {
    parts.push(value.Url.trim())
  }
  if (isPlainObject(value.PrimaryTelephoneNumber)) {
    const tel = value.PrimaryTelephoneNumber.TelNationalNumber
    if (typeof tel === 'string' && tel.trim()) parts.push(tel.trim())
  }

  const hours = formatOpenHours(value.Open)
  if (hours) parts.push(hours)

  if (isPlainObject(value.ContactDetails)) {
    const contactSummary = summarizeFacilityValue(value.ContactDetails)
    if (contactSummary.value && contactSummary.value !== '—') parts.push(contactSummary.value)
    notes.push(...contactSummary.notes)
    location = mergeLocations(location, contactSummary.location)
  }

  if (value.Location != null) {
    location = mergeLocations(location, locationTextFromNode(value.Location))
  }

  const annotationNotes: string[] = []
  if (value.Annotation != null) collectNotes(value.Annotation, annotationNotes)
  if (typeof value.Note === 'string') {
    const text = noteTextFromString(value.Note)
    if (text) annotationNotes.push(text)
  }
  for (const rawNote of uniqueNotes(annotationNotes)) {
    const pulled = pullLocationFromNoteText(rawNote)
    location = mergeLocations(location, pulled.location)
    if (pulled.text) notes.push(pulled.text)
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      key === 'Available' ||
      key === 'Open' ||
      key === 'Annotation' ||
      key === 'Location' ||
      key === 'ContactDetails' ||
      key === 'PrimaryTelephoneNumber' ||
      key === 'Coverage' ||
      key === 'Url' ||
      key === 'PostalAddress' ||
      key === 'Note' ||
      key === '#text'
    ) {
      continue
    }
    if (typeof child === 'string' && (key.endsWith('Note') || key.endsWith('Comments'))) {
      const pulled = pullLocationFromNoteText(noteTextFromString(child))
      location = mergeLocations(location, pulled.location)
      if (pulled.text) notes.push(pulled.text)
      continue
    }
    if (child === null || typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean') {
      parts.push(`${humanizeKnowledgebaseKey(key)}: ${formatScalar(child)}`)
      continue
    }
    if (isPlainObject(child) || Array.isArray(child)) {
      const nested = summarizeFacilityValue(child)
      notes.push(...nested.notes)
      location = mergeLocations(location, nested.location)
      if (nested.value && nested.value !== '—') {
        if (!nested.value.includes('\n') && !nested.value.includes(': ')) {
          parts.push(`${humanizeKnowledgebaseKey(key)}: ${nested.value}`)
        } else {
          parts.push(`${humanizeKnowledgebaseKey(key)}\n${nested.value}`)
        }
      }
    }
  }

  return {
    value: parts.filter(Boolean).join('\n') || '—',
    notes: uniqueNotes(notes),
    location,
  }
}

function NoteContent({ text }: { text: string }) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  return (
    <div className="kb-note-overlay__blocks">
      {blocks.map((block, index) => {
        const lines = block
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
        const isList = lines.length > 0 && lines.every((line) => line.startsWith('• '))
        if (isList) {
          return (
            <ul key={index} className="kb-note-overlay__list">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{line.replace(/^•\s*/, '')}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={index} className="kb-note-overlay__paragraph">
            {lines.join('\n')}
          </p>
        )
      })}
    </div>
  )
}

function KbNoteOverlay({
  title,
  notes,
  onClose,
}: {
  title: string
  notes: string[]
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      className="kb-note-overlay__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} notes`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="kb-note-overlay">
        <header className="kb-note-overlay__header">
          <h2 className="kb-note-overlay__title">{title}</h2>
          <button type="button" className="kb-note-overlay__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="kb-note-overlay__body">
          {notes.map((note, index) => (
            <section key={index} className="kb-note-overlay__section">
              {notes.length > 1 ? (
                <h3 className="kb-note-overlay__section-title">
                  Note {index + 1} of {notes.length}
                </h3>
              ) : null}
              <NoteContent text={note} />
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function isShortFacilityText(text: string | null | undefined): boolean {
  if (!text) return true
  const trimmed = text.trim()
  if (!trimmed) return true
  const normalized = trimmed.toLowerCase()
  if (
    normalized === 'yes' ||
    normalized === 'no' ||
    normalized === '—' ||
    normalized === '---' ||
    normalized === '…' ||
    normalized === '...' ||
    normalized === 'exists: yes' ||
    normalized === 'exists: no' ||
    normalized === 'true' ||
    normalized === 'false'
  ) {
    return true
  }
  // Single short line without paragraph breaks
  if (!trimmed.includes('\n') && trimmed.length <= 32) return true
  return false
}

function getFacilityItemLayoutClass(value: string, location?: string | null): string {
  const locationText = location?.trim() || ''
  const valueShort = isShortFacilityText(value)
  const locationShort = isShortFacilityText(locationText)
  // Short yes/no (+ short/absent location) pack two-up; everything else gets its own row.
  if (valueShort && locationShort) return 'kb-facility-item--short'
  return 'kb-facility-item--full'
}

function KbDetailField({
  label,
  value,
  notes = [],
  iconKey,
  location,
}: {
  label: string
  value: string
  notes?: string[]
  iconKey?: string
  location?: string | null
}) {
  const [openNoteIndex, setOpenNoteIndex] = useState<number | null>(null)
  const IconComponent = getStationDetailFieldIcon(iconKey ?? label)
  const openNote = openNoteIndex != null ? notes[openNoteIndex] : null
  const locationText = location?.trim() || null
  const layoutClass = getFacilityItemLayoutClass(value, locationText)

  return (
    <div className={`modal-detail-item kb-detail-item kb-facility-item ${layoutClass}`}>
      <div className="kb-detail-label-row">
        {IconComponent ? (
          <IconComponent className="modal-detail-field-icon" size={16} weight="regular" aria-hidden />
        ) : null}
        <span className="modal-detail-label">{label}</span>
        {notes.length > 0 ? (
          <span className="kb-note-triggers" role="group" aria-label={`Notes for ${label}`}>
            {notes.map((_, index) => (
              <button
                key={index}
                type="button"
                className="kb-note-trigger"
                onClick={() => setOpenNoteIndex(index)}
                aria-label={
                  notes.length > 1
                    ? `View note ${index + 1} of ${notes.length} for ${label}`
                    : `View note for ${label}`
                }
                aria-haspopup="dialog"
                title={notes.length > 1 ? `Note ${index + 1}` : 'View note'}
              >
                <Note size={14} weight="regular" aria-hidden />
              </button>
            ))}
          </span>
        ) : null}
      </div>
      <span className="modal-detail-value kb-detail-multiline">{value}</span>
      {locationText ? (
        <p className="kb-facility-location">
          <span className="kb-facility-location__label">Location</span>
          <span className="kb-facility-location__value">{locationText}</span>
        </p>
      ) : null}
      {openNote != null ? (
        <KbNoteOverlay
          title={notes.length > 1 ? `${label} · Note ${openNoteIndex! + 1}` : label}
          notes={[openNote]}
          onClose={() => setOpenNoteIndex(null)}
        />
      ) : null}
    </div>
  )
}

function detailsRowsFromObject(value: KbJson): FacilityRow[] {
  if (!isPlainObject(value)) {
    const display = summarizeFacilityValue(value)
    return [
      {
        label: 'Value',
        value: display.value,
        notes: display.notes,
        location: display.location,
      },
    ]
  }
  return Object.entries(value)
    .filter(([key]) => key !== '#text')
    .map(([key, child]) => {
      const display = summarizeFacilityValue(child)
      return {
        label: humanizeKnowledgebaseKey(key),
        value: display.value,
        notes: display.notes,
        iconKey: key,
        location: display.location,
      }
    })
}

function KbNode({ label, value, depth = 0 }: { label?: string; value: KbJson; depth?: number }) {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return (
      <div className="kb-field">
        {label ? <span className="kb-field__label">{humanizeKnowledgebaseKey(label)}</span> : null}
        <span className="kb-field__value">{formatScalar(value)}</span>
      </div>
    )
  }

  if (Array.isArray(value)) {
    return (
      <div className="kb-group">
        {label ? <h4 className="kb-group__title">{humanizeKnowledgebaseKey(label)}</h4> : null}
        <div className="kb-group__body">
          {value.map((item, index) => (
            <KbNode key={index} label={`${label || 'Item'} ${index + 1}`} value={item} depth={depth + 1} />
          ))}
        </div>
      </div>
    )
  }

  const entries = Object.entries(value).filter(([k]) => k !== '#text')
  const text = typeof value['#text'] === 'string' ? value['#text'] : null
  const useSection = depth <= 0

  return (
    <div className={useSection ? 'modal-section kb-section' : 'kb-group'}>
      {label ? (
        useSection ? (
          <StationSectionTitle
            title={humanizeKnowledgebaseKey(label)}
            icon={getKnowledgebaseSectionIcon(label, label)}
          />
        ) : (
          <h4 className="kb-group__title">{humanizeKnowledgebaseKey(label)}</h4>
        )
      ) : null}
      {text ? <p className="kb-note">{formatScalar(text)}</p> : null}
      {useSection ? (
        <div className="kb-facility-list">
          {entries.map(([key, child]) => {
            if (
              child === null ||
              typeof child === 'string' ||
              typeof child === 'number' ||
              typeof child === 'boolean'
            ) {
              return <KbNode key={key} label={key} value={child} depth={depth + 1} />
            }
            return (
              <div key={key} className="kb-nested-block">
                <KbNode label={key} value={child} depth={depth + 1} />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="kb-group__body">
          {entries.map(([key, child]) => {
            if (
              child === null ||
              typeof child === 'string' ||
              typeof child === 'number' ||
              typeof child === 'boolean'
            ) {
              return <KbNode key={key} label={key} value={child} depth={depth + 1} />
            }
            return (
              <div key={key} className="kb-nested-block">
                <KbNode label={key} value={child} depth={depth + 1} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FacilitiesAndStaffingDetailsLayout({ value }: { value: KbJson }) {
  if (!isPlainObject(value)) return null

  const groups: Array<{ title: string; rows: FacilityRow[] }> = []
  if (value.Staffing != null) {
    groups.push({ title: 'Staffing', rows: detailsRowsFromObject(value.Staffing) })
  }
  if (value.StationFacilities != null) {
    groups.push({
      title: 'Station facilities',
      rows: detailsRowsFromObject(value.StationFacilities),
    })
  }

  // Any unexpected siblings still get a section.
  for (const [key, child] of Object.entries(value)) {
    if (key === 'Staffing' || key === 'StationFacilities') continue
    groups.push({ title: humanizeKnowledgebaseKey(key), rows: detailsRowsFromObject(child) })
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group.title} className="modal-section">
          <StationSectionTitle
            title={group.title}
            icon={getKnowledgebaseSectionIcon(group.title === 'Station facilities' ? 'StationFacilities' : group.title, group.title)}
          />
          <div className="kb-facility-list">
            {group.rows.map((row) => (
              <KbDetailField
                key={row.label}
                label={row.label}
                value={row.value}
                notes={row.notes}
                iconKey={row.iconKey}
                location={row.location}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

/** Single Details-style section: flat label/value grid (Accessibility, etc.). */
function FlatDetailsLayout({ title, value, sectionKey }: { title: string; value: KbJson; sectionKey?: string }) {
  const rows = detailsRowsFromObject(value)
  return (
    <div className="modal-section">
      <StationSectionTitle title={title} icon={getKnowledgebaseSectionIcon(sectionKey ?? title, title)} />
      <div className="kb-facility-list">
        {rows.map((row) => (
          <KbDetailField
            key={row.label}
            label={row.label}
            value={row.value}
            notes={row.notes}
            iconKey={row.iconKey}
            location={row.location}
          />
        ))}
      </div>
    </div>
  )
}

const DETAILS_LAYOUT_SECTION_KEYS = new Set([
  FACILITIES_STAFFING_KEY,
  KNOWLEDGEBASE_OVERVIEW_KEY,
  'Accessibility',
  'Fares',
  'PassengerServices',
  'Interchange',
])

interface StationKnowledgebasePanelProps {
  /** Section title shown at top of the panel. */
  label: string
  /** Parsed KB subtree for this sidebar section. */
  value: KbJson
  /** Stable section key (e.g. FacilitiesAndStaffing) for layout variants. */
  sectionKey?: string
  crs?: string
  fetchedAt?: string
  /** NRE ChangeHistory line, e.g. "Last updated by NRE on 16th July 2026 at 09:46". */
  lastUpdatedLabel?: string | null
  /**
   * Show the last-updated hint. Intended for KB not-used and admin viewers;
   * other public KB sections hide it.
   */
  showSourceHint?: boolean
  /** Loading / error states when the parent is still fetching. */
  status?: 'ready' | 'loading' | 'error' | 'idle'
  errorMessage?: string
  /** Grayed-out reference display (e.g. station edit mode). Notes remain viewable. */
  readOnly?: boolean
}

/**
 * One Knowledgebase sidebar section.
 */
const StationKnowledgebasePanel: React.FC<StationKnowledgebasePanelProps> = ({
  label,
  value,
  sectionKey,
  lastUpdatedLabel,
  showSourceHint = false,
  status = 'ready',
  errorMessage,
  readOnly = false,
}) => {
  const panelClass = ['kb-panel', readOnly ? 'kb-panel--readonly' : ''].filter(Boolean).join(' ')

  if (status === 'loading' || status === 'idle') {
    return (
      <div className={panelClass}>
        <div className="modal-section">
          <StationSectionTitle title={label} icon={getKnowledgebaseSectionIcon(sectionKey ?? label, label)} />
          <p className="edit-hint">Loading Knowledgebase…</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={panelClass}>
        <div className="modal-section">
          <StationSectionTitle title={label} icon={getKnowledgebaseSectionIcon(sectionKey ?? label, label)} />
          <p className="edit-hint kb-error">{errorMessage || 'Failed to load Knowledgebase data'}</p>
        </div>
      </div>
    )
  }

  const useDetailsLayout = Boolean(sectionKey && DETAILS_LAYOUT_SECTION_KEYS.has(sectionKey))
  const hintText = lastUpdatedLabel?.trim() || null

  return (
    <div className={panelClass} aria-readonly={readOnly || undefined}>
      {readOnly ? <p className="kb-panel__readonly-banner">Knowledgebase reference — not editable</p> : null}
      {showSourceHint && hintText ? (
        <div className="modal-section">
          <p className="edit-hint kb-source-hint">{hintText}</p>
        </div>
      ) : null}
      {useDetailsLayout && sectionKey === FACILITIES_STAFFING_KEY ? (
        <FacilitiesAndStaffingDetailsLayout value={value} />
      ) : useDetailsLayout ? (
        <FlatDetailsLayout title={label} value={value} sectionKey={sectionKey} />
      ) : (
        <KbNode label={label} value={value} depth={0} />
      )}
    </div>
  )
}

export default StationKnowledgebasePanel
