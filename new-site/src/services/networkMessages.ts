import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentData,
  type Firestore
} from 'firebase/firestore'
import { initializeFirebase } from './firebase'
import {
  NETWORK_COLLECTION_IDS,
  type NetworkCollectionId,
  type NetworkViewFilter
} from '@/constants/stationCollections'
import {
  NETWORK_MESSAGES_COLLECTION,
  networkMessageIsScheduledNow,
  normalizeNetworkMessageDraftInput,
  normalizeNetworkMessageParagraphs,
  validateNetworkMessageDraftInput,
  type NetworkMessage,
  type NetworkMessageDraftInput,
  type NetworkMessagePriority
} from '@/types/networkMessages'

const ensureFirestore = async (): Promise<Firestore> => {
  const initialized = await initializeFirebase()
  if (!initialized.db) throw new Error('Firestore is not available.')
  return initialized.db
}

const toMs = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as { toMillis?: () => number }
  return typeof candidate.toMillis === 'function' ? candidate.toMillis() : undefined
}

const parsePriority = (value: unknown): NetworkMessagePriority => {
  const n = typeof value === 'number' ? value : Number(value)
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n
  return 3
}

const isNetworkCollectionId = (value: unknown): value is NetworkCollectionId =>
  typeof value === 'string' && (NETWORK_COLLECTION_IDS as readonly string[]).includes(value)

const mapNetworkMessageDoc = (id: string, data: DocumentData): NetworkMessage | null => {
  if (!isNetworkCollectionId(data.network)) return null
  const title = String(data.title ?? '').trim()
  const paragraphs = normalizeNetworkMessageParagraphs(data.paragraphs, data.body)
  const body = String(data.body ?? '').trim()
  const preview = typeof data.preview === 'string' ? data.preview.trim() : ''
  if (!title && paragraphs.length === 0 && !preview) return null
  const startsAtMs = toMs(data.startsAt ?? data.startsAtMs)
  const endsAtMs = toMs(data.endsAt ?? data.endsAtMs)
  return {
    id,
    network: data.network,
    priority: parsePriority(data.priority),
    title,
    paragraphs,
    body,
    ...(preview ? { preview } : {}),
    ...(typeof data.collapsible === 'boolean' ? { collapsible: data.collapsible } : {}),
    ...(startsAtMs != null ? { startsAtMs } : {}),
    ...(endsAtMs != null ? { endsAtMs } : {}),
    active: data.active !== false,
    createdAtMs: toMs(data.createdAt),
    updatedAtMs: toMs(data.updatedAt)
  }
}

const byPriorityThenTitle = (a: NetworkMessage, b: NetworkMessage): number => {
  if (a.priority !== b.priority) return a.priority - b.priority
  return a.title.localeCompare(b.title)
}

const byUpdatedThenTitle = (a: NetworkMessage, b: NetworkMessage): number => {
  const aMs = a.updatedAtMs ?? a.createdAtMs ?? 0
  const bMs = b.updatedAtMs ?? b.createdAtMs ?? 0
  if (aMs !== bMs) return bMs - aMs
  return a.title.localeCompare(b.title)
}

const buildWritePayload = (input: NetworkMessageDraftInput): Record<string, unknown> => {
  const normalized = normalizeNetworkMessageDraftInput(input)
  const errors = validateNetworkMessageDraftInput(normalized)
  if (errors.length > 0) throw new Error(errors.join(' '))

  return {
    network: normalized.network,
    priority: normalized.priority,
    title: normalized.title,
    preview: normalized.preview ?? '',
    paragraphs: normalized.paragraphs,
    body: '',
    collapsible: normalized.collapsible !== false,
    active: normalized.active === true,
    startsAt:
      normalized.startsAtMs != null ? Timestamp.fromMillis(normalized.startsAtMs) : null,
    endsAt: normalized.endsAtMs != null ? Timestamp.fromMillis(normalized.endsAtMs) : null,
    updatedAt: serverTimestamp()
  }
}

/** Load all network messages (small collection — filter/sort on the client). */
export async function listNetworkMessages(): Promise<NetworkMessage[]> {
  const db = await ensureFirestore()
  const snap = await getDocs(collection(db, NETWORK_MESSAGES_COLLECTION))
  const messages: NetworkMessage[] = []
  snap.forEach((docSnap) => {
    if (docSnap.id.startsWith('_')) return
    const mapped = mapNetworkMessageDoc(docSnap.id, docSnap.data())
    if (mapped) messages.push(mapped)
  })
  return messages.sort(byPriorityThenTitle)
}

/** Admin list with optional active filter + search. */
export async function listNetworkMessagesForAdmin(options?: {
  active?: 'all' | 'active' | 'inactive'
  network?: NetworkViewFilter
  search?: string
}): Promise<NetworkMessage[]> {
  const messages = await listNetworkMessages()
  const searchTerm = options?.search?.trim().toLowerCase() ?? ''
  return messages
    .filter((message) => {
      if (options?.active === 'active' && !message.active) return false
      if (options?.active === 'inactive' && message.active) return false
      if (options?.network && options.network !== 'all' && message.network !== options.network) {
        return false
      }
      if (!searchTerm) return true
      const haystack = [
        message.title,
        message.preview ?? '',
        ...message.paragraphs.map((p) => p.text),
        ...message.paragraphs.flatMap((p) => p.bullets.map((b) => b.text))
      ]
        .join('\n')
        .toLowerCase()
      return haystack.includes(searchTerm)
    })
    .sort(byUpdatedThenTitle)
}

export async function getNetworkMessage(messageId: string): Promise<NetworkMessage | null> {
  const db = await ensureFirestore()
  const snapshot = await getDoc(doc(db, NETWORK_MESSAGES_COLLECTION, messageId))
  if (!snapshot.exists()) return null
  return mapNetworkMessageDoc(snapshot.id, snapshot.data())
}

export async function createNetworkMessage(input: NetworkMessageDraftInput): Promise<string> {
  const db = await ensureFirestore()
  const payload = buildWritePayload(input)
  const refSnap = await addDoc(collection(db, NETWORK_MESSAGES_COLLECTION), {
    ...payload,
    createdAt: serverTimestamp()
  })
  return refSnap.id
}

export async function updateNetworkMessage(
  messageId: string,
  input: NetworkMessageDraftInput
): Promise<void> {
  const db = await ensureFirestore()
  const payload = buildWritePayload(input)
  await updateDoc(doc(db, NETWORK_MESSAGES_COLLECTION, messageId), payload)
}

export async function setNetworkMessageActive(messageId: string, active: boolean): Promise<void> {
  const db = await ensureFirestore()
  await updateDoc(doc(db, NETWORK_MESSAGES_COLLECTION, messageId), {
    active,
    updatedAt: serverTimestamp()
  })
}

export async function deleteNetworkMessage(messageId: string): Promise<void> {
  const db = await ensureFirestore()
  await deleteDoc(doc(db, NETWORK_MESSAGES_COLLECTION, messageId))
}

/** Active + in-schedule messages for a browse network tab (`all` = every network) or a single collection. */
export function filterNetworkMessagesForView(
  messages: NetworkMessage[],
  networkView: NetworkViewFilter | NetworkCollectionId,
  nowMs: number = Date.now()
): NetworkMessage[] {
  const active = messages.filter((m) => networkMessageIsScheduledNow(m, nowMs))
  if (networkView === 'all') return active.sort(byPriorityThenTitle)
  return active.filter((m) => m.network === networkView).sort(byPriorityThenTitle)
}

export const getNetworkMessagesCollectionName = (): string => NETWORK_MESSAGES_COLLECTION
