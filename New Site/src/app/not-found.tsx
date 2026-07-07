import { PageTopHeader } from '@/components/misc'

export default function NotFound() {
  return (
    <div>
      <PageTopHeader
        title="Page Not Found"
        subtitle="The page you are looking for does not exist or may have moved."
        actionButton={{ to: '/', label: 'Go to home' }}
      />
    </div>
  )
}
