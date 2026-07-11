const COUNTY_TO_PROVINCE: Record<string, string> = {
  carlow: 'Leinster',
  dublin: 'Leinster',
  kildare: 'Leinster',
  kilkenny: 'Leinster',
  laois: 'Leinster',
  longford: 'Leinster',
  louth: 'Leinster',
  meath: 'Leinster',
  offaly: 'Leinster',
  westmeath: 'Leinster',
  wexford: 'Leinster',
  wicklow: 'Leinster',
  clare: 'Munster',
  cork: 'Munster',
  kerry: 'Munster',
  limerick: 'Munster',
  tipperary: 'Munster',
  waterford: 'Munster',
  galway: 'Connacht',
  leitrim: 'Connacht',
  mayo: 'Connacht',
  roscommon: 'Connacht',
  sligo: 'Connacht',
  antrim: 'Ulster',
  armagh: 'Ulster',
  cavan: 'Ulster',
  donegal: 'Ulster',
  down: 'Ulster',
  fermanagh: 'Ulster',
  londonderry: 'Ulster',
  derry: 'Ulster',
  monaghan: 'Ulster',
  tyrone: 'Ulster',
}

function normalizeCountyName(county?: string | null): string {
  return (county ?? '')
    .trim()
    .toLowerCase()
    .replace(/^co\.?\s+/, '')
    .replace(/^county\s+/, '')
    .replace(/\s+/g, ' ')
}

/** Infer Irish province from a traditional county name when `province` is missing. */
export function inferProvinceFromCounty(county?: string | null): string | null {
  const normalized = normalizeCountyName(county)
  if (!normalized) return null
  return COUNTY_TO_PROVINCE[normalized] ?? null
}
