export default function StationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
      {children}
    </>
  )
}
