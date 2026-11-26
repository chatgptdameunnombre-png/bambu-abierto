import { useEffect, useMemo, useState } from 'react'
import { dateKey, type AppData } from './lib/model'
import { boards, buildPerfil, buscar, codigoDe, ranking, type Dir } from './lib/perfil'
import { cuenta, cuentaActiva, setLocalOnly } from './lib/firebase'
import { Avatar, FollowButton, Join, PerfilView, RankList, type Commit } from './Tablas'
import { alternar, relDe, responder, useSocial } from './useSocial'
import { Sheet } from './Sheet'
import { DuoIcon } from './DuoIcons'
import { esCompetir } from './lib/modo'
import { AMIGO_KEY, SEEN_KEY, avisos } from './amigosNuevos'

export { AMIGO_KEY }

const LIGA = ['xpSemana', 'reps', 'racha', 'xp'] as const
const LIGA_LABEL: Record<(typeof LIGA)[number], string> = { xpSemana: 'XP semana', reps: 'Reps semana', racha: 'Racha', xp: 'Nivel' }

function activo(ts?: string): string {
  if (!ts) return ''
  const days = Math.floor((Date.now() - Date.parse(ts)) / 86400000)
  return days <= 0 ? 'Activo hoy' : days === 1 ? 'Activo ayer' : `Hace ${days} días`
}

function Who({ d, sub, onOpen }: { d: Dir; sub: string; onOpen: () => void }) {
  return <button type="button" className="d-am-who" onClick={onOpen}>
    <Avatar n={d.avatar} size={46} />
    <span><b>{d.apodo}{d.privada && <DuoIcon name="candado" size={16} />}</b><small>{sub}</small></span>
  </button>
}

export function AmigosPage({ data, commit, onMessage }: { data: AppData; commit: Commit; onMessage: (t: string) => void }) {
  const uid = cuentaActiva ? cuenta.guardada()?.uid : undefined
  const today = dateKey()
  const t = data.settings.tablas
  const joined = !!t
  const amigos = useMemo(() => data.settings.amigos ?? [], [data.settings.amigos])
  const aceptados = t?.privada ? data.settings.aprobados ?? [] : null
  const { social, failed, reload } = useSocial(uid, amigos, !!uid && joined)
  const me = useMemo(() => uid ? buildPerfil(data, uid, today) : null, [data, uid, today])
  const [q, setQ] = useState('')
  const [liga, setLiga] = useState<(typeof LIGA)[number]>('xpSemana')
  const [open, setOpen] = useState<string | null>(null)
  const [edit, setEdit] = useState(false)
  const [busy, setBusy] = useState('')
  const [invite, setInvite] = useState(() => { try { return localStorage.getItem(AMIGO_KEY) ?? '' } catch { return '' } })

  useEffect(() => {
    if (!uid || !social) return
    try { localStorage.setItem(SEEN_KEY(uid), JSON.stringify(avisos(social, uid, t?.privada === true))) } catch { return }
  }, [social, uid, t?.privada])

  if (!uid) return <section className="d-page">
    <div className="d-card d-am-empty">
      <DuoIcon name="amigos" size={64} />
      <h2>Compite con tus amigos</h2>
      <p className="d-hint">Necesitas una cuenta para agregar amigos y ver sus números. Ahorita todo vive solo en este teléfono.</p>
      <button type="button" className="d-btn green wide" onClick={() => { setLocalOnly(false); window.location.reload() }}>Crear cuenta o entrar</button>
    </div>
  </section>

  if (!joined || !me || t?.privada === undefined) return <section className="d-page">
    <div className="d-card">
      <div className="d-am-empty"><DuoIcon name="amigos" size={64} /><h2>{joined ? 'Completa tu perfil' : 'Crea tu perfil'}</h2></div>
      <Join data={data} commit={commit} uid={uid} cta="Crear mi perfil" />
    </div>
  </section>

  const dirOf = (id: string) => social?.dir.find(d => d.uid === id)
  const others = (social?.dir ?? []).filter(d => d.uid !== uid)
  const visible = (id: string) => !!social?.perfiles.some(p => p.uid === id)
  async function act(d: Dir, fn: () => Promise<string>) {
    if (busy) return
    setBusy(d.uid)
    try { onMessage(await fn()) } catch { onMessage('No se pudo. Revisa tu señal.') } finally { setBusy(''); reload() }
  }
  const toggle = (d: Dir) => act(d, () => alternar(commit, uid, amigos, d, social))
  const contestar = (d: Dir, si: boolean) => act(d, () => responder(commit, uid, d, si))
  const code = codigoDe(uid)
  async function share() {
    const url = `${window.location.origin}${window.location.pathname}?amigo=${code}`
    const text = `Compite conmigo en Bambú. Mi código es ${code}.`
    try {
      if (navigator.share) { await navigator.share({ title: 'Bambú', text, url }); return }
      await navigator.clipboard.writeText(`${text} ${url}`)
      onMessage('Enlace copiado. Mándalo por WhatsApp.')
    } catch { return }
  }

  const entrantes = (social?.entrantes ?? []).map(dirOf).filter((d): d is Dir => !!d)
  const friends = others.filter(d => amigos.includes(d.uid))
  const visibles = friends.filter(d => visible(d.uid))
  const back = t?.privada ? [] : others.filter(d => d.siguiendo.includes(uid) && !amigos.includes(d.uid))
  const invited = invite ? others.find(d => codigoDe(d.uid).toLowerCase() === invite.toLowerCase()) : undefined
  const found = buscar(others, q, uid)
  const suggest = others.filter(d => !amigos.includes(d.uid) && !d.siguiendo.includes(uid) && !social?.entrantes.includes(d.uid)).sort((a, b) => b.nivel - a.nivel).slice(0, 5)
  const board = boards(today).find(b => b.id === liga)!
  const rows = ranking([...(social?.perfiles ?? []).filter(p => visibles.some(v => v.uid === p.uid)), me], board)
  const openDir = open === uid ? { uid, apodo: me.apodo, avatar: me.avatar, nivel: me.nivel, privada: !me.publica, siguiendo: me.siguiendo } : open ? dirOf(open) : undefined
  const dropInvite = () => { try { localStorage.removeItem(AMIGO_KEY) } catch { return } setInvite('') }
  const row = (d: Dir, sub: string) => <div className="d-am-row" key={d.uid}>
    <Who d={d} sub={sub} onOpen={() => setOpen(d.uid)} />
    <FollowButton rel={relDe(uid, amigos, d, social, aceptados)} privada={d.privada} onToggle={() => void toggle(d)} />
  </div>

  return <section className="d-page">
    <div className="d-am-me">
      <Avatar n={me.avatar} size={72} />
      <div className="d-am-me-info">
        <b>{me.apodo}</b>
        <span>{me.rango} · nivel {me.nivel}</span>
        {!esCompetir(data.settings) && <small><DuoIcon name="fuego" size={18} /> {me.racha} {me.racha === 1 ? 'día' : 'días'} de racha</small>}
        <small><DuoIcon name="rayo" size={18} /> {me.xpSemana.toLocaleString('es-MX')} XP esta semana</small>
      </div>
      <div className="d-am-code"><small>Tu código</small><b>{code}</b></div>
      <button type="button" className={`d-am-priv ${t?.privada ? 'on' : ''}`} onClick={() => setEdit(true)}><DuoIcon name={t?.privada ? 'candado' : 'amigos'} size={22} />{t?.privada ? 'Cuenta privada · tú aceptas a quién' : 'Cuenta pública · cualquiera te agrega'}</button>
      <div className="d-row2 d-am-actions">
        <button type="button" className="d-btn green wide small" onClick={() => void share()}>Invitar</button>
        <button type="button" className="d-btn white wide small" onClick={() => setEdit(true)}>Editar</button>
      </div>
    </div>

    {invite && social && <div className="d-card d-am-invite">
      {invited ? <>
        <div className="d-am-who static"><Avatar n={invited.avatar} size={52} /><span><b>{invited.apodo} te invitó</b><small>{invited.privada ? 'Cuenta privada · se le manda solicitud' : `Nivel ${invited.nivel}`}</small></span></div>
        <div className="d-row2">
          {!amigos.includes(invited.uid) && <button type="button" className="d-btn green wide small" onClick={() => { void toggle(invited); dropInvite() }}>{invited.privada ? 'Solicitar' : 'Agregar'}</button>}
          <button type="button" className="d-btn white wide small" onClick={dropInvite}>{amigos.includes(invited.uid) ? 'Listo' : 'Ahora no'}</button>
        </div>
      </> : <>
        <p className="d-hint left">No encontramos a nadie con el código {invite}. Puede que todavía no haya creado su perfil.</p>
        <button type="button" className="d-btn white wide small" onClick={dropInvite}>Cerrar</button>
      </>}
    </div>}

    {entrantes.length > 0 && <div className="d-card d-am-invite">
      <h2>Solicitudes <small className="d-am-count">{entrantes.length}</small></h2>
      {entrantes.map(d => <div className="d-am-req" key={d.uid}>
        <Who d={d} sub="Quiere ser tu amigo" onOpen={() => setOpen(d.uid)} />
        <div className="d-row2">
          <button type="button" className="d-btn green wide small" disabled={busy === d.uid} onClick={() => void contestar(d, true)}>Aceptar</button>
          <button type="button" className="d-btn white wide small" disabled={busy === d.uid} onClick={() => void contestar(d, false)}>Rechazar</button>
        </div>
      </div>)}
    </div>}

    <div className="d-card">
      <div className="d-am-title"><h2>Liga de amigos</h2><button type="button" className="d-link" onClick={reload}>Actualizar</button></div>
      <div className="d-chips scroll">{LIGA.map(id => <button key={id} type="button" className={liga === id ? 'on' : ''} onClick={() => setLiga(id)}>{LIGA_LABEL[id]}</button>)}</div>
      {failed && <p className="d-hint">No se pudo cargar. Revisa tu señal.</p>}
      {!failed && !social && <p className="d-hint">Cargando…</p>}
      {social && (visibles.length
        ? <RankList rows={rows} uid={uid} unit={board.unit} onOpen={p => setOpen(p.uid)} />
        : <p className="d-hint left">Todavía no tienes amigos. Invita a alguien con tu código o búscalo aquí abajo.</p>)}
    </div>

    {back.length > 0 && <div className="d-card">
      <h2>Te agregaron</h2>
      {back.map(d => row(d, 'Te agregó · agrégalo para ser amigos'))}
    </div>}

    <div className="d-card">
      <h2>Buscar personas</h2>
      <input className="d-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Apodo o código" aria-label="Buscar por apodo o código" autoCapitalize="none" />
      {q.trim()
        ? found.length ? found.slice(0, 10).map(d => row(d, d.privada ? 'Cuenta privada' : `Nivel ${d.nivel}`)) : <p className="d-hint left">No encontramos a nadie así.</p>
        : suggest.length > 0 && <>
          <p className="d-tb-sub">Personas en Bambú</p>
          {suggest.map(d => row(d, d.privada ? 'Cuenta privada' : `Nivel ${d.nivel}`))}
        </>}
    </div>

    {friends.length > 0 && <div className="d-card">
      <h2>Tus amigos <small className="d-am-count">{friends.length}</small></h2>
      {friends.map(d => {
        const rel = relDe(uid, amigos, d, social, aceptados)
        return row(d, `${rel === 'amigos' ? 'Amigos' : rel === 'pendiente' ? 'Solicitud enviada' : rel === 'agregado' ? 'Esperando que te agregue' : 'No aceptó tu solicitud'} · ${activo(d.actualizado) || `nivel ${d.nivel}`}`)
      })}
    </div>}

    {openDir && <Sheet title={openDir.uid === uid ? 'Mi perfil' : 'Perfil'} tall onClose={() => setOpen(null)}>
      <PerfilView p={openDir.uid === uid ? me : social?.perfiles.find(p => p.uid === openDir.uid) ?? null} dir={openDir} me={me} rel={relDe(uid, amigos, openDir, social, aceptados)} back="Cerrar" onBack={() => setOpen(null)} onToggle={() => void toggle(openDir)} />
    </Sheet>}
    {edit && <Sheet title="Mi perfil" onClose={() => setEdit(false)}><Join data={data} commit={d => { commit(d); setEdit(false); onMessage('Perfil guardado.') }} uid={uid} /></Sheet>}
  </section>
}
