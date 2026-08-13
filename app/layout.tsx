import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'VentureLink',
  description: 'Réseau startups, investisseurs et projets'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>
}
