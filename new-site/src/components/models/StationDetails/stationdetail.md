# Station detail layouts

Reference for network-specific station detail **view** and **edit** layouts.

Layouts are currently frozen to each network’s previous behaviour. Edit presets/profiles later to change tabs and fields — do not hard-code network checks in the UI.

## Architecture

```
URL → resolve network → layout preset/profile → StationCollectionFieldSchema
  (+ collection sampling / station-doc merge for data-driven sections)
  → StationDetailsView / StationDetailsEditForm / NewStationForm
```

One shared page design. Differences live in [`stationDetailLayoutProfiles.ts`](../../../constants/stationDetailLayoutProfiles.ts).

## URL forms (only two)

| Style | Example | Role |
|-------|---------|------|
| Canonical network + slug | `/stations/gb-national-rail/london-paddington` | Primary detail route |
| Short network + id | `/stations/gbnr-1566` | Redirects to canonical |

Edit:

| Style | Example | Redirects to |
|-------|---------|--------------|
| Canonical admin edit | `/admin/stations/gb-national-rail/{slug}/edit` | Primary |
| Short id edit | `/stations/gbnr-1566/edit` | Canonical admin edit |

**Removed:** long-category (`/stations/rail-greatbritainnationalrail-0002`) and id-only (`/stations/0002`) redirects.

### Short codes

| Short code | Network |
|------------|---------|
| `gbnr` | GB National Rail |
| `gbheritage` | GB Heritage |
| `nitranslink` | NI Translink |
| `roiirerail`, `irishrail` | Irish Rail |
| `gbsheffsupertram`, `supertram` | South Yorkshire SuperTram |

Defined in `NETWORK_SHORT_URL_CODES` in [`stationCollections.ts`](../../../constants/stationCollections.ts).

## Layout presets

| Preset | Based on | Use when |
|--------|----------|----------|
| `mainlineHeavyRail` | GB National Rail | Full national / heavy-rail networks |
| `leanRegionalRail` | NI Translink / Irish Rail | Lean regional networks |
| `heritageRail` | GB Heritage | Heritage / tourist railways |
| `lightRail` | South Yorkshire SuperTram | Light rail / tram (`isLightRail`) |

Register a network with:

```ts
defineNetworkLayout({
  networkName: 'GB National Rail',
  networkId: 'stations_gbnr',
  preset: 'mainlineHeavyRail',
  // optional overrides
})
```

## Current layouts by network

| Network | Preset | Notes (parity with prior behaviour) |
|---------|--------|-------------------------------------|
| GB National Rail | `mainlineHeavyRail` | Additional fields folded into Details; Step Free Status under Step-free & Lift; Admin tab |
| GB Heritage | `heritageRail` | URL, NLC, gauge, staffing, service, step-free section; no CRS/Tiploc required |
| NI Translink | `leanRegionalRail` | No Tiploc; Additional folded into Details; Post/Eircode in Location; URL slug in Admin |
| Irish Rail | `leanRegionalRail` | Same as NI Translink |
| South Yorkshire SuperTram | `lightRail` | Lines, platforms, lift, light-rail fields |

All networks include an **Admin** tab with ID, STNAREA, and URL slug (when `showAdminUrlSlug` is enabled).

**Tab rule (this pass):** optional tabs still appear the same way as before (sampling + station-doc merge). Profiles encode catalog empty-doc defaults; they do not force always-on empty tabs.

## Adding a new network

1. Add the network to [`stationCollections.ts`](../../../constants/stationCollections.ts) (`NETWORK_COLLECTION_IDS`, labels, URL slug, `stnarea`, **short URL code**).
2. Choose a **preset** (or add a new preset if none fit).
3. Add `defineNetworkLayout({ networkName, networkId, preset, overrides? })` to `STATION_DETAIL_LAYOUT_PROFILES`.
4. TypeScript fails until `Record<NetworkCollectionId, …>` is complete.
5. Update create-station fields in [`newStationNetworkProfiles.ts`](../../../constants/newStationNetworkProfiles.ts) if the create form needs different visibility than catalog defaults.
6. Only change `StationDetailsView` / `StationDetailsEditForm` if you need a **new kind** of field or tab; then expose it via preset flags.

## Key files

| File | Role |
|------|------|
| [`stationDetailLayoutProfiles.ts`](../../../constants/stationDetailLayoutProfiles.ts) | Presets + per-network registry |
| [`stationCollectionFieldSchema.ts`](../../../utils/stationCollectionFieldSchema.ts) | Schema from profile + sampling |
| [`stationAreaSlug.ts`](../../../utils/stationAreaSlug.ts) | Canonical paths + short-id parse |
| [`stations/[network]/[stationSlug]/page.tsx`](../../../app/stations/[network]/[stationSlug]/page.tsx) | Public view |
| [`StationDetailsView.tsx`](./StationDetailsView.tsx) | View body |
| [`admin/.../edit/page.tsx`](../../../app/admin/(authenticated)/stations/[network]/[stationSlug]/edit/page.tsx) | Admin edit shell |
| [`StationDetailsEditForm.tsx`](./StationDetailsEditForm.tsx) | Edit form fields |
| [`newStationNetworkProfiles.ts`](../../../constants/newStationNetworkProfiles.ts) | Create-station visibility |
| [`stations/[network]/page.tsx`](../../../app/stations/[network]/page.tsx) | Short-id → canonical redirect |
