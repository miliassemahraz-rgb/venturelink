'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import Shell from '@/components/Shell'
import { createClient } from '@/lib/supabase'

type Startup = { id:string; owner_id:string; name:string; sector:string|null; stage:string|null }
type Profile = { id:string; role:string; display_name:string }
type Access = { startup_id:string; investor_id:string; status:'requested'|'granted'|'revoked'|'declined'; requested_at:string; decided_at:string|null }
type Doc = { id:string; startup_id:string; uploaded_by:string; category:string; title:string; storage_path:string; mime_type:string|null; size_bytes:number|null; created_at:string }

const categoryLabels:Record<string,string> = {
  corporate:'Corporate', financial:'Financier', legal:'Juridique', commercial:'Commercial', product:'Produit', technical:'Technique', ip:'Propriété intellectuelle', hr:'RH', other:'Autre'
}

export default function DataRoom(){
  const [me,setMe]=useState('')
  const [role,setRole]=useState('')
  const [startups,setStartups]=useState<Startup[]>([])
  const [profiles,setProfiles]=useState<Profile[]>([])
  const [accesses,setAccesses]=useState<Access[]>([])
  const [docs,setDocs]=useState<Doc[]>([])
  const [selectedStartup,setSelectedStartup]=useState('')
  const [title,setTitle]=useState('')
  const [category,setCategory]=useState('financial')
  const [file,setFile]=useState<File|null>(null)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  async function load(){
    const s=createClient()
    const {data:u}=await s.auth.getUser()
    if(!u.user)return
    setMe(u.user.id)
    const [{data:p},{data:ss},{data:prs},{data:aa},{data:dd}] = await Promise.all([
      s.from('vl_profiles').select('id,role,display_name').eq('id',u.user.id).maybeSingle(),
      s.from('vl_startups').select('id,owner_id,name,sector,stage').order('name'),
      s.from('vl_profiles').select('id,role,display_name'),
      s.from('vl_data_room_access').select('*').order('requested_at',{ascending:false}),
      s.from('vl_data_room_documents').select('*').order('created_at',{ascending:false})
    ])
    setRole(p?.role||'')
    setStartups((ss as Startup[])||[])
    setProfiles((prs as Profile[])||[])
    setAccesses((aa as Access[])||[])
    setDocs((dd as Doc[])||[])
  }

  useEffect(()=>{load()},[])
  const myStartup=useMemo(()=>startups.find(s=>s.owner_id===me),[startups,me])
  const profileMap=useMemo(()=>Object.fromEntries(profiles.map(p=>[p.id,p.display_name])),[profiles])
  const accessMap=useMemo(()=>Object.fromEntries(accesses.filter(a=>a.investor_id===me).map(a=>[a.startup_id,a])),[accesses,me])
  const activeStartupId=role==='startup'?myStartup?.id||'':selectedStartup
  const visibleDocs=docs.filter(d=>d.startup_id===activeStartupId)
  const ownerRequests=myStartup?accesses.filter(a=>a.startup_id===myStartup.id):[]

  useEffect(()=>{
    if(role==='investor'&&!selectedStartup&&startups[0])setSelectedStartup(startups[0].id)
  },[role,selectedStartup,startups])

  async function requestAccess(){
    if(!selectedStartup||!me)return
    setMessage('')
    const {error}=await createClient().from('vl_data_room_access').insert({startup_id:selectedStartup,investor_id:me,status:'requested'})
    if(error){setMessage(error.code==='23505'?'Une demande existe déjà pour cette startup.':error.message);return}
    setMessage('Demande d’accès envoyée à la startup.')
    load()
  }

  async function withdrawRequest(){
    if(!selectedStartup||!me)return
    const {error}=await createClient().from('vl_data_room_access').delete().eq('startup_id',selectedStartup).eq('investor_id',me)
    if(error){setMessage(error.message);return}
    setMessage('Demande retirée.')
    load()
  }

  async function decideAccess(investorId:string,status:'granted'|'declined'|'revoked'){
    if(!myStartup)return
    const {error}=await createClient().from('vl_data_room_access').update({status,decided_at:new Date().toISOString()}).eq('startup_id',myStartup.id).eq('investor_id',investorId)
    if(error){setMessage(error.message);return}
    setMessage(status==='granted'?'Accès accordé.':status==='declined'?'Demande refusée.':'Accès révoqué.')
    load()
  }

  function onFile(e:ChangeEvent<HTMLInputElement>){setFile(e.target.files?.[0]||null)}

  async function upload(){
    if(!myStartup||!file||!title.trim())return
    setBusy(true);setMessage('')
    const s=createClient()
    const safeName=file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-')
    const path=`${myStartup.id}/${crypto.randomUUID()}-${safeName}`
    const {error:uploadError}=await s.storage.from('venturelink-data-room').upload(path,file,{contentType:file.type||undefined,upsert:false})
    if(uploadError){setMessage(uploadError.message);setBusy(false);return}
    const {error:metaError}=await s.from('vl_data_room_documents').insert({startup_id:myStartup.id,uploaded_by:me,category,title:title.trim(),storage_path:path,mime_type:file.type||null,size_bytes:file.size})
    if(metaError){await s.storage.from('venturelink-data-room').remove([path]);setMessage(metaError.message);setBusy(false);return}
    setTitle('');setFile(null);setMessage('Document ajouté à la Data Room.');setBusy(false);load()
  }

  async function download(doc:Doc){
    const {data,error}=await createClient().storage.from('venturelink-data-room').download(doc.storage_path)
    if(error){setMessage(error.message);return}
    const url=URL.createObjectURL(data)
    const a=document.createElement('a');a.href=url;a.download=doc.title;a.click();URL.revokeObjectURL(url)
  }

  async function removeDoc(doc:Doc){
    if(!confirm(`Supprimer « ${doc.title} » ?`))return
    const s=createClient()
    const {error:fileError}=await s.storage.from('venturelink-data-room').remove([doc.storage_path])
    if(fileError){setMessage(fileError.message);return}
    const {error}=await s.from('vl_data_room_documents').delete().eq('id',doc.id)
    if(error){setMessage(error.message);return}
    setMessage('Document supprimé.');load()
  }

  const selected=startups.find(s=>s.id===selectedStartup)
  const myAccess=accessMap[selectedStartup] as Access|undefined

  return <Shell><div className="stack">
    <section className="hero data-room-hero"><h1>Data Room sécurisée</h1><p>Les documents restent dans un bucket privé. Une startup contrôle explicitement quels investisseurs peuvent les consulter.</p></section>

    {role==='startup'&&<>
      {!myStartup?<section className="card">Crée d’abord ton profil entreprise dans <b>Mon espace</b>.</section>:<>
        <section className="card stack"><div className="split"><div><h2>Documents de {myStartup.name}</h2><p className="muted small">Taille maximale configurée : 50 Mo par fichier.</p></div><span className="badge">{visibleDocs.length} document(s)</span></div><div className="form-grid"><div className="field"><label>Titre du document</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex. Prévisionnel financier 2027-2029"/></div><div className="field"><label>Catégorie</label><select value={category} onChange={e=>setCategory(e.target.value)}>{Object.entries(categoryLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div></div><div className="field"><label>Fichier</label><input type="file" onChange={onFile}/></div><button className="btn primary" disabled={busy||!file||!title.trim()} onClick={upload}>{busy?'Envoi…':'Ajouter à la Data Room'}</button></section>
        <section className="card stack"><h2>Demandes d’accès</h2>{ownerRequests.length===0?<p className="muted">Aucune demande d’accès.</p>:ownerRequests.map(a=><div className="access-row" key={a.investor_id}><div><b>{profileMap[a.investor_id]||'Investisseur'}</b><div className="small muted">Statut : {a.status}</div></div><div className="actions">{a.status==='requested'&&<><button className="btn primary" onClick={()=>decideAccess(a.investor_id,'granted')}>Accorder</button><button className="btn ghost" onClick={()=>decideAccess(a.investor_id,'declined')}>Refuser</button></>}{a.status==='granted'&&<button className="btn ghost" onClick={()=>decideAccess(a.investor_id,'revoked')}>Révoquer</button>}{(a.status==='declined'||a.status==='revoked')&&<button className="btn soft" onClick={()=>decideAccess(a.investor_id,'granted')}>Accorder l’accès</button>}</div></div>)}</section>
      </>}
    </>}

    {role==='investor'&&<section className="card stack"><div className="split"><div><h2>Accéder à une Data Room</h2><p className="muted small">Sélectionne une startup et demande son autorisation.</p></div>{myAccess&&<span className={`access-status ${myAccess.status}`}>{myAccess.status}</span>}</div><div className="field"><label>Startup</label><select value={selectedStartup} onChange={e=>setSelectedStartup(e.target.value)}><option value="">Sélectionner</option>{startups.map(s=><option key={s.id} value={s.id}>{s.name} · {s.sector||'Secteur non renseigné'}</option>)}</select></div>{selected&&<div className="small muted">{selected.name} · {selected.stage||'Stade non renseigné'}</div>}{!myAccess&&selectedStartup&&<button className="btn primary" onClick={requestAccess}>Demander l’accès</button>}{myAccess?.status==='requested'&&<button className="btn ghost" onClick={withdrawRequest}>Retirer ma demande</button>}{myAccess?.status==='declined'&&<div className="error">La demande a été refusée.</div>}{myAccess?.status==='revoked'&&<div className="error">L’accès a été révoqué par la startup.</div>}{myAccess?.status==='granted'&&<div className="success">Accès accordé. Les documents autorisés apparaissent ci-dessous.</div>}</section>}

    {activeStartupId&&(role==='startup'||myAccess?.status==='granted')&&<section className="card stack"><h2>Documents disponibles</h2>{visibleDocs.length===0?<p className="muted">Aucun document disponible.</p>:<div className="document-list">{visibleDocs.map(d=><article className="document-row" key={d.id}><div className="document-icon">DOC</div><div className="document-meta"><b>{d.title}</b><span>{categoryLabels[d.category]||d.category} · {d.size_bytes?`${(d.size_bytes/1024/1024).toFixed(2)} Mo`:'taille inconnue'}</span></div><div className="actions"><button className="btn soft" onClick={()=>download(d)}>Télécharger</button>{role==='startup'&&<button className="btn ghost" onClick={()=>removeDoc(d)}>Supprimer</button>}</div></article>)}</div>}</section>}
    {message&&<div className={message.toLowerCase().includes('envoy')||message.toLowerCase().includes('accord')||message.toLowerCase().includes('ajout')||message.toLowerCase().includes('supprim')?'success':'error'}>{message}</div>}
  </div></Shell>
}
