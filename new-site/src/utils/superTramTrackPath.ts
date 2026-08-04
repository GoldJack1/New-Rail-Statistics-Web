export type SuperTramTrackGraph = {
  /** Node key → [lat, lng] */
  nodes: Record<string, [number, number]>
  /** Undirected edges: [fromKey, toKey, lengthMeters] */
  edges: Array<[string, string, number]>
}

export type LatLngTuple = [number, number]

const TRACK_GRAPH_URL = '/data/supertram-track-graph.json'

/** Constant ground speed for follow-camera pans (metres / second). */
export const TRACK_FOLLOW_SPEED_MPS = 180

/**
 * Reject track routes that are much longer than the straight line — usually means
 * we snapped onto a parallel rail and Dijkstra went to a junction and back.
 */
export const TRACK_DETOUR_RATIO = 1.55
export const TRACK_DETOUR_EXTRA_METERS = 100

/** How many nearby track nodes to try when snapping each endpoint. */
const SNAP_CANDIDATE_COUNT = 10

let graphPromise: Promise<SuperTramTrackGraph> | null = null
let adjacencyCache: {
  graph: SuperTramTrackGraph
  adj: Map<string, Array<{ to: string; length: number }>>
} | null = null

export function loadSuperTramTrackGraph(): Promise<SuperTramTrackGraph> {
  if (!graphPromise) {
    graphPromise = fetch(TRACK_GRAPH_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load SuperTram track graph (${response.status})`)
        }
        return response.json() as Promise<SuperTramTrackGraph>
      })
      .catch((error) => {
        graphPromise = null
        adjacencyCache = null
        throw error
      })
  }
  return graphPromise
}

/** Haversine distance in metres. */
export function haversineMeters(a: LatLngTuple, b: LatLngTuple): number {
  const R = 6371000
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLon = ((b[1] - a[1]) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function nearestTrackNodeKey(
  graph: SuperTramTrackGraph,
  lat: number,
  lng: number
): string | null {
  return nearestTrackNodeKeys(graph, lat, lng, 1)[0] ?? null
}

/** Nearest track nodes, closest first. */
export function nearestTrackNodeKeys(
  graph: SuperTramTrackGraph,
  lat: number,
  lng: number,
  count: number
): string[] {
  const target: LatLngTuple = [lat, lng]
  const scored: Array<{ key: string; dist: number }> = []
  for (const [key, coords] of Object.entries(graph.nodes)) {
    scored.push({ key, dist: haversineMeters(target, coords) })
  }
  scored.sort((a, b) => a.dist - b.dist)
  return scored.slice(0, Math.max(0, count)).map((entry) => entry.key)
}

function getAdjacency(
  graph: SuperTramTrackGraph
): Map<string, Array<{ to: string; length: number }>> {
  if (adjacencyCache?.graph === graph) return adjacencyCache.adj

  const adj = new Map<string, Array<{ to: string; length: number }>>()
  const add = (from: string, to: string, length: number) => {
    const list = adj.get(from)
    if (list) list.push({ to, length })
    else adj.set(from, [{ to, length }])
  }
  for (const [from, to, length] of graph.edges) {
    add(from, to, length)
    add(to, from, length)
  }
  adjacencyCache = { graph, adj }
  return adj
}

/**
 * Shortest path along the SuperTram track graph between two node keys.
 * Returns ordered [lat, lng] points, or null if unreachable.
 */
export function shortestTrackPathBetweenNodes(
  graph: SuperTramTrackGraph,
  fromKey: string,
  toKey: string
): LatLngTuple[] | null {
  if (!graph.nodes[fromKey] || !graph.nodes[toKey]) return null
  if (fromKey === toKey) return [graph.nodes[fromKey]]

  const adj = getAdjacency(graph)
  const dist = new Map<string, number>()
  const prev = new Map<string, string>()
  const visited = new Set<string>()

  dist.set(fromKey, 0)
  const queue: string[] = [fromKey]

  while (queue.length > 0) {
    // Linear extract-min — graph is ~2k nodes, fine for timeline camera.
    let bestIdx = 0
    let bestDist = dist.get(queue[0]) ?? Number.POSITIVE_INFINITY
    for (let i = 1; i < queue.length; i += 1) {
      const d = dist.get(queue[i]) ?? Number.POSITIVE_INFINITY
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    const current = queue.splice(bestIdx, 1)[0]
    if (visited.has(current)) continue
    visited.add(current)
    if (current === toKey) break

    const neighbours = adj.get(current)
    if (!neighbours) continue
    for (const { to, length } of neighbours) {
      if (visited.has(to)) continue
      const nextDist = bestDist + length
      if (nextDist < (dist.get(to) ?? Number.POSITIVE_INFINITY)) {
        dist.set(to, nextDist)
        prev.set(to, current)
        queue.push(to)
      }
    }
  }

  if (!dist.has(toKey)) return null

  const keys: string[] = []
  let cursor: string | undefined = toKey
  while (cursor) {
    keys.push(cursor)
    if (cursor === fromKey) break
    cursor = prev.get(cursor)
  }
  if (keys[keys.length - 1] !== fromKey) return null
  keys.reverse()
  return keys.map((key) => graph.nodes[key])
}

export function isExcessiveTrackDetour(
  pathLengthMeters: number,
  directMeters: number
): boolean {
  return pathLengthMeters > directMeters * TRACK_DETOUR_RATIO + TRACK_DETOUR_EXTRA_METERS
}

function dedupePath(path: LatLngTuple[]): LatLngTuple[] {
  const out: LatLngTuple[] = []
  for (const point of path) {
    const prev = out[out.length - 1]
    if (!prev || haversineMeters(prev, point) > 0.4) out.push(point)
  }
  return out
}

/**
 * Route along tracks between two geographic points.
 * Tries several nearby snap nodes so we stay on the same rail (avoids parallel-track
 * detours that run to a junction and back). Falls back to a straight segment when
 * the best rail path is still an obvious detour.
 */
export function shortestTrackPathBetweenLatLngs(
  graph: SuperTramTrackGraph,
  from: LatLngTuple,
  to: LatLngTuple
): LatLngTuple[] {
  const direct = haversineMeters(from, to)
  const fromKeys = nearestTrackNodeKeys(graph, from[0], from[1], SNAP_CANDIDATE_COUNT)
  const toKeys = nearestTrackNodeKeys(graph, to[0], to[1], SNAP_CANDIDATE_COUNT)

  let bestPath: LatLngTuple[] | null = null
  let bestLength = Number.POSITIVE_INFINITY

  for (const fromKey of fromKeys) {
    for (const toKey of toKeys) {
      const path = shortestTrackPathBetweenNodes(graph, fromKey, toKey)
      if (!path || path.length === 0) continue
      const length = trackPathLengthMeters(path)
      if (length < bestLength) {
        bestLength = length
        bestPath = path
      }
    }
  }

  if (!bestPath || isExcessiveTrackDetour(bestLength, direct)) {
    return [from, to]
  }

  return dedupePath([from, ...bestPath, to])
}

export function trackPathLengthMeters(path: LatLngTuple[]): number {
  let total = 0
  for (let i = 1; i < path.length; i += 1) {
    total += haversineMeters(path[i - 1], path[i])
  }
  return total
}

/** Sample a point at distance `distanceMeters` along the path. */
export function pointAlongTrackPath(
  path: LatLngTuple[],
  distanceMeters: number
): LatLngTuple {
  if (path.length === 0) return [0, 0]
  if (path.length === 1 || distanceMeters <= 0) return path[0]

  let remaining = distanceMeters
  for (let i = 1; i < path.length; i += 1) {
    const seg = haversineMeters(path[i - 1], path[i])
    if (remaining <= seg || i === path.length - 1) {
      if (seg <= 0) return path[i]
      const t = Math.min(1, Math.max(0, remaining / seg))
      return [
        path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t,
        path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t,
      ]
    }
    remaining -= seg
  }
  return path[path.length - 1]
}

/** Duration at a fixed metres/second — same speed for every hop. */
export function trackFollowDurationSeconds(pathLengthMeters: number): number {
  if (pathLengthMeters <= 0) return 0.2
  return pathLengthMeters / TRACK_FOLLOW_SPEED_MPS
}
