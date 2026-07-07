import { Suspense } from 'react'
import LoginPageClient from './LoginPageClient'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-page" aria-busy="true" />}>
      <LoginPageClient />
    </Suspense>
  )
}
