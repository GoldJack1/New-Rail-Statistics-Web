/** Remove common NRE link-placeholder boilerplate from KB display text. */
export type KbDetailSection = { label: string; value: string }

export function sanitizeKbDisplayText(text: string): string {
  return text
    // Whole parenthetical is only the link placeholder.
    .replace(/\(\s*click here for details\s*\)/gi, '')
    // Link placeholder before a closing paren that wraps other text — keep the ")".
    .replace(/\s+click here for details(?=\))/gi, '')
    // Standalone phrase elsewhere.
    .replace(/\s*click here for details\s*[.,]?/gi, '')
    // Passenger Assist / helpline link placeholder — keep trailing full stop on preceding text.
    .replace(/\s+please click here(\.)?/gi, (_, dot) => (dot ? '.' : ''))
    .replace(/^\s*please click here\s*[.,]?/gi, '')
    // Whole parenthetical is only the printable-format link placeholder.
    .replace(/\(\s*in a printable format here\s*\)/gi, '')
    // Printable placeholder before a closing paren — keep the ")".
    .replace(/\s+in a printable format here(?=\))/gi, '')
    // Standalone phrase — move any trailing full stop onto the preceding sentence.
    .replace(/^\s*in a printable format here\s*[.,]?/gi, '')
    .replace(/\s+in a printable format here(\.)?/gi, (_, dot) => (dot ? '.' : ''))
    .replace(/\(\s*\)/g, '')
    // Platforms / ranges like "2&3" → "2 & 3".
    .replace(/(?<=[A-Za-z0-9])\s*&\s*(?=[A-Za-z0-9])/g, ' & ')
    // Acronyms from NRE source text.
    .replace(/\bcctv\b/gi, 'CCTV')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/,\s*([.!?])/g, '$1')
    .trim()
}

/** Standard NRE assistance copy that belongs in Helpline notes, not the main value. */
export function isHelplineBoilerplateNote(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase()
  if (!normalized) return false
  if (normalized.includes('we want everyone to travel with confidence')) return true
  if (normalized.includes('passenger assist') && normalized.includes('assistance booking')) return true
  if (normalized.includes('turn up and go') && normalized.includes('pre-booked assistance')) return true
  if (normalized.includes('speak to a member of staff for any assistance')) return true
  return false
}

/** Short availability notes for Helpline, e.g. "Yes - from ticket office". */
export function stripHelplineNoteMarker(text: string): string {
  return text.replace(/^[•*-]\s*/, '').trim()
}

export function isHelplineYesNoNote(text: string): boolean {
  const normalized = stripHelplineNoteMarker(text).replace(/\s+/g, ' ').trim().toLowerCase()
  if (!normalized) return false
  if (isHelplineBoilerplateNote(text)) return false
  if (normalized === 'yes' || normalized === 'no') return true
  if (/^yes\b/.test(normalized)) return true
  if (/^no\b/.test(normalized) && normalized.length <= 48) return true
  if (/^available:\s*yes\b/.test(normalized)) return true
  if (/\byes\b/.test(normalized) && /from (?:help point|ticket office)/.test(normalized)) return true
  return false
}

export function isKbUrlLine(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (/^https?:\/\//i.test(trimmed)) return true
  return isGenericNationalRailHomepage(trimmed)
}

export function isKbPlaceholderLine(text: string): boolean {
  const trimmed = text.trim()
  return trimmed === '—' || trimmed === '---' || trimmed === '…' || trimmed === '...'
}

/** Standalone telephone number line (not already labelled Call/Tel). */
export function isKbPhoneLine(text: string): boolean {
  const trimmed = stripHelplineNoteMarker(text).trim()
  if (!trimmed || isKbUrlLine(trimmed) || isKbPlaceholderLine(trimmed)) return false
  if (/^(?:call|tel(?:ephone)?)\s*[:\s]/i.test(trimmed)) return false
  if (!/^[\d\s()+.-]+$/.test(trimmed)) return false
  const digits = trimmed.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

/** Format standalone helpline contact lines as Call … / visit …. */
export function formatHelplineContactLine(text: string): string {
  const trimmed = stripHelplineNoteMarker(text).trim()
  if (!trimmed) return trimmed
  if (/^call\s+/i.test(trimmed)) return trimmed.replace(/^call/i, 'Call')
  if (/^visit\s+/i.test(trimmed)) return trimmed
  if (isKbUrlLine(trimmed)) return `visit ${trimmed}`
  if (isKbPhoneLine(trimmed)) return `Call ${trimmed.replace(/\s+/g, ' ').trim()}`
  return trimmed
}

/** Combine Call / visit lines into one headline contact string. */
export function combineHelplineContactLine(calls: string[], visits: string[]): string | null {
  const call = calls[0]
  const visit = visits[0]
  if (call && visit) return `${call} or ${visit}`
  if (call) return call
  if (visit) return visit
  return null
}

/** Combined helpline contact headline — render as plain text, not a bullet. */
export function isHelplineContactHeadline(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (/^Call .+ or visit .+$/i.test(trimmed)) return true
  if (/^Call \d/.test(trimmed) && !trimmed.includes('\n')) return true
  if (/^visit https?:\/\//i.test(trimmed)) return true
  return false
}

/** Apply Call / visit formatting; combined contact line first. */
export function formatHelplineNoteText(text: string): string {
  const blocks = helplineTextBlocks(text).map(formatHelplineContactLine)
  if (blocks.length === 0) return text.trim()

  const calls: string[] = []
  const visits: string[] = []
  const prose: string[] = []
  for (const block of blocks) {
    if (/^Call /i.test(block)) calls.push(block)
    else if (/^visit /i.test(block)) visits.push(block)
    else prose.push(block)
  }

  const contactLine = combineHelplineContactLine(calls, visits)
  const extraContacts = [...calls.slice(1), ...visits.slice(1)]
  return [contactLine, ...prose, ...extraContacts].filter(Boolean).join('\n\n').trim()
}

function formatHelplineTelLine(text: string): string | null {
  const trimmed = stripHelplineNoteMarker(text).trim()
  if (!trimmed) return null
  const telMatch = trimmed.match(/^tel(?:ephone)?:\s*(.+)$/i)
  if (telMatch) return `Call ${telMatch[1].trim()}`
  if (/^call\s+/i.test(trimmed)) return trimmed.replace(/^call/i, 'Call')
  if (isKbPhoneLine(trimmed)) return formatHelplineContactLine(trimmed)
  return null
}

/** Pull a Call headline from prose that mentions a single national phone number. */
function extractHelplineCallFromProse(text: string): string | null {
  const trimmed = stripHelplineNoteMarker(text).trim()
  if (!trimmed || formatHelplineTelLine(trimmed)) return null
  // Multi-TOC staff lists keep their numbers in Staff help, not the Helpline headline.
  if (isHelplineStaffAssistNote(trimmed)) return null

  const callMatch = trimmed.match(
    /\b(?:call|telephone|phone)\s+(?:\w+\s+){0,6}?((?:\+?\d[\d\s().-]{8,}\d)(?:\s+and\s+\d[\d\s().-]{8,}\d)?)/i
  )
  if (!callMatch) return null
  const number = callMatch[1].replace(/\s+/g, ' ').trim()
  const digits = number.replace(/\D/g, '')
  if (digits.length < 10) return null
  return `Call ${number}`
}

/** Weekday order used when condensing NRE day lists. */
const KB_WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

function titleCaseWeekday(day: string): string {
  const trimmed = day.trim()
  const found = KB_WEEKDAYS.find((weekday) => weekday.toLowerCase() === trimmed.toLowerCase())
  return found ?? trimmed
}

/**
 * Condense contiguous weekday lists, e.g. Monday…Saturday → "Monday to Saturday".
 * Also normalises compound labels like "Monday To Friday".
 */
export function condenseKnowledgebaseDayList(days: string[]): string {
  if (days.length === 0) return ''

  if (days.length === 1) {
    const compound = days[0].match(/^Monday\s+[Tt]o\s+(Friday|Saturday|Sunday)$/i)
    if (compound) return `Monday to ${titleCaseWeekday(compound[1])}`
    return days[0].replace(/\s+To\s+/g, ' to ')
  }

  const normalized = days.map(titleCaseWeekday)
  const indices = normalized.map((day) => KB_WEEKDAYS.indexOf(day as (typeof KB_WEEKDAYS)[number]))
  const isContiguous =
    indices.every((index) => index >= 0) &&
    indices.every((index, offset) => index === indices[0] + offset)

  if (isContiguous && normalized.length >= 2) {
    return `${normalized[0]} to ${normalized[normalized.length - 1]}`
  }

  return normalized.join(', ')
}

function normalizeKbHoursDaysPart(daysPart: string): string {
  const trimmed = daysPart.replace(/\s+/g, ' ').trim().replace(/:$/, '')
  if (!trimmed) return ''

  const compound = trimmed.match(/^Monday\s+[Tt]o\s+(Friday|Saturday|Sunday)$/i)
  if (compound) return `Monday to ${titleCaseWeekday(compound[1])}`

  if (/\bto\b/i.test(trimmed) && !trimmed.includes(',')) {
    return trimmed.replace(/\s+[Tt]o\s+/g, ' to ')
  }

  const parts = trimmed.split(/\s*,\s*/).map((part) => part.trim()).filter(Boolean)
  return condenseKnowledgebaseDayList(parts)
}

/** Normalise freeform / structured KB hours lines to "Monday to Friday: 04:00–01:00". */
export function normalizeKbHoursLine(text: string): string | null {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!trimmed) return null

  const twentyFour = trimmed.match(/^(.+?)\s*:?\s*24\s*hours\s*$/i)
  if (twentyFour) {
    const days = normalizeKbHoursDaysPart(twentyFour[1])
    return days ? `${days}: 24 hours` : '24 hours'
  }

  const match = trimmed.match(
    /^(.+?)\s*:?\s*(\d{1,2})\s*:\s*(\d{2})\s*(?:–|-|to)\s*(\d{1,2})\s*:\s*(\d{2})\s*$/i
  )
  if (!match) return null

  const days = normalizeKbHoursDaysPart(match[1])
  if (!days || !/^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(days)) {
    return null
  }

  const start = `${match[2].padStart(2, '0')}:${match[3]}`
  const end = `${match[4].padStart(2, '0')}:${match[5]}`
  return `${days}: ${start}–${end}`
}

/** Drop duplicate hour lines after normalising day ranges and time formatting. */
export function dedupeKbHoursLines(lines: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const line of lines) {
    const normalized = normalizeKbHoursLine(line) ?? line.replace(/\s+/g, ' ').trim()
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
  }

  return result
}

function parseKbHoursLineParts(line: string): { days: string; schedule: string } | null {
  const normalized = normalizeKbHoursLine(line) ?? line.replace(/\s+/g, ' ').trim()
  const match = normalized.match(/^(.+?):\s*(.+)$/)
  if (!match) return null
  const days = match[1].trim()
  const schedule = match[2].trim()
  if (!days || !schedule) return null
  if (!/^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(days)) return null
  return { days, schedule }
}

function expandKbDaysPartToWeekdays(daysPart: string): string[] {
  const compound = daysPart.match(/^(.+?)\s+to\s+(.+)$/i)
  if (compound) {
    const start = titleCaseWeekday(compound[1])
    const end = titleCaseWeekday(compound[2])
    const startIndex = KB_WEEKDAYS.indexOf(start as (typeof KB_WEEKDAYS)[number])
    const endIndex = KB_WEEKDAYS.indexOf(end as (typeof KB_WEEKDAYS)[number])
    if (startIndex >= 0 && endIndex >= startIndex) {
      return [...KB_WEEKDAYS.slice(startIndex, endIndex + 1)]
    }
  }
  return daysPart
    .split(/\s*,\s*/)
    .map(titleCaseWeekday)
    .filter((day) => KB_WEEKDAYS.includes(day as (typeof KB_WEEKDAYS)[number]))
}

/**
 * Merge hour lines that share the same schedule into one condensed day range.
 * e.g. Mon–Fri / Saturday / Sunday all "24 hours" → "Monday to Sunday: 24 hours".
 */
export function mergeSameScheduleHoursLines(lines: string[]): string[] {
  const normalized = dedupeKbHoursLines(lines)
  if (normalized.length <= 1) return normalized

  const groups = new Map<string, string[]>()
  const order: string[] = []

  for (const line of normalized) {
    const parsed = parseKbHoursLineParts(line)
    if (!parsed) {
      const key = `__raw__:${line}`
      if (!groups.has(key)) {
        groups.set(key, [])
        order.push(key)
      }
      continue
    }
    if (!groups.has(parsed.schedule)) {
      groups.set(parsed.schedule, [])
      order.push(parsed.schedule)
    }
    groups.get(parsed.schedule)!.push(...expandKbDaysPartToWeekdays(parsed.days))
  }

  const merged: string[] = []
  for (const key of order) {
    if (key.startsWith('__raw__:')) {
      merged.push(key.slice('__raw__:'.length))
      continue
    }
    const days = groups.get(key) ?? []
    const uniqueDays = KB_WEEKDAYS.filter((day) => days.includes(day))
    const daysLabel = condenseKnowledgebaseDayList(uniqueDays)
    merged.push(daysLabel ? `${daysLabel}: ${key}` : key)
  }

  return merged
}

/** True when NRE stuffed opening-hours prose into OperatorName (e.g. Aberdeen Left Luggage). */
export function looksLikeKbHoursText(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return false
  const hasDay =
    /\b(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i.test(
      normalized
    )
  const hasTime = /\d{1,2}\s*[:.]\s*\d{2}/.test(normalized)
  return hasDay && hasTime
}

/** Parse freeform hours prose like "Monday - Saturday 07:30 - 21:30 & Sunday 09:00 - 21:00". */
export function parseFreeformKbHoursText(text: string): string[] {
  const normalized = text
    .replace(/\s+/g, ' ')
    .replace(/\s*&\s*/g, '\n')
    .replace(/\s*;\s*/g, '\n')
    .trim()
  if (!normalized) return []

  const lines: string[] = []
  for (const part of normalized.split('\n').map((line) => line.trim()).filter(Boolean)) {
    const match = part.match(
      /^(.+?)\s+(\d{1,2})\s*[:.]\s*(\d{2})\s*(?:–|-|to)\s*(\d{1,2})\s*[:.]\s*(\d{2})\s*$/i
    )
    if (!match) {
      const fallback = normalizeKbHoursLine(part)
      if (fallback) lines.push(fallback)
      continue
    }
    const days = normalizeKbHoursDaysPart(match[1].replace(/\s*-\s*/g, ' to '))
    const start = `${match[2].padStart(2, '0')}:${match[3]}`
    const end = `${match[4].padStart(2, '0')}:${match[5]}`
    if (days) lines.push(`${days}: ${start}–${end}`)
  }

  return mergeSameScheduleHoursLines(lines)
}

function resolveLuggageOperatorAndHours(input: {
  available?: string | null
  operator?: string | null
  hours?: string | null
}): { available: string | null; operator: string | null; hours: string | null } {
  const available = input.available?.trim() && input.available !== '—' ? input.available.trim() : null
  let operator = input.operator?.trim() || null
  const hourParts: string[] = []

  if (input.hours?.trim()) hourParts.push(input.hours.trim())

  if (operator && looksLikeKbHoursText(operator)) {
    hourParts.push(...parseFreeformKbHoursText(operator))
    operator = null
  }

  // Unavailable facilities should not surface misfiled OperatorName hours (Aberdeen).
  if (available?.toLowerCase() === 'no') {
    return { available, operator: null, hours: null }
  }

  const hours = hourParts.length > 0 ? mergeSameScheduleHoursLines(hourParts.flatMap((part) => part.split('\n'))).join('\n') : null
  return { available, operator, hours: hours || null }
}

/** Build Left Luggage / Lost Property display: availability, operator, call, hours. */
export function buildLuggagePropertyDisplay(input: {
  available?: string | null
  operator?: string | null
  phone?: string | null
  hours?: string | null
  detailsUrl?: string | null
  extraLines?: string[]
}): { value: string; detailsUrl: string | null } {
  const { available, operator, hours } = resolveLuggageOperatorAndHours(input)
  const detailsUrl =
    input.detailsUrl?.trim() && !isGenericNationalRailHomepage(input.detailsUrl)
      ? input.detailsUrl.trim()
      : null

  const lines: string[] = []
  if (available && operator) lines.push(`${available} - Operated by: ${operator}`)
  else if (available) lines.push(available)
  else if (operator) lines.push(`Operated by: ${operator}`)

  if (input.phone?.trim() && available?.toLowerCase() !== 'no') {
    const call = formatHelplineContactLine(input.phone.trim())
    if (call && !lines.includes(call)) lines.push(call)
  }

  if (hours) {
    for (const hourLine of mergeSameScheduleHoursLines(hours.split('\n'))) {
      if (hourLine && !lines.includes(hourLine)) lines.push(hourLine)
    }
  }

  for (const extra of input.extraLines ?? []) {
    const trimmed = extra.trim()
    if (!trimmed || trimmed === '—') continue
    if (isGenericNationalRailHomepage(trimmed)) continue
    if (detailsUrl && trimmed === detailsUrl) continue
    if (available && trimmed.toLowerCase() === available.toLowerCase()) continue
    if (/^operator name:\s*/i.test(trimmed)) {
      const rest = trimmed.replace(/^operator name:\s*/i, '').trim()
      if (!rest || looksLikeKbHoursText(rest) || (operator && rest.toLowerCase() === operator.toLowerCase())) {
        continue
      }
    }
    if (operator) {
      const lower = trimmed.toLowerCase()
      if (lower === operator.toLowerCase()) continue
      if (lower === `operated by: ${operator.toLowerCase()}`) continue
    }
    if (isKbPhoneLine(trimmed) || /^call\s+/i.test(trimmed)) continue
    if (normalizeKbHoursLine(trimmed) || looksLikeKbHoursText(trimmed)) continue
    if (!lines.includes(trimmed)) lines.push(trimmed)
  }

  return {
    value: lines.join('\n').trim() || '—',
    detailsUrl: available?.toLowerCase() === 'no' ? null : detailsUrl,
  }
}

function isHelplineHoursLine(text: string): boolean {
  const trimmed = stripHelplineNoteMarker(text).trim()
  if (!trimmed) return false
  if (/^meeting point:\s*/i.test(trimmed)) return false
  if (normalizeKbHoursLine(trimmed)) return true
  if (/^monday(?:\s+to\s+sunday)?\s*:\s*24\s*hours$/i.test(trimmed)) return true
  return (
    /^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(trimmed) ||
    /:\s*\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}/.test(trimmed) ||
    /:\s*24\s*hours\b/i.test(trimmed)
  )
}

function isHelplineMeetingPointLine(text: string): boolean {
  return /^meeting point:\s*/i.test(stripHelplineNoteMarker(text).trim())
}

/** Staff availability / assisted-travel prose that belongs under Helpline → Staff help. */
export function isHelplineStaffAssistNote(text: string): boolean {
  const trimmed = stripHelplineNoteMarker(text).trim()
  if (!trimmed) return false
  if (isHelplineBoilerplateNote(trimmed)) return false
  if (isHelplineYesNoNote(trimmed)) return true

  const normalized = trimmed.replace(/\s+/g, ' ').trim().toLowerCase()
  if (/^staff (?:are|is) available\b/.test(normalized)) return true
  if (/\bthe station is staffed\b/.test(normalized)) return true
  if (/\bhelp is available\b/.test(normalized)) return true
  if (/\bassistance is available\b/.test(normalized)) return true
  if (/\bdisability assistance\b/.test(normalized)) return true
  if (/\bmobility assistance\b/.test(normalized)) return true
  if (/\bjourney care\b/.test(normalized)) return true
  if (/\bassisted travel\b/.test(normalized)) return true
  if (/\bstaff (?:ramp )?assistance\b/.test(normalized)) return true
  if (/\bfrom (?:help point|ticket office|first to last train)\b/.test(normalized)) return true
  // Multi-TOC assisted-travel phone lists (King’s Cross / Euston / Leeds).
  if (
    /\b(?:northern|london north eastern|lner|cross ?country|east midlands|transpennine|avanti|hull trains|grand central|great northern|london northwestern|london overground|caledonian sleeper)\b/i.test(
      trimmed
    ) &&
    /\d{5,}/.test(trimmed)
  ) {
    return true
  }
  return false
}

/** Build structured helpline display from merged value + notes (Accessibility). */
export function buildHelplineDisplay(input: {
  value: string
  notes: string[]
  detailsUrl?: string | null
}): { value: string; detailSections: KbDetailSection[]; notes: string[] } {
  const blocks = [
    ...(input.value && input.value !== '—' ? [input.value] : []),
    ...input.notes,
  ].flatMap((text) => helplineTextBlocks(sanitizeKbDisplayText(text)))

  const calls: string[] = []
  const visits: string[] = []
  const yesNo: string[] = []
  const staffAssist: string[] = []
  const hours: string[] = []
  let meetingPoint: string | null = null
  const overflow: string[] = []

  for (const raw of blocks) {
    const line = stripHelplineNoteMarker(raw).trim()
    if (!line || isKbPlaceholderLine(line)) continue
    if (isHelplineBoilerplateNote(line)) continue

    if (isHelplineYesNoNote(line)) {
      yesNo.push(line)
      continue
    }

    const tel = formatHelplineTelLine(line)
    if (tel) {
      if (!calls.includes(tel)) calls.push(tel)
      continue
    }

    if (isKbUrlLine(line)) {
      if (!isGenericNationalRailHomepage(line)) {
        const visit = formatHelplineContactLine(line)
        if (!visits.includes(visit)) visits.push(visit)
      }
      continue
    }

    if (isHelplineMeetingPointLine(line)) {
      meetingPoint = line.replace(/^meeting point:\s*/i, '').trim()
      continue
    }

    if (isHelplineHoursLine(line)) {
      hours.push(line)
      continue
    }

    if (isHelplineStaffAssistNote(line)) {
      staffAssist.push(line)
      continue
    }

    const proseCall = extractHelplineCallFromProse(line)
    if (proseCall) {
      if (!calls.includes(proseCall)) calls.push(proseCall)
      // Keep referral prose in notes rather than Staff help.
      overflow.push(line)
      continue
    }

    overflow.push(line)
  }

  const detailsUrl = input.detailsUrl?.trim()
  if (detailsUrl && !isGenericNationalRailHomepage(detailsUrl)) {
    const visit = formatHelplineContactLine(detailsUrl)
    if (!visits.includes(visit)) visits.push(visit)
  }

  const staffHelpParts = [...yesNo, ...staffAssist]
  const detailSections: KbDetailSection[] = []
  if (staffHelpParts.length > 0) {
    detailSections.push({ label: 'Staff help', value: staffHelpParts.join('\n\n') })
  }
  if (meetingPoint) {
    detailSections.push({ label: 'Meeting point', value: meetingPoint })
  }
  if (hours.length > 0) {
    detailSections.push({ label: 'Hours', value: dedupeKbHoursLines(hours).join('\n') })
  }

  let value = combineHelplineContactLine(calls, visits) ?? ''
  if (!value && yesNo.length === 1 && staffAssist.length === 0) value = yesNo[0]
  // Never promote long staff-assist prose to the Helpline headline.
  if (!value && overflow.length > 0 && !isHelplineStaffAssistNote(overflow[0])) {
    value = overflow[0]
  }

  const leftoverOverflow = overflow.filter((line, index) => !(index === 0 && line === value))
  const notes = leftoverOverflow.length > 0 ? [leftoverOverflow.join('\n\n')] : []

  return {
    value: value || '—',
    detailSections,
    notes,
  }
}

function helplineTextBlocks(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .flatMap((block) => {
      const trimmed = block.trim()
      if (!trimmed) return []
      if (!trimmed.includes('\n')) return [trimmed]
      return trimmed
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    })
    .filter(Boolean)
}

/** Split helpline display text into the main value (number, hours) and note overlay content. */
export function partitionHelplineText(text: string): { main: string; notes: string[] } {
  const main: string[] = []
  const notes: string[] = []

  for (const block of helplineTextBlocks(text)) {
    if (isHelplineBoilerplateNote(block)) notes.push(sanitizeKbDisplayText(block))
    else main.push(block)
  }

  return {
    main: main.join('\n').trim(),
    notes,
  }
}

export { helplineTextBlocks as splitHelplineTextBlocks }

/** Pull short Yes/No availability lines out of helpline notes into the main value. */
export function partitionHelplineNotes(notes: string[]): { yesNo: string[]; other: string[] } {
  const yesNo: string[] = []
  const other: string[] = []

  for (const note of notes) {
    const cleaned = sanitizeKbDisplayText(note)
    if (!cleaned) continue

    const lines = helplineTextBlocks(cleaned)
      .map((line) => stripHelplineNoteMarker(line))
      .filter(Boolean)
    if (lines.length === 0) continue

    const kept: string[] = []
    for (const line of lines) {
      if (isHelplineYesNoNote(line)) yesNo.push(line)
      else kept.push(line)
    }

    if (kept.length > 0) {
      const joined = kept.join('\n').trim()
      if (joined) other.push(joined)
    }
  }

  return { yesNo, other }
}

/** URL lines removed from the helpline main value — append to notes instead. */
export function extractHelplineUrlLines(text: string): string[] {
  return helplineTextBlocks(text)
    .map((line) => stripHelplineNoteMarker(line))
    .filter((line) => line && isKbUrlLine(line))
    .map((line) => line.trim())
}

export function isGenericNationalRailHomepage(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase()
    return host === 'nationalrail.co.uk' && (parsed.pathname === '/' || parsed.pathname === '')
  } catch {
    return /^https?:\/\/(www\.)?nationalrail\.co\.uk\/?$/i.test(trimmed)
  }
}

const KB_FIELDS_HIDING_GENERIC_NRE_HOMEPAGE = new Set(['LeftLuggage', 'LostProperty'])

/** Drop unhelpful placeholder URLs from specific KB fields. */
export function stripHiddenKbFieldUrls(value: string, fieldKey?: string): string {
  if (!fieldKey || !KB_FIELDS_HIDING_GENERIC_NRE_HOMEPAGE.has(fieldKey)) return value
  const filtered = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !isGenericNationalRailHomepage(line))
  const joined = filtered.join('\n').trim()
  if (joined) return joined
  return value.trim() ? '—' : value
}

type StepFreeCategoryMatch = { category: string; description: string | null }

const STEP_FREE_CATEGORY_INLINE_PATTERNS: Array<{ pattern: RegExp; descriptionGroup: number }> = [
  { pattern: /^Accessibility Category ([A-Z]\d?)\.\s*(.+)$/i, descriptionGroup: 2 },
  { pattern: /^This is a Category ([A-Z]\d?) station[:.]\s*(.+)$/i, descriptionGroup: 2 },
  {
    pattern: /^This station has been classified as a step-free access category ([A-Z]\d?) station\.\s*(.+)$/i,
    descriptionGroup: 2,
  },
  { pattern: /^Step[- ]?free category ([A-Z]\d?) [Ss]tation\.\s*(.+)$/i, descriptionGroup: 2 },
  { pattern: /^Step[- ]?free Category ([A-Z]\d?) [Ss]tation\s*[-–—]\s*(.+)$/i, descriptionGroup: 2 },
  { pattern: /^Step free Category ([A-Z]\d?) station\s*[-–—]\s*(.+)$/i, descriptionGroup: 2 },
  { pattern: /^Category ([A-Z]\d?):\s*(.+)$/i, descriptionGroup: 2 },
  { pattern: /^Category ([A-Z]\d?)\s*[-–—]\s*(.+)$/i, descriptionGroup: 2 },
  { pattern: /^(?:Accessibility\s+)?Category ([A-Z]\d?)\.\s*(.+)$/i, descriptionGroup: 2 },
  { pattern: /^Category ([A-Z]\d?) [Ss]tation\s+(.+)$/i, descriptionGroup: 2 },
  { pattern: /^Step[- ]?free Category ([A-Z]\d?) [Ss]tation\s+(.+)$/i, descriptionGroup: 2 },
  {
    pattern: /^This station is a category ([A-Z]\d?) station(?: according to[^.]*)?\.\s*(.*)$/i,
    descriptionGroup: 2,
  },
]

const STEP_FREE_CATEGORY_LABEL_PATTERNS: RegExp[] = [
  /^Accessibility Category ([A-Z]\d?)\.?\s*$/i,
  /^Category ([A-Z]\d?)\.?\s*$/i,
  /^Step[- ]?free Category ([A-Z]\d?) [Ss]tation\s*$/i,
]

function normalizeStepFreeCategoryLine(text: string): string {
  return text.replace(/^[\s•\-–*]+/, '').replace(/\s+/g, ' ').trim()
}

function isStepFreeCoverageLine(text: string): boolean {
  return /^coverage:\s*/i.test(text.trim())
}

const SUITABLE_FOR_DISABLED_PASSENGERS = /\bsuitable\s+for\s+disabled\s+passengers\b/i
const DEFAULT_STEP_FREE_CATEGORY_A_DESCRIPTION = 'This station has step-free access to all platforms.'

/** Infer Category A from “Suitable for disabled passengers” prose (Leeds / Euston style). */
function matchSuitableForDisabledPassengersCategory(text: string): StepFreeCategoryMatch | null {
  const normalized = normalizeStepFreeCategoryLine(text)
  if (!normalized || !SUITABLE_FOR_DISABLED_PASSENGERS.test(normalized)) return null

  const withoutLeadIn = normalized
    .replace(/^\s*suitable\s+for\s+disabled\s+passengers\.?\s*/i, '')
    .trim()
  const description = withoutLeadIn || DEFAULT_STEP_FREE_CATEGORY_A_DESCRIPTION
  return { category: 'A', description }
}

function matchStepFreeCategoryLine(text: string): StepFreeCategoryMatch | null {
  const normalized = normalizeStepFreeCategoryLine(text)
  if (!normalized) return null

  for (const { pattern, descriptionGroup } of STEP_FREE_CATEGORY_INLINE_PATTERNS) {
    const match = normalized.match(pattern)
    if (!match) continue
    const description = match[descriptionGroup]?.trim() ?? ''
    return { category: match[1].toUpperCase(), description: description || null }
  }

  for (const pattern of STEP_FREE_CATEGORY_LABEL_PATTERNS) {
    const match = normalized.match(pattern)
    if (match) return { category: match[1].toUpperCase(), description: null }
  }

  return matchSuitableForDisabledPassengersCategory(normalized)
}

function isStepFreeCategoryDescriptionCandidate(text: string): boolean {
  const normalized = normalizeStepFreeCategoryLine(text)
  if (!normalized) return false
  if (isStepFreeCoverageLine(normalized)) return false
  return !matchStepFreeCategoryLine(normalized)
}

function descriptionFromFollowingLines(
  lines: string[],
  startIndex: number
): { description: string; consumedThrough: number } | null {
  for (let index = startIndex; index < lines.length; index++) {
    if (!isStepFreeCategoryDescriptionCandidate(lines[index])) continue
    return {
      description: normalizeStepFreeCategoryLine(lines[index]),
      consumedThrough: index,
    }
  }
  return null
}

function descriptionFromFollowingParagraphs(paragraphs: string[], startIndex: number): string | null {
  for (let index = startIndex; index < paragraphs.length; index++) {
    const paragraph = paragraphs[index]?.trim()
    if (!paragraph) continue
    const firstLine = paragraph.split('\n')[0] ?? paragraph
    if (!isStepFreeCategoryDescriptionCandidate(firstLine)) continue
    return paragraph
  }
  return null
}

function resolveStepFreeCategoryMatch(
  match: StepFreeCategoryMatch,
  description: string | null
): { category: string; description: string } | null {
  const resolvedDescription = description?.trim()
  if (!resolvedDescription) return null
  return { category: match.category, description: resolvedDescription }
}

function ensureStepFreeCategorySentence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

/** Parse an NRE step-free accessibility category line from StepFreeAccess notes. */
export function extractStepFreeCategoryFromText(text: string): { category: string; description: string } | null {
  const match = matchStepFreeCategoryLine(text)
  if (!match?.description) return null
  return { category: match.category, description: match.description }
}

export function formatStepFreeCategoryValue(category: string, description: string): string {
  return `${category} (${ensureStepFreeCategorySentence(description)})`
}

/** Pull the accessibility category out of StepFreeAccess notes into a compact display value. */
export function splitStepFreeCategoryFromNotes(notes: string[]): {
  categoryValue: string | null
  remainingNotes: string[]
} {
  let categoryValue: string | null = null
  const remainingNotes: string[] = []

  for (const note of notes) {
    const trimmedNote = note.trim()
    if (!trimmedNote) continue

    const lines = trimmedNote.split('\n')
    const keptLines: string[] = []
    let foundInNote = false

    for (let index = 0; index < lines.length; index++) {
      const match = matchStepFreeCategoryLine(lines[index])
      if (match && !categoryValue) {
        let description = match.description
        if (!description) {
          const next = descriptionFromFollowingLines(lines, index + 1)
          if (next) {
            description = next.description
            index = next.consumedThrough
          }
        }

        const resolved = resolveStepFreeCategoryMatch(match, description)
        if (resolved) {
          categoryValue = formatStepFreeCategoryValue(resolved.category, resolved.description)
          foundInNote = true
          continue
        }
      }

      keptLines.push(lines[index])
    }

    if (foundInNote) {
      const kept = keptLines.join('\n').trim()
      if (kept) remainingNotes.push(kept)
      continue
    }

    const paragraphs = trimmedNote.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
    const firstParagraph = paragraphs[0]
    const firstMatch = firstParagraph ? matchStepFreeCategoryLine(firstParagraph) : null
    if (firstMatch && !categoryValue) {
      let description = firstMatch.description
      let consumedParagraphs = 1

      if (!description) {
        const nextDescription = descriptionFromFollowingParagraphs(paragraphs, 1)
        if (nextDescription) {
          description = nextDescription
          consumedParagraphs = 2
        }
      }

      const resolved = resolveStepFreeCategoryMatch(firstMatch, description)
      if (resolved) {
        categoryValue = formatStepFreeCategoryValue(resolved.category, resolved.description)
        const rest = paragraphs.slice(consumedParagraphs).join('\n\n').trim()
        if (rest) remainingNotes.push(rest)
        continue
      }
    }

    remainingNotes.push(trimmedNote)
  }

  return { categoryValue, remainingNotes }
}

function isKbShortAvailabilityValue(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  return normalized === 'yes' || normalized === 'no' || normalized === 'true' || normalized === 'false'
}

function isStepFreeCategoryA(categoryValue: string): boolean {
  return /^A\s*\(/i.test(categoryValue.trim())
}

/** Merge remaining step-free note lines into one plain-text block. */
export function combineStepFreeNotes(notes: string[]): string[] {
  const parts = notes
    .flatMap((note) => note.split('\n'))
    .map((line) => line.replace(/^[\s•\-–*]+/, '').trim())
    .filter((line) => line && !isStepFreeCoverageLine(line))

  const combined = parts.join('\n\n').trim()
  return combined ? [combined] : []
}

/** Extract step-free category from StepFreeAccess value and/or notes into a standard row. */
export function splitStepFreeCategoryFromStepFreeAccess(input: {
  value: string
  notes: string[]
}): {
  categoryValue: string | null
  value: string
  notes: string[]
} {
  const sources = [
    ...(input.value && input.value !== '—' ? [input.value] : []),
    ...input.notes,
  ]
  const { categoryValue, remainingNotes } = splitStepFreeCategoryFromNotes(sources)
  if (!categoryValue) {
    return { categoryValue: null, value: input.value, notes: input.notes }
  }

  const keepOriginalValue =
    input.value &&
    input.value !== '—' &&
    !matchStepFreeCategoryLine(input.value) &&
    isKbShortAvailabilityValue(input.value)

  let value = keepOriginalValue ? input.value : '—'
  let notes = remainingNotes

  // Category A (letter or inferred from “Suitable for disabled passengers”) → Yes.
  if (isStepFreeCategoryA(categoryValue)) {
    value = 'Yes'
    notes = combineStepFreeNotes(remainingNotes)
  }

  return {
    categoryValue,
    value,
    notes,
  }
}

/** Preserve line breaks in KB location text while normalising horizontal whitespace. */
export function normalizeKbLocationText(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}

/** Location display text without leading bullet markers. */
export function formatKbLocationDisplayText(text: string): string {
  return splitKbLocationParts(text)
    .map((part) => part.replace(/^[\s•\-–*]+/, '').trim())
    .filter(Boolean)
    .join('\n\n')
}

const BABY_CHANGE_LOCATION_PATTERN = /baby\s*chang|parent\s*&\s*baby|breastfeeding\s*room/i

function splitKbLocationParts(location: string): string[] {
  return location
    .split(/\n{2,}|\n(?=• )/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Split toilet location notes so baby-change details can move to the Baby Change row. */
export function splitToiletsLocationItems(location: string | null | undefined): {
  toiletLocation: string | null
  babyChangeLocation: string | null
} {
  if (!location?.trim()) return { toiletLocation: null, babyChangeLocation: null }

  const toiletParts: string[] = []
  const babyParts: string[] = []

  for (const part of splitKbLocationParts(location)) {
    const plain = part.replace(/^•\s*/, '').trim()
    if (BABY_CHANGE_LOCATION_PATTERN.test(plain)) babyParts.push(part)
    else toiletParts.push(part)
  }

  return {
    toiletLocation: toiletParts.length ? toiletParts.join('\n\n') : null,
    babyChangeLocation: babyParts.length ? babyParts.join('\n\n') : null,
  }
}

function isFirstClassLoungeSectionLabel(text: string): boolean {
  const trimmed = text.replace(/:\s*$/, '').trim()
  if (!trimmed || trimmed.includes('\n')) return false
  const normalized = trimmed.toLowerCase()
  if (/^(located|location|facilities|refreshments|wi-fi|wifi)\b/.test(normalized)) return true
  if (/^tickets accepted\b/i.test(trimmed)) return true
  if (/^showers\b/i.test(trimmed)) return true
  if (/[.!?]$/.test(trimmed)) return false
  if (trimmed.length > 72 || trimmed.split(/\s+/).length > 10) return false
  return /^[A-Za-z0-9][A-Za-z0-9\s&'()-]*$/.test(trimmed)
}

function normalizeFirstClassLoungeSectionLabel(label: string): string {
  return label.replace(/:\s*$/, '').trim()
}

/** Parse structured First Class Lounge notes into labelled sections. */
export function parseFirstClassLoungeSections(note: string): KbDetailSection[] {
  const blocks = note
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
  const sections: KbDetailSection[] = []
  const introParts: string[] = []

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    const inline = block.match(/^([^:\n]{2,120}):\s*([\s\S]+)$/)
    if (inline && !block.includes('\n• ')) {
      sections.push({
        label: normalizeFirstClassLoungeSectionLabel(inline[1]),
        value: formatKbLocationDisplayText(inline[2].trim()),
      })
      continue
    }

    if (isFirstClassLoungeSectionLabel(block)) {
      const label = normalizeFirstClassLoungeSectionLabel(block)
      i++
      if (i >= blocks.length) {
        sections.push({ label, value: '—' })
        break
      }

      let value = blocks[i]
      while (i + 1 < blocks.length) {
        const next = blocks[i + 1]
        if (isFirstClassLoungeSectionLabel(next)) break
        const inlineNext = next.match(/^([^:\n]{2,120}):\s*([\s\S]+)$/)
        if (inlineNext && !next.includes('\n• ')) break
        i++
        value = `${value}\n\n${blocks[i]}`
      }

      sections.push({ label, value: formatKbLocationDisplayText(value) })
      continue
    }

    introParts.push(formatKbLocationDisplayText(block))
  }

  if (introParts.length > 0) {
    sections.unshift({ label: 'Details', value: introParts.join('\n\n') })
  }

  return sections
}

export function hasStructuredFirstClassLoungeSections(sections: KbDetailSection[]): boolean {
  return sections.some(
    (section) =>
      section.label !== 'Details' &&
      /^(located|location|tickets accepted|facilities|refreshments|wi-fi|wifi|showers)/i.test(
        section.label
      )
  )
}

export function hasRadarKeyMention(text: string): boolean {
  return /radar\s*key/i.test(text)
}

/** Hours qualifier from National Key Toilets notes, e.g. "during ticket office opening hours". */
export function extractNationalKeyToiletHoursQualifier(text: string): string | null {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const match =
    normalized.match(/\b(?:available|this is available)\s+(during\s+.+?opening\s+hours)/i) ??
    normalized.match(/\b(during\s+ticket\s+office\s+opening\s+hours)/i) ??
    normalized.match(/\b(during\s+.+?opening\s+hours)/i)
  if (!match) return null
  const phrase = match[1].trim().replace(/\.$/, '')
  return phrase.charAt(0).toLowerCase() + phrase.slice(1)
}

export function cleanNationalKeyToiletLocation(location: string): string {
  const sentences = location
    .split(/[.;]\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => !hasRadarKeyMention(sentence))
    .filter((sentence) => !extractNationalKeyToiletHoursQualifier(sentence))

  return sentences.join('. ').trim()
}

export function buildNationalKeyToiletsDisplay(input: {
  value: string
  notes: string[]
  location: string | null
}): { value: string; notes: string[]; location: string | null } {
  const allText = [input.value, input.location ?? '', ...input.notes].join('\n')
  if (!hasRadarKeyMention(allText)) return input

  let location = input.location
  if (location) {
    const cleaned = cleanNationalKeyToiletLocation(location)
    location = cleaned || null
  }

  const hours = extractNationalKeyToiletHoursQualifier(allText)
  if (!hours) {
    if (input.value === '—') return { ...input, value: 'Yes', location }
    return { ...input, location }
  }

  const displayValue =
    input.value === 'Yes' || input.value === '—' ? `Yes - ${hours}` : `${input.value} - ${hours}`

  const notes = input.notes.filter((note) => !extractNationalKeyToiletHoursQualifier(note))

  return { value: displayValue, notes, location }
}
