'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Onboarding(){
  const [role,setRole]=useState<'startup'|'investor'>('startup')
  const [name,setName]=useState('')
  const [headline,setHeadline]=useState('')
  const [country,setCountry]=useState('Maroc')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const router=useRouter()
  useEffect(()=>{(async()=>{
    const s=createClient();const {data}=await s.auth.getUser()
    if(!data.user){router.push('/login');return}
    const {data:p}=await s.from('vl_profiles').select('id').eq('id',data.user.id).maybeSingle()
    if(p){router.push('/feed');return}
    setLoading(false)
  })()},[router])
  async function submit(e:FormEvent){
    e.preventDefault();setError('');const s=createClient();const {data}=await s.auth.getUser()
    if(!data.user){router.push('/login');return}
    const {error}=await s.from('vl_profiles').insert({id:data.user.id,role,display_name:name,headline,country})
    if(error){setError(error.message);return}
    if(role==='investor'){
      const {error:investorError}=await s.from('vl_investor_profiles').insert({owner_id:data.user.id})
      if(investorError){setError(investorError.message);return}
      router.push('/investor');return
    }
    router.push('/dashboard')
  }
  if(loading) return <main className="auth"><section className="card">Chargement…</section></main>
  return <main className="auth"><section className="card stack"><div><span className="badge">1 minute</span><h1>Créer ton profil</h1><p className="muted">Choisis ton rôle principal. Ce rôle détermine les droits d’accès dans VentureLink.</p></div><form className="stack" onSubmit={submit}>
    <div className="field"><label>Je suis</label><select value={role} onChange={e=>setRole(e.target.value as 'startup'|'investor')}><option value="startup">Startup / entreprise</option><option value="investor">Investisseur</option></select></div>
    <div className="field"><label>Nom affiché</label><input required value={name} onChange={e=>setName(e.target.value)}/></div>
    <div className="field"><label>Présentation courte</label><input value={headline} onChange={e=>setHeadline(e.target.value)} placeholder="Ex. Fondateur ClimateTech / Business Angel Seed"/></div>
    <div className="field"><label>Pays</label><input value={country} onChange={e=>setCountry(e.target.value)}/></div>
    {error&&<div className="error">{error}</div>}<button className="btn primary">Créer mon profil</button></form></section></main>
}
