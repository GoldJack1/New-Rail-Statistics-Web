import type { SandboxStationDoc, Station } from '@/types'
import type { StationCollectionId } from '@/constants/stationCollections'
import type { ScheduledJobStationPayload } from '@/utils/scheduledJobPendingMatch'

export interface ServerScheduledJobDetail {
  jobId: string
  runAtMs: number
  status: string
  errorMessage?: string
  stationIds: string[]
  stationLabels: Record<string, string>
  scheduledChanges: Record<string, ScheduledJobStationPayload> | null
}

export interface PendingChangeEntry {
  targetCollectionId: StationCollectionId
  original: Station
  updated: Partial<Station>
  /** Optional sandbox-only extra fields (for newsandboxstations1). */
  sandboxUpdated?: Partial<SandboxStationDoc> | null
  /** Snapshot of additional fields before edit (for per-field review diffs). */
  sandboxOriginal?: Partial<SandboxStationDoc> | null
  isNew?: boolean
}

export interface PendingStationChangesContextValue {
  pendingChanges: Record<string, PendingChangeEntry>
  upsertPendingChange: (
    station: Station,
    updated: Partial<Station>,
    targetCollectionId: StationCollectionId,
    sandboxUpdated?: Partial<SandboxStationDoc> | null,
    sandboxOriginal?: Partial<SandboxStationDoc> | null
  ) => void
  addNewPendingStation: (
    stationId: string,
    updated: Partial<Station>,
    targetCollectionId: StationCollectionId,
    sandboxUpdated?: Partial<SandboxStationDoc> | null
  ) => void
  clearPendingChange: (stationId: string) => void
  clearAllPendingChanges: () => void
  clearPendingChangesForIds: (stationIds: string[]) => void
  trackedScheduledJobId: string | null
  registerScheduledServerJob: (jobId: string) => void
  clearTrackedScheduledServerJob: () => void
  serverScheduledJobDetail: ServerScheduledJobDetail | null
}

export const EMPTY_PENDING_CHANGES: PendingStationChangesContextValue = {
  pendingChanges: {},
  upsertPendingChange: () => {},
  addNewPendingStation: () => {},
  clearPendingChange: () => {},
  clearAllPendingChanges: () => {},
  clearPendingChangesForIds: () => {},
  trackedScheduledJobId: null,
  registerScheduledServerJob: () => {},
  clearTrackedScheduledServerJob: () => {},
  serverScheduledJobDetail: null,
}
