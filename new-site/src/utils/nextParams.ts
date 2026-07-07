/** Normalize Next.js `useParams()` values (string | string[] | undefined) to a single string. */
export function paramAsString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}
