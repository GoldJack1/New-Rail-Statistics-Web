/**
 * Shared pathname helpers for public stations routes (list vs detail vs map).
 * Re-exports cold-visitor helpers so existing imports keep working.
 */

export {
  isAuthCriticalPath,
  isColdVisitorDeferPath,
  isPublicStationDetailPath,
  isPublicStationsBrowsePath,
  isPublicStationsListPath,
} from './coldVisitorPerf'
