/** Leaflet map requires browser APIs — skip static prerender. */
export const dynamic = 'force-dynamic'

export default function AdminMapLayout({ children }: { children: React.ReactNode }) {
  return children
}
