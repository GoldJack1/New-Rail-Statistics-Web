import { redirect } from 'next/navigation'

/** Old site treated `/` and `/home` as aliases for the homepage. */
export default function HomeAliasPage() {
  redirect('/')
}
