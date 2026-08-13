'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage(){
  const [mode,setMode]=useState<'login'|'signup'>('login')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [message,setMessage]=useState('')
  const [loading,setLoading]=useState(false)
  const router=useRouter()
  async function submit(e:FormEvent){
    e.preventDefault();setLoading(true);setMessage('')
    const supabase=createClient()
    if(mode==='signup'){
      const {error}=await supabase.auth.signUp({email,password})
      if(error) setMessage(error.message)
      else {setMessage('Compte créé. Vérifie ton e-mail si la confirmation est activée, puis connecte-toi.');setMode('login')}
    } else {
      const {error}=await supabase.auth.signInWithPassword({email,password})
      if(error) setMessage(error.message)
      else router.push('/onboarding')
    }
    setLoading(false)
  }
  return <main className="auth">
    <section className="card stack">
      <div><span className="badge">VentureLink</span><h1>{mode==='login'?'Connexion':'Créer un compte'}</h1><p className="muted">Accède au réseau startups & investisseurs.</p></div>
      <form className="stack" onSubmit={submit}>
        <div className="field"><label>E-mail</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div>
        <div className="field"><label>Mot de passe</label><input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></div>
        {message && <div className={message.startsWith('Compte')?'success':'error'}>{message}</div>}
        <button className="btn primary" disabled={loading}>{loading?'Traitement…':mode==='login'?'Se connecter':'Créer mon compte'}</button>
      </form>
      <button className="btn ghost" onClick={()=>{setMode(mode==='login'?'signup':'login');setMessage('')}}>{mode==='login'?'Je n’ai pas encore de compte':'J’ai déjà un compte'}</button>
    </section>
  </main>
}
