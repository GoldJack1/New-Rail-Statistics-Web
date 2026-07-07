#!/usr/bin/env node
/**
 * One-shot Phase 2 port helper: copy old Vite pages/services/hooks with Next.js transforms.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OLD_SRC = path.resolve(ROOT, '../Old Website /RailStatisticsWebsite/src')
const NEW_SRC = path.resolve(ROOT, 'src')

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

function copyWithTransforms(srcRel, destRel, extra = (c) => c) {
  const src = path.join(OLD_SRC, srcRel)
  if (!fs.existsSync(src)) {
    console.warn('SKIP missing:', srcRel)
    return
  }
  let c = read(src)
  c = transformCommon(c)
  c = extra(c)
  const dest = path.join(NEW_SRC, destRel)
  write(dest, c)
  console.log('Wrote', destRel)
}

function transformCommon(content) {
  let c = content
  // Remove debug agent log regions
  c = c.replace(/\s*\/\/ #region agent log[\s\S]*?\/\/ #endregion\n?/g, '\n')

  // Relative imports → @/
  c = c.replace(/from '\.\.\/\.\.\/([^']+)'/g, "from '@/$1'")
  c = c.replace(/from '\.\.\/([^']+)'/g, "from '@/$1'")
  c = c.replace(/import '\.\.\/\.\.\/([^']+)'/g, "import '@/$1'")
  c = c.replace(/import '\.\.\/([^']+)'/g, "import '@/$1'")
  c = c.replace(/import '\.\/([^']+\.css)'/g, "import './$1'")

  // Env vars
  c = c.replace(/import\.meta\.env\.VITE_/g, 'process.env.NEXT_PUBLIC_')
  c = c.replace(/import\.meta\.env\.DEV/g, "process.env.NODE_ENV === 'development'")

  // Admin route paths
  c = c.replace(/'\/stations\/pending-review'/g, "'/admin/stations/pending-review'")
  c = c.replace(/"\/stations\/pending-review"/g, '"/admin/stations/pending-review"')
  c = c.replace(/'\/stations\/new'/g, "'/admin/stations/new'")
  c = c.replace(/"\/stations\/new"/g, '"/admin/stations/new"')
  c = c.replace(/\?\? '\/stations'/g, "?? '/admin/stations'")
  c = c.replace(/return '\/stations'/g, "return '/admin/stations'")
  c = c.replace(/fromState !== '\/stations\/pending-review'/g, "fromState !== '/admin/stations/pending-review'")
  c = c.replace(/fallbackBackTarget =\s*\n\s*fromState && fromState !== '\/admin\/stations\/pending-review' \? fromState : '\/stations'/g,
    "fallbackBackTarget =\n    fromState && fromState !== '/admin/stations/pending-review' ? fromState : '/admin/stations'")

  // Edit station URLs → admin
  c = c.replace(/`\/stations\/\$\{buildStationPath\(([^)]+)\)\}\/edit`/g, '`/admin/stations/${buildStationPath($1)}/edit`')
  c = c.replace(
    /navigate\(`\/stations\/\$\{buildStationPath\(([^)]+)\)\}\$\{mode === 'edit' \? '\/edit' : ''\}`/g,
    "navigate(`${mode === 'edit' ? '/admin/stations/' : '/stations/'}` + buildStationPath($1) + `${mode === 'edit' ? '/edit' : ''}`"
  )
  c = c.replace(
    /navigate\(`\/stations\/\$\{buildStationPath\(([^)]+)\)\}\$\{isEditMode \? '\/edit' : ''\}`\)/g,
    'navigate(isEditMode ? `/admin/stations/${buildStationPath($1)}/edit` : `/stations/${buildStationPath($1)}`)'
  )

  // Map admin return
  c = c.replace(/const returnTo = '\/stations\/map\?admin=1'/g, "const returnTo = '/admin/map'")

  // react-router useSearchParams → next
  c = c.replace(/from 'react-router-dom'/g, "from 'next/navigation'")

  return c
}

function portPageComponent(name, srcRel, destPageRel, cssRels = [], opts = {}) {
  let c = read(path.join(OLD_SRC, srcRel))
  c = transformCommon(c)

  if (opts.stripDefaultExport) {
    c = c.replace(/export default \w+\s*$/m, '')
  }

  // Router hooks
  c = c.replace(/\buseNavigate\(\)/g, 'useRouter()')
  c = c.replace(/\bconst navigate = useRouter\(\)/g, 'const router = useRouter()')
  c = c.replace(/\bnavigate\(/g, 'router.push(')
  c = c.replace(/router\.push\(-1\)/g, 'router.back()')
  c = c.replace(/router\.push\(([^,]+), \{ replace: true \}\)/g, 'router.replace($1)')

  // useLocation patterns
  if (c.includes('useLocation')) {
    c = c.replace(/\bconst location = useLocation\(\)/g, "const pathname = usePathname()\n  const searchParams = useSearchParams()\n  const location = { pathname, search: searchParams.toString() ? `?${searchParams}` : '', state: null as unknown }")
    c = c.replace(/\bconst routerLocation = useLocation\(\)/g, "const pathname = usePathname()\n  const searchParams = useSearchParams()\n  const routerLocation = { pathname, search: searchParams.toString() ? `?${searchParams}` : '' }")
  }

  if (opts.mode) {
    c = c.replace(/interface StationDetailsPageProps[\s\S]*?\}\n\n/, '')
    c = c.replace(/const StationDetailsPage: React\.FC<StationDetailsPageProps> = \(\{ mode \}\) =>/, 'function StationDetailsPage() {\n  const mode = ' + JSON.stringify(opts.mode) + ' as const\n  const _unusedProps =')
    c = c.replace(/const LegacyStationRedirect: React\.FC<LegacyStationRedirectProps> = \(\{ mode \}\) =>/, 'function LegacyStationRedirect() {\n  const mode = ' + JSON.stringify(opts.mode) + ' as const\n  const _unusedProps =')
  }

  // Pending review from state → searchParams
  c = c.replace(
    /const fromState = safeReviewPendingReturnPath\(\(location\.state as \{ from\?: string \} \| null\)\?\.from\)/g,
    "const fromState = safeReviewPendingReturnPath(searchParams.get('from'))"
  )

  // Pending review navigate with state
  c = c.replace(
    /navigate\('\/admin\/stations\/pending-review', \{\s*state: \{ from: pathnameForReviewPendingSource\(routerLocation\) \}\s*\}\)/g,
    "router.push(`/admin/stations/pending-review?from=${encodeURIComponent(pathnameForReviewPendingSource(routerLocation))}`)"
  )

  // New station navigate with state
  c = c.replace(
    /navigate\('\/admin\/stations\/new', \{ state \}\)/g,
    'setNewStationNavigationState(state); router.push(\'/admin/stations/new\')'
  )

  // Station details navigate with state → session storage helper
  c = c.replace(
    /navigate\(`\/admin\/stations\/\$\{buildStationPath\(station, collectionId\)\}\/edit`, \{\s*state: navigationState,\s*\}\)/g,
    'setStationDetailsNavigationState(navigationState); router.push(`/admin/stations/${buildStationPath(station, collectionId)}/edit`)'
  )
  c = c.replace(
    /navigate\(`\/stations\/\$\{buildStationPath\(station, collectionId\)\}`, \{\s*state: navigationState,\s*\}\)/g,
    'setStationDetailsNavigationState(navigationState); router.push(`/stations/${buildStationPath(station, collectionId)}`)'
  )

  // NewStationPage location.state
  if (srcRel.includes('NewStationPage')) {
    c = c.replace(
      /const location = useLocation\(\)\s*\n\s*const navState = \(location\.state as NewStationNavigationState \| null\) \?\? null/g,
      'const navState = readNewStationNavigationState()'
    )
    c = c.replace(
      /onCancel=\{\(\) => \(navState\?\.returnTo \? navigate\(navState\.returnTo\) : navigate\(-1\)\)\}/g,
      'onCancel={() => (navState?.returnTo ? router.push(navState.returnTo) : router.back())}'
    )
  }

  // Imports for next navigation
  const nextImports = new Set(['useRouter'])
  if (c.includes('usePathname')) nextImports.add('usePathname')
  if (c.includes('useSearchParams')) nextImports.add('useSearchParams')
  if (c.includes('useParams')) nextImports.add('useParams')

  c = c.replace(/import \{[^}]+\} from 'next\/navigation'/g, '')
  const importLine = `import { ${[...nextImports].join(', ')} } from 'next/navigation'\n`
  c = importLine + c

  // Extra imports for navigation helpers
  const extraImports = []
  if (c.includes('setNewStationNavigationState')) {
    extraImports.push("import { setNewStationNavigationState, readNewStationNavigationState } from '@/utils/clientNavigationState'")
  }
  if (c.includes('setStationDetailsNavigationState')) {
    extraImports.push("import { setStationDetailsNavigationState, readStationDetailsNavigationState } from '@/utils/clientNavigationState'")
  }
  if (c.includes('readNewStationNavigationState') && !c.includes('setNewStationNavigationState')) {
    extraImports.push("import { readNewStationNavigationState } from '@/utils/clientNavigationState'")
  }
  if (extraImports.length) {
    c = extraImports.join('\n') + '\n' + c
  }

  // Station details back path
  if (c.includes('getStationDetailsReturnPath')) {
    c = c.replace(
      /const backPath = getStationDetailsReturnPath\(location\.state\)/g,
      'const backPath = getStationDetailsReturnPath(readStationDetailsNavigationState())'
    )
    c = c.replace(
      /const navigationState = location\.state/g,
      'const navigationState = readStationDetailsNavigationState()'
    )
  }

  // use client + default export page wrapper
  const cssImports = cssRels.map((r) => `import './${path.basename(r)}'`).join('\n')
  const componentName = name

  if (!c.trimStart().startsWith("'use client'")) {
    c = "'use client'\n\n" + c
  }

  c = c.replace(/export default \w+\s*$/m, `export default ${componentName}`)

  const pagePath = path.join(NEW_SRC, destPageRel)
  const pageDir = path.dirname(pagePath)

  // Fix CSS import paths in component for co-located css
  for (const cssRel of cssRels) {
    const base = path.basename(cssRel)
    c = c.replace(new RegExp(`import '@/${cssRel.replace(/\.css$/, '')}\\.css'`, 'g'), `import './${base}'`)
    c = c.replace(new RegExp(`import '@/${cssRel}'`, 'g'), `import './${base}'`)
    const oldImport = cssRel.includes('/') ? cssRel.split('/').pop() : cssRel
    c = c.replace(new RegExp(`import '\\.\\./[^']*${oldImport.replace('.', '\\.')}'`, 'g'), `import './${base}'`)
    c = c.replace(new RegExp(`import '\\./${oldImport.replace('.', '\\.')}'`, 'g'), `import './${base}'`)

    const srcCss = path.join(OLD_SRC, cssRel)
    if (fs.existsSync(srcCss)) {
      write(path.join(pageDir, base), read(srcCss))
    }
  }

  write(pagePath, c)
  console.log('Page', destPageRel)
}

// --- Support files ---
copyWithTransforms('types/migration.ts', 'types/migration.ts')
copyWithTransforms('services/localData.ts', 'services/localData.ts')
copyWithTransforms('services/messageCentre.ts', 'services/messageCentre.ts')
copyWithTransforms('services/migration.ts', 'services/migration.ts')
copyWithTransforms('utils/darwinReadyFetch.ts', 'utils/darwinReadyFetch.ts', (c) =>
  c.replace(/import\.meta\.env/g, 'process.env')
)
copyWithTransforms('hooks/useStations.ts', 'hooks/useStations.ts')
copyWithTransforms('hooks/useDepartures.ts', 'hooks/useDepartures.ts')
copyWithTransforms('hooks/useServiceDetail.ts', 'hooks/useServiceDetail.ts')
copyWithTransforms('hooks/useUnitDetail.ts', 'hooks/useUnitDetail.ts')

// useStationAdminMode - custom
write(
  path.join(NEW_SRC, 'hooks/useStationAdminMode.ts'),
  `'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  isStationAdminModeActive,
  STATION_ADMIN_MODE_CHANGED_EVENT,
} from '@/utils/stationAdminModeStorage'

/** True when a signed-in user has admin mode enabled (persisted or \`?admin=1\`). */
export function useStationAdminMode(): boolean {
  const { user, loading } = useAuth()
  const searchParams = useSearchParams()
  const search = searchParams.toString() ? \`?\${searchParams}\` : ''

  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener(STATION_ADMIN_MODE_CHANGED_EVENT, onStoreChange)
    return () => window.removeEventListener(STATION_ADMIN_MODE_CHANGED_EVENT, onStoreChange)
  }, [])

  const getSnapshot = useCallback(() => isStationAdminModeActive(search), [search])

  const adminActive = useSyncExternalStore(subscribe, getSnapshot, () => false)

  if (loading || !user) return false
  return adminActive
}
`
)

// --- Pages ---
portPageComponent(
  'AdminStationsPage',
  'pages/StationsPageRefactored/StationsPageRefactored.tsx',
  'app/admin/stations/page.tsx',
  ['pages/StationsPageRefactored/StationsPageRefactored.css']
)

portPageComponent(
  'AdminStationsPendingReviewPage',
  'pages/ReviewPendingChangesPage/ReviewPendingChangesPage.tsx',
  'app/admin/stations/pending-review/page.tsx',
  ['pages/ReviewPendingChangesPage/ReviewPendingChangesPage.css', 'pages/StationDetailsPage/StationDetailsPage.css']
)

portPageComponent(
  'AdminStationsNewPage',
  'pages/NewStationPage.tsx',
  'app/admin/stations/new/page.tsx',
  ['pages/StationDetailsPage/StationDetailsPage.css']
)

portPageComponent(
  'StationDetailsPage',
  'pages/StationDetailsPage/StationDetailsPage.tsx',
  'app/stations/[network]/[stationSlug]/page.tsx',
  ['pages/StationDetailsPage/StationDetailsPage.css'],
  { mode: 'view' }
)

portPageComponent(
  'AdminStationEditPage',
  'pages/StationDetailsPage/StationDetailsPage.tsx',
  'app/admin/stations/[network]/[stationSlug]/edit/page.tsx',
  ['pages/StationDetailsPage/StationDetailsPage.css'],
  { mode: 'edit' }
)

portPageComponent(
  'LegacyStationRedirectPage',
  'pages/StationDetailsPage/LegacyStationRedirect.tsx',
  'app/stations/[legacyStationId]/page.tsx',
  [],
  { mode: 'view' }
)

portPageComponent(
  'MigrationPage',
  'pages/MigrationPage/MigrationPage.tsx',
  'app/migration/page.tsx',
  ['pages/MigrationPage/MigrationPage.css']
)

portPageComponent(
  'StationsMapPage',
  'pages/StationsMapPage/StationsMapPage.tsx',
  'app/stations/map/page.tsx',
  [
    'pages/StationsPageRefactored/StationsPageRefactored.css',
    'pages/StationsMapPage/StationsMapPage.css',
    'components/maps/StationsMapTimeline.css',
  ]
)

portPageComponent(
  'AdminMapPage',
  'pages/StationsMapPage/StationsMapPage.tsx',
  'app/admin/map/page.tsx',
  [
    'pages/StationsPageRefactored/StationsPageRefactored.css',
    'pages/StationsMapPage/StationsMapPage.css',
    'components/maps/StationsMapTimeline.css',
  ]
)

portPageComponent(
  'DarwinDeparturesPage',
  'pages/DarwinDeparturesPage/DarwinDeparturesPage.tsx',
  'app/departures/page.tsx',
  ['pages/DarwinDeparturesPage/DarwinDeparturesPage.css']
)

// departures/[code] - same component
let departuresCode = read(path.join(NEW_SRC, 'app/departures/page.tsx'))
write(path.join(NEW_SRC, 'app/departures/[code]/page.tsx'), departuresCode)

portPageComponent(
  'ServiceDetailPage',
  'pages/ServiceDetailPage/ServiceDetailPage.tsx',
  'app/services/[rid]/page.tsx',
  ['pages/ServiceDetailPage/ServiceDetailPage.css']
)

portPageComponent(
  'UnitsInServicePage',
  'pages/UnitsInServicePage/UnitsInServicePage.tsx',
  'app/units/page.tsx',
  ['pages/UnitsInServicePage/UnitsInServicePage.css']
)

portPageComponent(
  'UnitLookupPage',
  'pages/UnitLookupPage/UnitLookupPage.tsx',
  'app/units/[unitId]/page.tsx',
  ['pages/UnitLookupPage/UnitLookupPage.css']
)

portPageComponent(
  'MessageCentreDashboardPage',
  'pages/MessageCentreDashboardPage.tsx',
  'app/admin/messages/page.tsx',
  ['pages/MessageCentreAdminPage/MessageCentreAdminPage.css']
)

portPageComponent(
  'MessageCentreAdminPage',
  'pages/MessageCentreAdminPage/MessageCentreAdminPage.tsx',
  'app/admin/messages/[messageId]/page.tsx',
  ['pages/MessageCentreAdminPage/MessageCentreAdminPage.css']
)

// admin/messages/new
let msgAdmin = read(path.join(NEW_SRC, 'app/admin/messages/[messageId]/page.tsx'))
msgAdmin = msgAdmin.replace('export default MessageCentreAdminPage', 'export default MessageCentreAdminNewPage')
write(path.join(NEW_SRC, 'app/admin/messages/new/page.tsx'), msgAdmin)

portPageComponent(
  'ApiStatusPage',
  'pages/ApiStatusPage/ApiStatusPage.tsx',
  'app/admin/api-status/page.tsx',
  ['pages/ApiStatusPage/ApiStatusPage.css']
)

console.log('Done.')
