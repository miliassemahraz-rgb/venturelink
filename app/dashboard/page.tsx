'use client'
import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Shell from '@/components/Shell'
import { createClient } from '@/lib/supabase'

type Profile={id:string;role:'startup'|'investor'|'admin';display_name:string;headline:string|null;country:string|null}
type Startup={id:string;name:string;sector:string|null;stage:string|null;description:string|null;funding_need_eur:number|null;verified:boolean}
export default function Dashboard(){
  const [p,setP]=useState<Profile|null>(null);const [startup,setStartup]=useState<Startup|null>(null)
  const [name,setName]=useState('');const [sector,setSector]=useState('');const [stage,setStage]=useState('Seed');const [description,setDescription]=useState('');const [need,setNeed]=useState('')
  const [message,setMessage]=useState('');const router=useRouter()
  async function load(){
    const s=createClient();const {data:u}=await s.auth.getUser();if(!u.user){router.push('/login');return}
    const {data:pr}=await s.from('vl_profiles').select('*').eq('id',u.user.id).maybeSingle();if(!pr){router.push('/onboarding');return}
    setP(pr as Profile)
    const {data:st}=await s.from('vl_startups').select('id,name,sector,stage,description,funding_need_eur,verified').eq('owner_id',u.user.id).maybeSingle();setStartup((st as Startup|null)||null)
  }
  useEffect(()=>{load()},[])
  async function createStartup(e:FormEvent){
    e.preventDefault();if(!p)return;setMessage('')
    const {error}=await createClient().from('vl_startups').insert({owner_id:p.id,name,sector,stage,description,country:p.country,funding_need_eur:need?Number(need):null})
    if(error)setMessage(error.message);else {setMessage('Entreprise créée.');load()}
  }
  if(!p)return <Shell><div className="card">Chargement…</div></Shell>
  return <Shell><div className="stack"><section className="card"><span className="badge">{p.role}</span><h1>{p.display_name}</h1><p className="muted">{p.headline||'Profil à compléter'} · {p.country||''}</p></section>
    {p.role==='startup'&&!startup&&<section className="card stack"><h2>Créer la fiche de ton entreprise</h2><form className="stack" onSubmit={createStartup}><div className="field"><label>Nom de l’entreprise</label><input required value={name} onChange={e=>setName(e.target.value)}/></div><div className="form-grid"><div className="field"><label>Secteur</label><input value={sector} onChange={e=>setSector(e.target.value)} placeholder="IA, ClimateTech, Industrie…"/></div><div className="field"><label>Stade</label><select value={stage} onChange={e=>setStage(e.target.value)}><option>Pre-seed</option><option>Seed</option><option>Series A</option><option>Growth</option></select></div></div><div className="field"><label>Description</label><textarea value={description} onChange={e=>setDescription(e.target.value)}/></div><div className="field"><label>Besoin de financement (€)</label><input type="number" min="0" value={need} onChange={e=>setNeed(e.target.value)}/></div>{message&&<div className="small muted">{message}</div>}<button className="btn primary">Créer la startup</button></form></section>}
    {startup&&<section className="card"><div className="split"><div><span className="badge">{startup.verified?'Vérifié':'Non vérifié'}</span><h2>{startup.name}</h2><p>{startup.description||'Description à compléter.'}</p></div><Link className="btn soft" href="/feed">Publier une avancée</Link></div><div className="metric-row"><div className="metric"><span className="small muted">Secteur</span><b>{startup.sector||'—'}</b></div><div className="metric"><span className="small muted">Stade</span><b>{startup.stage||'—'}</b></div><div className="metric"><span className="small muted">Besoin</span><b>{startup.funding_need_eur?`${new Intl.NumberFormat('fr-FR').format(startup.funding_need_eur)} €`:'—'}</b></div></div></section>}
    {p.role==='investor'&&<section className="card stack"><div><h2>Espace investisseur</h2><p>Définis ta thèse d’investissement pour alimenter le matching explicable.</p></div><div className="actions"><Link className="btn primary" href="/investor">Configurer mon mandat</Link><Link className="btn soft" href="/matching">Voir mes matchs</Link><Link className="btn ghost" href="/watchlist">Ouvrir ma watchlist</Link></div></section>}
  </div></Shell>
}
