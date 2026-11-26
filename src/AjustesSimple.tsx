import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { correoVerificado, cuenta, errorDeCuenta, mandarVerificacion, revisarVerificacion, setLocalOnly } from './lib/firebase'
import { readScope } from './lib/storage'
import { faltantes, fusionar, resumenLocal } from './lib/fusion'
import { activeHabits, modulesOf, type AppData, type Modules } from './lib/model'
import { nfcUrl, type NfcAction } from './lib/nfc'
import { planOf } from './lib/rutina'
import { PauseSetup } from './PauseSetup'
import { CandadoSetup } from './Candado'
import { AvisosSetup, WidgetSetup } from './Widget'
import { LegalCard } from './Legal'
import { RemindersCard } from './RemindersCard'
import { DuoIcon, type DuoIconName } from './DuoIcons'

type Commit = (update: (d: AppData) => AppData) => void
type Props = {
  data: AppData; commit: Commit; onMessage: (t: string) => void; cloud: boolean
  onExport: () => void; onImport: (file?: File) => void; onSignOut: () => void; onDelete: (password?: string) => Promise<void>
}

const MODS: [keyof Modules, string, DuoIconName][] = [['training', 'Entreno', 'pesa'], ['focus', 'Tareas', 'lista'], ['reading', 'Lectura', 'libro'], ['food', 'Comida', 'plato']]

function Toggle({ on, onClick, title, text }: { on: boolean; onClick: () => void; title: string; text?: string }) {
  return <button type="button" className={`d-toggle ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick}>
    <span><b>{title}</b>{text && <small>{text}</small>}</span><i />
  </button>
}

function nfcPath(action: NfcAction): string {
  return action.tag === 'habit' ? `?nfc=habit&h=${encodeURIComponent(action.habit ?? '')}` : `?nfc=${action.tag}`
}

export function AjustesSimple({ data, commit, onMessage, cloud, onExport, onImport, onSignOut, onDelete }: Props) {
  const [name, setName] = useState(data.profile.name)
  const [key, setKey] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pass, setPass] = useState('')
  const [verified, setVerified] = useState(() => correoVerificado())
  const [sent, setSent] = useState(false)
  const server = cloud && !!supabase
  const email = cloud ? cuenta.guardada()?.email : ''
  const needPass = cloud && cuenta.proveedor() !== 'google.com'
  const uid = cloud ? cuenta.guardada()?.uid ?? '' : ''
  const [local, setLocal] = useState<AppData | null>(null)
  useEffect(() => {
    if (!uid) return
    let done = ''
    try { done = localStorage.getItem('bambu.local.fusionado') ?? '' } catch { done = '' }
    if (done === uid) return
    readScope('local').then(l => { if (l && l.profile.onboardingComplete && resumenLocal(l).total > 0) setLocal(l) }).catch(() => undefined)
  }, [uid])
  const extra = local ? faltantes(data, local) : 0
  function subirLocal() {
    if (!local || !window.confirm('Se suben a tu cuenta tus series, hábitos, lecturas y tu configuración de este teléfono. Lo que ya está en tu cuenta no se borra.')) return
    commit(d => fusionar(d, local))
    try { localStorage.setItem('bambu.local.fusionado', uid) } catch { return }
    setLocal(null)
    onMessage('Listo: tus datos de antes ya están en tu cuenta.')
  }
  const [busy, setBusy] = useState(false)
  const [adv, setAdv] = useState(false)
  const mods = modulesOf(data.settings)
  const plan = planOf(data)
  const set = (patch: Partial<AppData['settings']>) => commit(d => ({ ...d, settings: { ...d.settings, ...patch } }))
  const setPlan = (patch: Partial<typeof plan>) => set({ train: { ...planOf(data), ...patch } })

  useEffect(() => {
    if (!supabase || !server) return
    supabase.rpc('bambu_nfc_key', { p_rotate: false }).then(({ data: k, error }) => { if (!error && typeof k === 'string') setKey(k) })
  }, [server])
  function copy(action: NfcAction) {
    const url = nfcUrl(window.location.origin, action, key)
    if (!navigator.clipboard) { onMessage(url); return }
    navigator.clipboard.writeText(url).then(() => onMessage('Enlace copiado. Grábalo en la etiqueta con NFC Tools como URL.')).catch(() => onMessage(url))
  }
  function sendData() {
    const target = 'https://tuagentedeia.com'
    const win = window.open(`${target}/bambu/?recibir=1`, '_blank')
    if (!win) { onMessage('Tu navegador bloqueó la ventana nueva. Intenta otra vez.'); return }
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== target || e.source !== win) return
      if (e.data?.type === 'bambu-listo') win.postMessage({ type: 'bambu-datos', data: JSON.parse(JSON.stringify(data)) }, target)
      if (e.data?.type === 'bambu-recibido') { onMessage('Listo: tus datos ya están en la versión nueva.'); window.removeEventListener('message', onMsg) }
    }
    window.addEventListener('message', onMsg)
    window.setTimeout(() => window.removeEventListener('message', onMsg), 10 * 60000)
  }
  function saveName() {
    const clean = name.trim().slice(0, 40)
    if (!clean || clean === data.profile.name) { setName(data.profile.name); return }
    commit(d => ({ ...d, profile: { ...d.profile, name: clean } }))
    onMessage('Nombre guardado.')
  }
  async function wipe() {
    if (confirm !== 'BORRAR' || busy || (needPass && !pass)) return
    if (!window.confirm(cloud ? 'Se borra tu cuenta y todo lo que tiene en la nube y en este teléfono. No se puede deshacer.' : 'Se borra todo lo de este teléfono y Bambú empieza de cero. No se puede deshacer.')) return
    setBusy(true)
    try { await onDelete(pass) } catch (error) { onMessage(error instanceof Error && error.message ? error.message : 'No se pudo borrar. Intenta otra vez.') } finally { setBusy(false) }
  }

  const tags: { title: string; where: string; icon: DuoIconName; action: NfcAction }[] = [
    { title: 'Cama', where: 'En la cabecera. Al tenderla tachas tu cama y queda tu hora de despertar.', icon: 'cama', action: { tag: 'cama' } },
    ...(mods.training ? [{ title: 'Piso de entreno', where: 'Donde entrenas. Un toque abre tu rutina, otro la cierra. Solo cuenta con series.', icon: 'pesa' as DuoIconName, action: { tag: 'training' } as NfcAction }] : []),
    ...(mods.reading ? [{ title: 'Lectura', where: 'En tu libro. Un toque empieza, otro termina.', icon: 'libro' as DuoIconName, action: { tag: 'reading' } as NfcAction }] : []),
  ]

  return <section className="d-page">
    <h1 className="d-title">Ajustes</h1>

    {window.location.protocol === 'http:' && <div className="d-card d-move">
      <h2>Pasar mis datos a la versión nueva</h2>
      <p className="d-hint left">Abre tuagentedeia.com/bambu y le pasa todo lo de aquí: tu perfil, tu rutina, tus series de hoy y tus lecturas. Allá te pide confirmar.</p>
      <button type="button" className="d-btn green wide" onClick={sendData}>Pasar mis datos</button>
    </div>}

    <div className="d-card">
      <h2>Perfil</h2>
      <label className="d-field">Tu nombre<input className="d-input" value={name} maxLength={40} onChange={e => setName(e.target.value)} onBlur={saveName} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} /></label>
      <label className="d-field">Cómo usas Bambú</label>
      <div className="d-seg">
        <button type="button" className={data.settings.modo !== 'competir' ? 'on' : ''} aria-pressed={data.settings.modo !== 'competir'} onClick={() => set({ modo: undefined })}>Hábitos y racha</button>
        <button type="button" className={data.settings.modo === 'competir' ? 'on' : ''} aria-pressed={data.settings.modo === 'competir'} onClick={() => set({ modo: 'competir' })}>Solo competir</button>
      </div>
      <p className="d-hint left">{data.settings.modo === 'competir' ? 'Sin racha obligatoria ni camino del día: solo tus zonas y Amigos.' : 'Camino del día, objetivos y racha.'}</p>
      <label className="d-field">Qué usas</label>
      <div className="d-mods">{MODS.map(([k, l, icon]) => <button key={k} type="button" className={`d-mod ${mods[k] ? 'on' : ''}`} aria-pressed={mods[k]} onClick={() => set({ modules: { ...mods, [k]: !mods[k], ...(k === 'reading' && mods.reading ? { bible: false } : {}) } })}><DuoIcon name={icon} size={36} off={!mods[k]} /><span>{l}</span></button>)}</div>
      {mods.food && <label className="d-field">Tu edad, solo para Comida<input className="d-input num" type="number" inputMode="numeric" min={8} max={99} value={data.settings.age} onChange={e => { const n = Number(e.target.value); if (n >= 8 && n <= 99) set({ age: n }) }} /></label>}
    </div>

    {mods.training && <div className="d-card">
      <h2>Entreno</h2>
      <label className="d-field">Hora límite para entrenar<input className="d-input" type="time" value={plan.deadline} onChange={e => e.target.value && setPlan({ deadline: e.target.value })} /></label>
      <Toggle on={plan.lock} onClick={() => setPlan({ lock: !plan.lock })} title="Candado de redes" text="Si a esa hora no has entrenado, Instagram y TikTok no se abren hasta que lo hagas." />
      <label className="d-field">Descanso entre rondas</label>
      <div className="d-seg">{[0, 30, 60, 90, 120].map(n => <button key={n} type="button" className={plan.restSeconds === n ? 'on' : ''} onClick={() => setPlan({ restSeconds: n })}>{n ? `${n}s` : 'Sin'}</button>)}</div>
    </div>}

    <div className="d-card">
      <h2>Despertar</h2>
      <label className="d-field">Tu meta para despertar<input className="d-input" type="time" value={data.settings.reminders.wake} onChange={e => e.target.value && set({ reminders: { ...data.settings.reminders, wake: e.target.value } })} /></label>
      <p className="d-hint left">La etiqueta de tu cama compara tu hora real con esta.</p>
    </div>

    <div className="d-card">
      <div className="d-card-head"><h2>Etiquetas NFC</h2><DuoIcon name="etiqueta" size={40} /></div>
      <ol className="d-steps-guide">
        <li><span><b>Compra etiquetas NTAG215</b> (las redondas de pegar). Una por lugar: cabecera de la cama, piso donde entrenas.</span></li>
        <li><span><b>Copia el enlace</b> de cada una aquí abajo. Lleva tu llave, así funciona aunque Safari no tenga sesión.</span></li>
        <li><span><b>Grábala con NFC Tools</b> (gratis): Escribir, Agregar registro, URL, pega el enlace y acerca la etiqueta.</span></li>
        <li><span><b>Pégala y tócala.</b> El iPhone abre Bambú, se marca solo y te dice cuánto XP ganaste.</span></li>
      </ol>
      {!server && <p className="d-hint left red">{cloud ? 'Las etiquetas todavía no se conectan con tu cuenta. Por ahora solo puedes probarlas aquí.' : 'Ahorita estás sin cuenta, así que solo puedes probarlas aquí. Para grabarlas de verdad falta conectar tu cuenta.'}</p>}
      <ul className="d-nfc">{tags.map(t => <li key={t.title}>
        <DuoIcon name={t.icon} size={40} />
        <div><b>{t.title}</b><small>{t.where}</small></div>
        {server ? <button type="button" className="d-btn blue small" disabled={!key} onClick={() => copy(t.action)}>Copiar</button>
          : <a className="d-btn white small" href={nfcPath(t.action)}>Probar</a>}
      </li>)}
        {activeHabits(data.settings).filter(h => h.id !== 'cama' && !/cama/i.test(h.label)).map(h => <li key={h.id}>
          <DuoIcon name="estrella" size={40} />
          <div><b>{h.label}</b><small>Un toque lo marca hecho.</small></div>
          {server ? <button type="button" className="d-btn blue small" disabled={!key} onClick={() => copy({ tag: 'habit', habit: h.id })}>Copiar</button>
            : <a className="d-btn white small" href={nfcPath({ tag: 'habit', habit: h.id })}>Probar</a>}
        </li>)}
      </ul>
      {!server && mods.training && <a className="d-btn white wide" href="?nfc=pause&app=instagram">Probar candado</a>}
    </div>

    {mods.training && <CandadoSetup data={data} commit={commit} onMessage={onMessage} cloud={cloud} />}
    <AvisosSetup data={data} commit={commit} onMessage={onMessage} cloud={cloud} />
    <WidgetSetup data={data} commit={commit} onMessage={onMessage} cloud={cloud} />
    <LegalCard data={data} />
    {server && <PauseSetup keyValue={key} onCopy={url => { navigator.clipboard?.writeText(url).then(() => onMessage('Enlace copiado.')).catch(() => onMessage(url)) }} />}
    {server && <RemindersCard data={data} commit={commit} onMessage={onMessage} />}

    {local && extra > 0 && <div className="d-card d-am-invite">
      <h2>Tus datos de antes</h2>
      <p className="d-hint left">En este teléfono hay {resumenLocal(local).series} series, {resumenLocal(local).dias} días de hábitos y {resumenLocal(local).lecturas} lecturas de antes de tu cuenta. Súbelos para que cuenten en tu nivel y tus tablas.</p>
      <button type="button" className="d-btn green wide" onClick={subirLocal}>Subir a mi cuenta</button>
    </div>}

    {cloud && !verified && <div className="d-card">
      <h2>Confirma tu correo</h2>
      <p className="d-hint left">{sent ? `Te mandamos un correo a ${email}. Toca el enlace y luego regresa aquí. Revisa también spam.` : 'Así puedes entrar también con Google sin perder tu contraseña.'}</p>
      {sent
        ? <button type="button" className="d-btn green wide" onClick={() => { revisarVerificacion().then(ok => { setVerified(ok); onMessage(ok ? 'Correo confirmado.' : 'Todavía no aparece confirmado. Toca el enlace del correo.') }).catch(e => onMessage(errorDeCuenta(e))) }}>Ya lo confirmé</button>
        : <button type="button" className="d-btn blue wide" onClick={() => { mandarVerificacion().then(() => setSent(true)).catch(e => onMessage(errorDeCuenta(e))) }}>Mandar correo de confirmación</button>}
    </div>}

    <div className="d-card">
      <button type="button" className="d-adv-head" onClick={() => setAdv(!adv)} aria-expanded={adv}><h2>Avanzado</h2><span>{adv ? '−' : '+'}</span></button>
      {adv && <>
        <p className="d-hint left">{cloud ? `Tus datos se guardan en tu cuenta${email ? ` (${email})` : ''} y en este teléfono.` : 'Tus datos viven solo en este teléfono. Si borras Safari se pierden: baja un respaldo de vez en cuando.'}</p>
        <div className="d-col">
          <button type="button" className="d-btn white wide" onClick={onExport}>Descargar respaldo</button>
          <label className="d-btn white wide">Restaurar respaldo<input type="file" accept="application/json" hidden onChange={e => onImport(e.target.files?.[0])} /></label>
          {cloud ? <button type="button" className="d-btn white wide" onClick={onSignOut}>Cerrar sesión</button>
            : <button type="button" className="d-btn green wide" onClick={() => { setLocalOnly(false); window.location.reload() }}>Crear cuenta o entrar</button>}
        </div>
        <h3>{cloud ? 'Borrar mi cuenta' : 'Borrar todo y empezar de cero'}</h3>
        <p className="d-hint left">Antes baja tu respaldo. Para confirmar escribe BORRAR{needPass ? ' y tu contraseña' : ''}.</p>
        {needPass && <input className="d-input" type="password" autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Tu contraseña" aria-label="Tu contraseña" />}
        <div className="d-inline">
          <input className="d-input" value={confirm} onChange={e => setConfirm(e.target.value.toUpperCase())} placeholder="BORRAR" aria-label="Escribe BORRAR" />
          <button type="button" className="d-btn red" disabled={confirm !== 'BORRAR' || busy || (needPass && !pass)} onClick={() => void wipe()}>{busy ? 'Borrando' : 'Borrar'}</button>
        </div>
      </>}
    </div>
  </section>
}
