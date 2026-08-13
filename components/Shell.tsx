'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const links = [
  ['/feed', 'Fil'],
  ['/discover', 'Startups'],
  ['/matching', 'Matching IA'],
  ['/arena', 'Pitch Arena'],
  ['/boost', 'Venture Boost'],
  ['/deals', 'Deal Room'],
  ['/data-room', 'Data Room'],
  ['/watchlist', 'Watchlist'],
  ['/messages', 'Messages'],
  ['/investor', 'Mandat investisseur'],
  ['/dashboard', 'Mon espace']
]

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  async function logout() {
    await createClient().auth.signOut()
    router.push('/login')
  }
  return <>
    <header className="topbar">
      <Link href="/feed" className="brand"><span className="logo">VL</span><span>VentureLink<small>Startups · Investisseurs · Projets</small></span></Link>
      <nav>{links.map(([href,label]) => <Link key={href} href={href} className={path===href?'active':''}>{label}</Link>)}</nav>
      <button className="btn ghost" onClick={logout}>Déconnexion</button>
    </header>
    <main className="layout">{children}</main>
  </>
}
