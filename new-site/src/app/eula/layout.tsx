import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'EULA',
  description: 'Rail Statistics end user licence agreement.',
  alternates: { canonical: '/eula' },
}

export default function EulaLayout({ children }: { children: React.ReactNode }) {
  return children
}
