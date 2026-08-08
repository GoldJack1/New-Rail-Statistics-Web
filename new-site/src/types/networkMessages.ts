import type { NetworkCollectionId } from '@/constants/stationCollections'

/** Firestore collection id for network-wide station browse/detail alerts. */
export const NETWORK_MESSAGES_COLLECTION = 'networkmessages'

/** Max paragraphs stored / rendered per network message. */
export const NETWORK_MESSAGE_MAX_PARAGRAPHS = 5

/** Max bullet items under a single paragraph. */
export const NETWORK_MESSAGE_MAX_BULLETS = 12

/**
 * Priority: lower number = higher urgency (shown first).
 * Keep in sync with any admin tooling that writes `networkmessages`.
 * TextCard colour: 1 red-action, 2 accent, 3 fav-action, 4 primary, 5 green-action.
 */
export type NetworkMessagePriority = 1 | 2 | 3 | 4 | 5

/**
 * Bullet row. Optional `lineChip` renders a coloured BUTOperatorChip before the text.
 * Value depends on the message network: light-rail line name, or TOC operator name.
 */
export type NetworkMessageBullet = {
  text: string
  /**
   * Chip key for the message network:
   * - light rail: Blue | Yellow | Purple | Tram-Train
   * - other networks: TOC names that appear on stations in that network
   */
  lineChip?: string
}

/**
 * One body block: intro/text plus optional bullet list.
 * Firestore may store a plain string (treated as text-only) or `{ text, bullets }`.
 */
export type NetworkMessageParagraph = {
  text: string
  bullets: NetworkMessageBullet[]
}

export type NetworkMessage = {
  id: string
  /** Target network collection id (e.g. `stations_gbnr`). */
  network: NetworkCollectionId
  priority: NetworkMessagePriority
  title: string
  /**
   * Up to 5 body paragraphs. Plain text / bullets; URLs (`https://…`, `www.…`) are linkified in the UI.
   * Prefer this over `body`.
   */
  paragraphs: NetworkMessageParagraph[]
  /**
   * Legacy single body string. Used only when `paragraphs` is empty
   * (split on blank lines into up to 5 paragraphs).
   */
  body: string
  /**
   * Optional short body shown while collapsed. When set, preferred over the first paragraph.
   */
  preview?: string
  /**
   * When true, start collapsed with a Show more control.
   * When false, always fully expanded.
   * When omitted, auto: collapse if preview is set, there is more than one paragraph, any bullets, or a long first paragraph.
   */
  collapsible?: boolean
  /** Inclusive window start (ms since epoch). Omit for no start bound. */
  startsAtMs?: number
  /** Inclusive window end (ms since epoch). Omit for no end bound. */
  endsAtMs?: number
  /** When false, the message is hidden from public UI. */
  active: boolean
  createdAtMs?: number
  updatedAtMs?: number
}

/** Admin composer / write payload (no id / timestamps). */
export type NetworkMessageDraftInput = {
  network: NetworkCollectionId
  priority: NetworkMessagePriority
  title: string
  preview?: string
  paragraphs: NetworkMessageParagraph[]
  body?: string
  collapsible?: boolean
  startsAtMs?: number | null
  endsAtMs?: number | null
  active?: boolean
}

export function emptyNetworkMessageDraft(
  network: NetworkCollectionId = 'stations_gbnr'
): NetworkMessageDraftInput {
  return {
    network,
    priority: 1,
    title: '',
    preview: '',
    paragraphs: [{ text: '', bullets: [] }],
    body: '',
    collapsible: true,
    startsAtMs: null,
    endsAtMs: null,
    active: false
  }
}

export function normalizeNetworkMessageDraftInput(
  input: NetworkMessageDraftInput
): NetworkMessageDraftInput {
  const paragraphs = normalizeNetworkMessageParagraphs(input.paragraphs, input.body ?? '')
  return {
    network: input.network,
    priority: input.priority,
    title: String(input.title ?? '').trim(),
    preview: String(input.preview ?? '').trim() || undefined,
    paragraphs: paragraphs.length > 0 ? paragraphs : [{ text: '', bullets: [] }],
    body: '',
    collapsible: input.collapsible !== false,
    startsAtMs: input.startsAtMs ?? null,
    endsAtMs: input.endsAtMs ?? null,
    active: input.active === true
  }
}

export function validateNetworkMessageDraftInput(input: NetworkMessageDraftInput): string[] {
  const errors: string[] = []
  const normalized = normalizeNetworkMessageDraftInput(input)
  if (!normalized.title) errors.push('Title is required.')
  const hasBody = normalized.paragraphs.some(
    (p) => p.text.trim() || p.bullets.some((b) => b.text.trim() || b.lineChip)
  )
  if (!hasBody && !normalized.preview) {
    errors.push('Add a preview or at least one paragraph.')
  }
  if (
    normalized.startsAtMs != null &&
    normalized.endsAtMs != null &&
    normalized.startsAtMs > normalized.endsAtMs
  ) {
    errors.push('Start time must be before end time.')
  }
  return errors
}

/** Whether the banner should offer collapse for this message. */
export function networkMessageIsCollapsible(
  message: Pick<NetworkMessage, 'collapsible' | 'paragraphs' | 'preview'>
): boolean {
  if (message.collapsible === false) return false
  if (message.collapsible === true) return true
  if (message.preview?.trim()) return true
  const paragraphs = message.paragraphs
  if (paragraphs.length > 1) return true
  if (paragraphs.some((p) => p.bullets.length > 0)) return true
  return (paragraphs[0]?.text.length ?? 0) > 220
}

/** Whether a message should show right now (active flag + optional schedule window). */
export function networkMessageIsScheduledNow(
  message: Pick<NetworkMessage, 'active' | 'startsAtMs' | 'endsAtMs'>,
  nowMs: number = Date.now()
): boolean {
  if (!message.active) return false
  if (message.startsAtMs != null && nowMs < message.startsAtMs) return false
  if (message.endsAtMs != null && nowMs > message.endsAtMs) return false
  return true
}

function normalizeBullets(value: unknown): NetworkMessageBullet[] {
  if (!Array.isArray(value)) return []
  const bullets: NetworkMessageBullet[] = []
  for (const item of value) {
    if (typeof item === 'string') {
      const text = item.trim()
      if (text) bullets.push({ text })
      continue
    }
    if (!item || typeof item !== 'object') continue
    const record = item as { text?: unknown; lineChip?: unknown }
    const text = typeof record.text === 'string' ? record.text.trim() : ''
    const lineChip =
      typeof record.lineChip === 'string' && record.lineChip.trim()
        ? record.lineChip.trim()
        : undefined
    if (!text && !lineChip) continue
    bullets.push(lineChip ? { text, lineChip } : { text })
  }
  return bullets.slice(0, NETWORK_MESSAGE_MAX_BULLETS)
}

function mapParagraphEntry(entry: unknown): NetworkMessageParagraph | null {
  if (typeof entry === 'string') {
    const text = entry.trim()
    return text ? { text, bullets: [] } : null
  }
  if (!entry || typeof entry !== 'object') return null
  const record = entry as { text?: unknown; bullets?: unknown }
  const text = typeof record.text === 'string' ? record.text.trim() : ''
  const bullets = normalizeBullets(record.bullets)
  if (!text && bullets.length === 0) return null
  return { text, bullets }
}

/** Normalize stored paragraphs / legacy body into at most 5 paragraph blocks. */
export function normalizeNetworkMessageParagraphs(
  paragraphs: unknown,
  body: unknown
): NetworkMessageParagraph[] {
  if (Array.isArray(paragraphs)) {
    const mapped = paragraphs
      .map(mapParagraphEntry)
      .filter((p): p is NetworkMessageParagraph => p != null)
    if (mapped.length > 0) {
      return mapped.slice(0, NETWORK_MESSAGE_MAX_PARAGRAPHS)
    }
  }
  const legacy = typeof body === 'string' ? body.trim() : ''
  if (!legacy) return []
  return legacy
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, NETWORK_MESSAGE_MAX_PARAGRAPHS)
    .map((text) => ({ text, bullets: [] as NetworkMessageBullet[] }))
}
