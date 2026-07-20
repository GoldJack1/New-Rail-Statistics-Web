'use client'

import React, { useEffect, useState } from 'react'
import { Note } from '@phosphor-icons/react'
import type { KbJson } from '../../../utils/knowledgebaseStationXml'
import {
  FACILITIES_STAFFING_KEY,
  KNOWLEDGEBASE_OVERVIEW_KEY,
  humanizeKnowledgebaseKey,
} from '../../../utils/knowledgebaseStationSections'
import { getKnowledgebaseSectionIcon } from '../../../utils/stationDetailFieldIcons'
import { sanitizeKbDisplayText, isGenericNationalRailHomepage, isHelplineContactHeadline, isKbPlaceholderLine, isKbUrlLine, buildHelplineDisplay, buildLuggagePropertyDisplay, buildNationalKeyToiletsDisplay, condenseKnowledgebaseDayList, formatHelplineContactLine, formatHelplineNoteText, formatKbLocationDisplayText, hasStructuredFirstClassLoungeSections, mergeSameScheduleHoursLines, normalizeKbLocationText, parseFirstClassLoungeSections, partitionHelplineNotes, partitionHelplineText, splitHelplineTextBlocks, splitStepFreeCategoryFromStepFreeAccess, splitToiletsLocationItems, stripHelplineNoteMarker, stripHiddenKbFieldUrls, type KbDetailSection } from '../../../utils/knowledgebaseDisplayText'
import { BUTWideButton } from '../../buttons'
import { useTocOperators } from '../../../hooks/useTocOperators'
import { resolveNreTocCodeDisplayName, type TocOperator } from '../../../services/tocOperators'
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
  return sanitizeKbDisplayText(text.trim())
}

function stripHtml(input: string): string {
  return htmlToReadableText(input).replace(/\s+/g, ' ').trim()
}

function noteTextFromString(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (trimmed.includes('<') && trimmed.includes('>')) return htmlToReadableText(trimmed)
  return sanitizeKbDisplayText(trimmed)
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
    // CamelCase / PascalCase enums like fullTime → Full Time, DepartureScreens → Departure Screens
    if (!trimmed.includes(' ') && /^[A-Za-z]+$/.test(trimmed) && /[a-z][A-Z]/.test(trimmed)) {
      return humanizeKnowledgebaseKey(trimmed)
    }
    const cleaned = sanitizeKbDisplayText(trimmed)
    return cleaned || '—'
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

const CONTACTLESS_TRAVEL_PHRASE = /travelling with contactless is available\.?/i

function smartcardCommentsIncludeContactlessTravel(value: KbJson): boolean {
  const notes: string[] = []
  collectNotes(value, notes)
  return notes.some((note) => CONTACTLESS_TRAVEL_PHRASE.test(note))
}

function stripContactlessTravelPhrase(text: string): string {
  return text
    .replace(CONTACTLESS_TRAVEL_PHRASE, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function applyFaresContactlessTravelRows(rows: FacilityRow[], faresValue: KbJson): FacilityRow[] {
  if (!isPlainObject(faresValue) || faresValue.SmartcardComments == null) return rows
  if (!smartcardCommentsIncludeContactlessTravel(faresValue.SmartcardComments)) return rows

  const withoutSmartcard = rows.filter((row) => row.iconKey !== 'SmartcardComments')
  const smartcardRow = rows.find((row) => row.iconKey === 'SmartcardComments')
  const keptSmartcardRows: FacilityRow[] = []

  if (smartcardRow) {
    const strippedValue = stripContactlessTravelPhrase(smartcardRow.value)
    const strippedNotes = smartcardRow.notes
      .map((note) => stripContactlessTravelPhrase(note))
      .filter(Boolean)
    if (strippedValue && strippedValue !== '—') {
      keptSmartcardRows.push({ ...smartcardRow, value: strippedValue, notes: strippedNotes })
    } else if (strippedNotes.length > 0) {
      keptSmartcardRows.push({ ...smartcardRow, value: strippedNotes.join('\n\n'), notes: [] })
    }
  }

  const contactlessRow: FacilityRow = {
    label: 'Contactless Travel',
    value: 'Yes',
    notes: [],
    iconKey: 'ContactlessTravel',
  }

  const smartcardIndex = rows.findIndex((row) => row.iconKey === 'SmartcardComments')
  const insertAt = smartcardIndex >= 0 ? smartcardIndex : withoutSmartcard.length
  return [
    ...withoutSmartcard.slice(0, insertAt),
    contactlessRow,
    ...keptSmartcardRows,
    ...withoutSmartcard.slice(insertAt),
  ]
}

function formatDayTypes(dayTypes: KbJson): string {
  if (!isPlainObject(dayTypes)) return ''
  const days: string[] = []
  for (const [key, value] of Object.entries(dayTypes)) {
    if (value === true || value === 'true') days.push(humanizeKnowledgebaseKey(key))
  }
  return condenseKnowledgebaseDayList(days)
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
  const merged = mergeSameScheduleHoursLines(lines)
  return merged.length ? merged.join('\n') : null
}

type FacilityDisplay = {
  value: string
  notes: string[]
  location?: string | null
  detailsUrl?: string | null
  detailSections?: KbDetailSection[]
}
type FacilityRow = {
  label: string
  value: string
  notes: string[]
  iconKey?: string
  location?: string | null
  detailsUrl?: string | null
  detailSections?: KbDetailSection[]
}

function applyHelplineDisplay(display: FacilityDisplay): FacilityDisplay {
  const built = buildHelplineDisplay({
    value: display.value,
    notes: display.notes,
    detailsUrl: display.detailsUrl,
  })

  return {
    ...display,
    value: built.value,
    notes: built.notes,
    detailSections: [...(display.detailSections ?? []), ...built.detailSections],
    detailsUrl: null,
  }
}

function collectStaffHelpHelplineNotes(display: FacilityDisplay): string[] {
  const parts: string[] = [...display.notes]
  if (display.value && display.value !== '—') {
    parts.push(...splitHelplineTextBlocks(display.value))
  }
  return uniqueNotes(parts.map((note) => sanitizeKbDisplayText(note)).filter(Boolean))
}

function mergeStaffHelpIntoHelplineRows(rows: FacilityRow[]): FacilityRow[] {
  const staffHelpIndex = rows.findIndex((row) => row.iconKey === 'StaffHelpAvailable')
  const helplineIndex = rows.findIndex((row) => row.iconKey === 'Helpline')

  let helpline: FacilityRow =
    helplineIndex >= 0
      ? { ...rows[helplineIndex] }
      : {
          label: humanizeKnowledgebaseKey('Helpline'),
          value: '—',
          notes: [],
          iconKey: 'Helpline',
        }

  if (staffHelpIndex >= 0) {
    const staffHelpNotes = collectStaffHelpHelplineNotes({
      value: rows[staffHelpIndex].value,
      notes: rows[staffHelpIndex].notes,
      location: rows[staffHelpIndex].location,
    })
    helpline = {
      ...helpline,
      notes: uniqueNotes([...helpline.notes, ...staffHelpNotes]),
      location: helpline.location ?? rows[staffHelpIndex].location,
    }
  }

  helpline = {
    ...applyHelplineDisplay(helpline),
    label: humanizeKnowledgebaseKey('Helpline'),
    iconKey: 'Helpline',
  }

  const withoutStaffHelp = rows.filter((row) => row.iconKey !== 'StaffHelpAvailable')
  const nextHelplineIndex = withoutStaffHelp.findIndex((row) => row.iconKey === 'Helpline')
  if (nextHelplineIndex >= 0) withoutStaffHelp[nextHelplineIndex] = helpline
  else if (
    staffHelpIndex >= 0 ||
    helpline.notes.length > 0 ||
    (helpline.detailSections?.length ?? 0) > 0 ||
    helpline.value !== '—'
  ) {
    withoutStaffHelp.push(helpline)
  }

  return withoutStaffHelp
}

function applyAccessibilityStepFreeCategoryRows(rows: FacilityRow[]): FacilityRow[] {
  const stepFreeIndex = rows.findIndex((row) => row.iconKey === 'StepFreeAccess')
  if (stepFreeIndex < 0) return rows

  const stepFree = rows[stepFreeIndex]
  const split = splitStepFreeCategoryFromStepFreeAccess({
    value: stepFree.value,
    notes: stepFree.notes,
  })
  if (!split.categoryValue) return rows

  const updatedStepFree: FacilityRow = {
    ...stepFree,
    value: split.value,
    notes: split.notes,
  }

  const categoryRow: FacilityRow = {
    label: 'Step-Free Category',
    value: split.categoryValue,
    notes: [],
    iconKey: 'StepFreeCategory',
  }

  const next = [...rows]
  next[stepFreeIndex] = updatedStepFree
  next.splice(stepFreeIndex, 0, categoryRow)
  return next
}

/** When a field has no structured value, surface annotation notes as the main text. */
function finalizeFacilityDisplay(display: FacilityDisplay): FacilityDisplay {
  if (display.value !== '—' || display.notes.length === 0) return display
  return {
    value: display.notes.join('\n\n'),
    notes: [],
    location: display.location,
  }
}

function applyFieldDisplayOverrides(fieldKey: string, display: FacilityDisplay): FacilityDisplay {
  const value = stripHiddenKbFieldUrls(display.value, fieldKey)
  if (value === display.value) return display
  return { ...display, value }
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
      const loc = normalizeKbLocationText(whole[1])
      if (loc) locations.push(loc)
      continue
    }

    const lines = block.split('\n')
    const keptLines: string[] = []
    for (const line of lines) {
      const lineMatch = line.match(/^\s*Location:\s*(.+)\s*$/i)
      if (lineMatch) {
        const loc = normalizeKbLocationText(lineMatch[1])
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

  if (/^Location:\s*/im.test(joined)) {
    const pulled = pullLocationFromNoteText(joined)
    const text = pulled.location || pulled.text
    return text ? normalizeKbLocationText(text) : null
  }

  return normalizeKbLocationText(joined)
}

function mergeLocations(...values: Array<string | null | undefined>): string | null {
  const parts = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
  if (parts.length === 0) return null
  const unique = uniqueNotes(parts)
  if (unique.some((part) => part.includes('\n') || part.includes('•'))) {
    return unique.join('\n\n')
  }
  return unique.join('; ')
}

function readKbUrlFromNode(node: KbJson): string | null {
  if (!isPlainObject(node)) return null
  if (typeof node.Url === 'string' && node.Url.trim()) return node.Url.trim()
  if (isPlainObject(node.ContactDetails)) return readKbUrlFromNode(node.ContactDetails)
  return null
}

function readOperatorNameFromNode(node: KbJson): string | null {
  if (!isPlainObject(node)) return null
  const raw = typeof node.OperatorName === 'string' ? node.OperatorName.trim() : ''
  if (!raw) return null
  const decoded = decodeBasicEntities(raw)
  if (decoded.includes('<') && decoded.includes('>')) return stripHtml(decoded) || null
  return decoded
}

function readPhoneFromNode(node: KbJson): string | null {
  if (!isPlainObject(node)) return null
  if (isPlainObject(node.PrimaryTelephoneNumber)) {
    const tel = node.PrimaryTelephoneNumber.TelNationalNumber
    if (typeof tel === 'string' && tel.trim()) return tel.trim()
  }
  if (isPlainObject(node.ContactDetails)) return readPhoneFromNode(node.ContactDetails)
  return null
}

function readOpenHoursFromNode(node: KbJson): string | null {
  if (!isPlainObject(node)) return null
  const fromOpen = formatOpenHours(node.Open)
  if (fromOpen) return fromOpen
  if ('DayAndTimeAvailability' in node) return formatOpenHours(node)
  return null
}

/** Left Luggage / Lost Property: availability, operator, call, hours, details link. */
function summarizeLuggagePropertyValue(value: KbJson, fieldKey: 'LeftLuggage' | 'LostProperty'): FacilityDisplay {
  const generic = summarizeFacilityValue(value, fieldKey)
  if (!isPlainObject(value)) {
    return { ...generic, value: stripHiddenKbFieldUrls(generic.value, fieldKey) }
  }

  const availableRaw =
    'Available' in value ? formatScalar(value.Available as string | number | boolean | null) : null
  const available = availableRaw && availableRaw !== '—' ? availableRaw : null
  const operator = readOperatorNameFromNode(value)
  const phone = readPhoneFromNode(value)
  const hours = readOpenHoursFromNode(value)
  const urlRaw = readKbUrlFromNode(value)
  const detailsUrl = urlRaw && !isGenericNationalRailHomepage(urlRaw) ? urlRaw : null

  const built = buildLuggagePropertyDisplay({
    available,
    operator,
    phone,
    hours,
    detailsUrl,
    extraLines: generic.value.split('\n'),
  })

  return {
    value: built.value,
    notes: generic.notes,
    location: generic.location,
    detailsUrl: built.detailsUrl,
  }
}

/** Penalty Fares: resolve NRE TrainOperator codes (e.g. SE) to full operator names. */
function summarizePenaltyFaresValue(value: KbJson, operators: TocOperator[]): FacilityDisplay {
  const generic = summarizeFacilityValue(value)
  if (!isPlainObject(value)) return generic

  const raw = value.TrainOperator
  if (typeof raw !== 'string' || !raw.trim()) return generic

  const operatorName = resolveNreTocCodeDisplayName(operators, raw.trim())
  const operatorLine = `Train Operator: ${operatorName}`
  const otherLines = generic.value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^train operator:\s*/i.test(line))

  return {
    ...generic,
    value: [...otherLines, operatorLine].join('\n').trim() || operatorLine,
  }
}

function summarizeFirstClassLoungeValue(value: KbJson): FacilityDisplay {
  const generic = summarizeFacilityValue(value, 'FirstClassLounge')
  const note = generic.notes.join('\n\n').trim()
  if (!note) return generic

  const detailSections = parseFirstClassLoungeSections(note)
  if (!hasStructuredFirstClassLoungeSections(detailSections)) return generic

  return {
    ...generic,
    notes: [],
    detailSections,
  }
}

function summarizeNationalKeyToiletsValue(value: KbJson): FacilityDisplay {
  const generic = summarizeFacilityValue(value, 'NationalKeyToilets')
  const openNotes: string[] = []
  if (isPlainObject(value) && isPlainObject(value.Open)) collectNotes(value.Open, openNotes)

  const merged = buildNationalKeyToiletsDisplay({
    value: generic.value,
    notes: uniqueNotes([...generic.notes, ...openNotes]),
    location: generic.location,
  })

  return { ...generic, ...merged }
}

function summarizeFieldValue(fieldKey: string, value: KbJson, operators: TocOperator[] = []): FacilityDisplay {
  let display =
    fieldKey === 'LostProperty' || fieldKey === 'LeftLuggage'
      ? summarizeLuggagePropertyValue(value, fieldKey)
      : fieldKey === 'PenaltyFares'
        ? summarizePenaltyFaresValue(value, operators)
        : fieldKey === 'FirstClassLounge'
          ? summarizeFirstClassLoungeValue(value)
          : fieldKey === 'NationalKeyToilets'
            ? summarizeNationalKeyToiletsValue(value)
            : summarizeFacilityValue(value, fieldKey)
  display = applyFieldDisplayOverrides(fieldKey, display)
  return display
}

/** Flatten a facility node into a compact value + separate notes for the overlay. */
function summarizeFacilityValue(value: KbJson, fieldKey?: string): FacilityDisplay {
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
    return finalizeFacilityDisplay({
      value: parts.join('\n\n') || '—',
      notes: uniqueNotes(notes),
      location: mergeLocations(...locations),
    })
  }
  if (!isPlainObject(value)) return { value: '—', notes: [], location: null }

  const parts: string[] = []
  const notes: string[] = []
  let location: string | null = null

  if ('Available' in value) {
    parts.push(formatScalar(value.Available as string | number | boolean | null))
  }
  if (fieldKey === 'Telephones' && 'Exists' in value) {
    parts.push(formatScalar(value.Exists as string | number | boolean | null))
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

  const hoursFromOpen = formatOpenHours(value.Open)
  const hoursFromSelf =
    !hoursFromOpen && 'DayAndTimeAvailability' in value ? formatOpenHours(value) : null
  const hours = hoursFromOpen ?? hoursFromSelf
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
      (fieldKey === 'Telephones' && key === 'Exists') ||
      key === 'Open' ||
      key === 'DayAndTimeAvailability' ||
      key === 'Annotation' ||
      key === 'Location' ||
      key === 'ContactDetails' ||
      key === 'PrimaryTelephoneNumber' ||
      key === 'Coverage' ||
      key === 'Url' ||
      key === 'PostalAddress' ||
      key === 'Note' ||
      key === 'OperatorName' ||
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

  return finalizeFacilityDisplay({
    value: parts.filter(Boolean).join('\n') || '—',
    notes: uniqueNotes(notes),
    location,
  })
}

function splitKbTextBlocks(text: string): string[][] {
  return text
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length > 0)
}

/** Render KB plain text as compact paragraphs or bullet lists (not raw pre-line gaps). */
function KbFormattedText({
  text,
  className,
  listClassName,
  paragraphClassName,
}: {
  text: string
  className?: string
  listClassName?: string
  paragraphClassName?: string
}) {
  const blockLines = splitKbTextBlocks(text)
  if (blockLines.length === 0) return null

  let headlineCount = 0
  while (
    headlineCount < blockLines.length &&
    blockLines[headlineCount].length === 1 &&
    isHelplineContactHeadline(blockLines[headlineCount][0])
  ) {
    headlineCount++
  }

  const headlineBlocks = blockLines.slice(0, headlineCount)
  const bodyBlocks = blockLines.slice(headlineCount)

  if (headlineBlocks.length > 0 && bodyBlocks.length > 0) {
    const useBodyBulletList =
      bodyBlocks.every((lines) => lines.length === 1) &&
      !bodyBlocks.some((lines) => lines[0].startsWith('• '))

    return (
      <div className={className ?? 'kb-formatted-text'}>
        {headlineBlocks.map((lines, index) => (
          <p
            key={`headline-${index}`}
            className={`kb-formatted-text__paragraph ${paragraphClassName ?? ''}`.trim()}
          >
            {lines[0]}
          </p>
        ))}
        {useBodyBulletList ? (
          <ul className={listClassName ?? 'kb-formatted-text__list'}>
            {bodyBlocks.map((lines, index) => (
              <li key={index}>{lines[0]}</li>
            ))}
          </ul>
        ) : (
          bodyBlocks.map((lines, index) => (
            <p
              key={`body-${index}`}
              className={`kb-formatted-text__paragraph ${paragraphClassName ?? ''}`.trim()}
            >
              {lines.length > 1 ? lines.join('\n') : lines[0]}
            </p>
          ))
        )}
      </div>
    )
  }

  const useBulletList =
    blockLines.length >= 2 &&
    blockLines.every((lines) => lines.length === 1) &&
    !blockLines.some((lines) => lines[0].startsWith('• '))

  if (useBulletList) {
    return (
      <ul className={listClassName ?? 'kb-formatted-text__list'}>
        {blockLines.map((lines, index) => (
          <li key={index}>{lines[0]}</li>
        ))}
      </ul>
    )
  }

  return (
    <div className={className ?? 'kb-formatted-text'}>
      {blockLines.map((lines, index) => {
        const isList = lines.every((line) => line.startsWith('• '))
        if (isList) {
          return (
            <ul key={index} className={listClassName ?? 'kb-formatted-text__list'}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{line.replace(/^•\s*/, '')}</li>
              ))}
            </ul>
          )
        }
        if (lines.length > 1) {
          return (
            <p key={index} className={`kb-formatted-text__lines ${paragraphClassName ?? ''}`.trim()}>
              {lines.join('\n')}
            </p>
          )
        }
        return (
          <p key={index} className={`kb-formatted-text__paragraph ${paragraphClassName ?? ''}`.trim()}>
            {lines[0]}
          </p>
        )
      })}
    </div>
  )
}

function NoteContent({ text }: { text: string }) {
  return (
    <KbFormattedText
      text={text}
      className="kb-note-overlay__blocks"
      listClassName="kb-note-overlay__list"
      paragraphClassName="kb-note-overlay__paragraph"
    />
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

function getFacilityItemLayoutClass(
  value: string,
  location?: string | null,
  detailSections: KbDetailSection[] = []
): string {
  if (detailSections.length > 0) return 'kb-facility-item--full'
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
  location,
  detailsUrl,
  detailSections = [],
}: {
  label: string
  value: string
  notes?: string[]
  iconKey?: string
  location?: string | null
  detailsUrl?: string | null
  detailSections?: KbDetailSection[]
}) {
  const [openNoteIndex, setOpenNoteIndex] = useState<number | null>(null)
  const openNote = openNoteIndex != null ? notes[openNoteIndex] : null
  const locationText = location?.trim() || null
  const layoutClass = getFacilityItemLayoutClass(value, locationText, detailSections)

  return (
    <div className={`modal-detail-item kb-detail-item kb-facility-item ${layoutClass}`}>
      <div className="kb-detail-label-row">
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
      <div className="modal-detail-value kb-detail-value">
        <KbFormattedText text={value} />
        {detailsUrl ? (
          <BUTWideButton
            href={detailsUrl}
            width="hug"
            colorVariant="primary"
            className="kb-details-link"
            ariaLabel={`View details for ${label}`}
          >
            View details
          </BUTWideButton>
        ) : null}
      </div>
      {detailSections.map((section) => (
        <div key={section.label} className="kb-facility-location">
          <span className="kb-facility-location__label">{section.label}</span>
          <KbFormattedText
            text={section.value}
            className="kb-facility-location__value kb-formatted-text"
            listClassName="kb-formatted-text__list"
          />
        </div>
      ))}
      {locationText ? (
        <div className="kb-facility-location">
          <span className="kb-facility-location__label">Location</span>
          <KbFormattedText
            text={formatKbLocationDisplayText(locationText)}
            className="kb-facility-location__value kb-formatted-text"
            listClassName="kb-formatted-text__list"
          />
        </div>
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

function mergeFacilityRowLocation(row: FacilityRow, extra: string | null): FacilityRow {
  if (!extra?.trim()) return row
  return { ...row, location: mergeLocations(row.location, extra) }
}

function applyStationFacilitiesToiletsRows(rows: FacilityRow[]): FacilityRow[] {
  const toiletsIndex = rows.findIndex((row) => row.iconKey === 'Toilets')
  if (toiletsIndex < 0) return rows

  const { toiletLocation, babyChangeLocation } = splitToiletsLocationItems(rows[toiletsIndex].location)
  if (toiletLocation === rows[toiletsIndex].location && !babyChangeLocation) return rows

  const next = [...rows]
  next[toiletsIndex] = { ...next[toiletsIndex], location: toiletLocation }

  if (babyChangeLocation) {
    const babyChangeIndex = next.findIndex((row) => row.iconKey === 'BabyChange')
    if (babyChangeIndex >= 0) {
      next[babyChangeIndex] = mergeFacilityRowLocation(next[babyChangeIndex], babyChangeLocation)
    } else if (toiletLocation) {
      next[toiletsIndex] = mergeFacilityRowLocation(next[toiletsIndex], babyChangeLocation)
    } else {
      next[toiletsIndex] = { ...next[toiletsIndex], location: babyChangeLocation }
    }
  }

  return next
}

function detailsRowsFromObject(
  value: KbJson,
  sectionKey?: string,
  operators: TocOperator[] = [],
  facilityGroupKey?: string
): FacilityRow[] {
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
  const rows = Object.entries(value)
    .filter(([key]) => key !== '#text')
    .map(([key, child]) => {
      const display = summarizeFieldValue(key, child, operators)
      return {
        label: humanizeKnowledgebaseKey(key),
        value: display.value,
        notes: display.notes,
        iconKey: key,
        location: display.location,
        detailsUrl: display.detailsUrl,
        detailSections: display.detailSections,
      }
    })

  if (sectionKey === 'Fares') return applyFaresContactlessTravelRows(rows, value)
  if (sectionKey === 'Accessibility') {
    return applyAccessibilityStepFreeCategoryRows(mergeStaffHelpIntoHelplineRows(rows))
  }
  if (facilityGroupKey === 'StationFacilities') {
    return applyStationFacilitiesToiletsRows(rows)
  }
  return rows
}

function KbNode({
  label,
  value,
  depth = 0,
  sourceHint,
}: {
  label?: string
  value: KbJson
  depth?: number
  sourceHint?: string | null
}) {
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
            pageHeading
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
      {useSection && sourceHint ? <p className="edit-hint kb-source-hint">{sourceHint}</p> : null}
    </div>
  )
}

function FacilitiesAndStaffingDetailsLayout({
  value,
  sourceHint,
}: {
  value: KbJson
  sourceHint?: string | null
}) {
  const { operators } = useTocOperators()
  if (!isPlainObject(value)) return null

  const groups: Array<{ title: string; rows: FacilityRow[] }> = []
  if (value.Staffing != null) {
    groups.push({ title: 'Staffing', rows: detailsRowsFromObject(value.Staffing, undefined, operators) })
  }
  if (value.StationFacilities != null) {
    groups.push({
      title: 'Station facilities',
      rows: detailsRowsFromObject(value.StationFacilities, undefined, operators, 'StationFacilities'),
    })
  }

  // Any unexpected siblings still get a section.
  for (const [key, child] of Object.entries(value)) {
    if (key === 'Staffing' || key === 'StationFacilities') continue
    groups.push({ title: humanizeKnowledgebaseKey(key), rows: detailsRowsFromObject(child, undefined, operators) })
  }

  return (
    <>
      {groups.map((group, index) => (
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
                detailsUrl={row.detailsUrl}
                detailSections={row.detailSections}
              />
            ))}
          </div>
          {index === groups.length - 1 && sourceHint ? (
            <p className="edit-hint kb-source-hint">{sourceHint}</p>
          ) : null}
        </div>
      ))}
    </>
  )
}

/** Single Details-style section: flat label/value grid (Accessibility, etc.). */
function FlatDetailsLayout({
  title,
  value,
  sectionKey,
  sourceHint,
}: {
  title: string
  value: KbJson
  sectionKey?: string
  sourceHint?: string | null
}) {
  const { operators } = useTocOperators()
  const rows = detailsRowsFromObject(value, sectionKey, operators)
  return (
    <div className="modal-section">
      <StationSectionTitle title={title} icon={getKnowledgebaseSectionIcon(sectionKey ?? title, title)} pageHeading />
      <div className="kb-facility-list">
        {rows.map((row) => (
          <KbDetailField
            key={row.label}
            label={row.label}
            value={row.value}
            notes={row.notes}
            iconKey={row.iconKey}
            location={row.location}
            detailsUrl={row.detailsUrl}
            detailSections={row.detailSections}
          />
        ))}
      </div>
      {sourceHint ? <p className="edit-hint kb-source-hint">{sourceHint}</p> : null}
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
  /** NRE ChangeHistory line, e.g. "The data shown on this page was last updated by National Rail Enquiries on 16th July 2026 at 09:46.". */
  lastUpdatedLabel?: string | null
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
  status = 'ready',
  errorMessage,
  readOnly = false,
}) => {
  const panelClass = ['kb-panel', readOnly ? 'kb-panel--readonly' : ''].filter(Boolean).join(' ')

  if (status === 'loading' || status === 'idle') {
    return (
      <div className={panelClass}>
        <div className="modal-section">
          <StationSectionTitle title={label} icon={getKnowledgebaseSectionIcon(sectionKey ?? label, label)} pageHeading />
          <p className="edit-hint">Loading Knowledgebase…</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={panelClass}>
        <div className="modal-section">
          <StationSectionTitle title={label} icon={getKnowledgebaseSectionIcon(sectionKey ?? label, label)} pageHeading />
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
      {useDetailsLayout && sectionKey === FACILITIES_STAFFING_KEY ? (
        <FacilitiesAndStaffingDetailsLayout value={value} sourceHint={hintText} />
      ) : useDetailsLayout ? (
        <FlatDetailsLayout title={label} value={value} sectionKey={sectionKey} sourceHint={hintText} />
      ) : (
        <KbNode label={label} value={value} depth={0} sourceHint={hintText} />
      )}
    </div>
  )
}

export default StationKnowledgebasePanel
