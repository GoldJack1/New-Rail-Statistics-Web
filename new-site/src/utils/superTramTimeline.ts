/**
 * SuperTram map timeline — thin aliases over the shared opening-timeline helpers
 * so other networks can reuse `stationOpeningTimeline` later.
 */
export {
  OPENING_TIMELINE_PROLOGUE_ORDER as TIMELINE_PROLOGUE_ORDER,
  buildOpeningTimelinePrologueStep as buildTimelinePrologueStep,
  buildOpeningTimelineSteps as buildSuperTramTimelineSteps,
  compareOpeningTimelineCutoffs as compareTimelineCutoffs,
  countStationsVisibleAtOpeningTimelineCutoff as countStationsVisibleAtTimelineCutoff,
  formatOpeningTimelineDate as formatTimelineDate,
  getOpeningTimelineVisibleStationIds as getTimelineVisibleStationIds,
  getStationOpenedTimestamp,
  getStationOpeningTimelineCutoff as getStationTimelineCutoff,
  getStationOrderOfOpening,
  isLegacyDateDefaultOrderOfOpening,
  isStationEligibleForOpeningTimeline,
  isStationVisibleAtOpeningTimelineCutoff as isStationVisibleAtTimelineCutoff,
  isStationVisibleInOpeningTimelineStep as isStationVisibleInTimelineStep,
  orderOfOpeningFromDateOpened,
  type StationOpeningTimelineCutoff as SuperTramTimelineCutoff,
  type StationOpeningTimelineStep as SuperTramTimelineStep,
} from './stationOpeningTimeline'
