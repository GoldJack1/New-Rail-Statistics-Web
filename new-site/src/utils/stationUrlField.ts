import type { StationCollectionId } from '../constants/stationCollections'
import { isNetworkCollection } from '../constants/stationCollections'
import { getStationDetailLayoutProfile } from '../constants/stationDetailLayoutProfiles'
import type { SandboxStationDoc } from '../types'

export type StationUrlFieldKey = 'url' | 'urlSlug'

export function getStationUrlFieldKey(collectionId: StationCollectionId): StationUrlFieldKey {
  if (isNetworkCollection(collectionId)) {
    return getStationDetailLayoutProfile(collectionId).urlFieldKey
  }
  return 'urlSlug'
}

export function getStationUrlFieldLabel(collectionId: StationCollectionId): string {
  if (isNetworkCollection(collectionId)) {
    return getStationDetailLayoutProfile(collectionId).urlFieldLabel
  }
  return 'URL slug'
}

export function readStationUrl(doc: Partial<SandboxStationDoc> | null | undefined): string {
  if (!doc) return ''
  return String(doc.url ?? doc.urlSlug ?? '').trim()
}

/** Prefer in-form edits over the loaded Firestore document. */
export function readEditedStationUrl(
  form: Partial<SandboxStationDoc> | null | undefined,
  doc: Partial<SandboxStationDoc> | null | undefined,
  urlFieldKey: StationUrlFieldKey
): string {
  const formValue = form?.[urlFieldKey]
  if (formValue !== undefined && formValue !== null) {
    return String(formValue).trim()
  }
  return readStationUrl(doc)
}

/** Resolve a stored URL value to an openable href, or null if not linkable. */
export function resolveStationUrlHref(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`
  return null
}

export function writeStationUrlPayload(
  collectionId: StationCollectionId,
  value: string
): Partial<SandboxStationDoc> {
  const key = getStationUrlFieldKey(collectionId)
  return { [key]: value } as Partial<SandboxStationDoc>
}
