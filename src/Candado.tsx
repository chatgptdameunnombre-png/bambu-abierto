import { lazy, Suspense, useState } from 'react'
import { dateKey, type AppData } from './lib/model'
import { CAMARA_BASICOS, CAMARA_GRUPOS, esCamara, tipoDe, type Tipo } from './lib/conteo'
import { conCamara, DEVOLVER_MS, devolverPase, EMERGENCIA_MIN, emergenciaActivity, faltan, gastados, ganados, hastaTexto, LIBRES_OPCIONES, libresDe, minutosDe, nuevaLlave, paseAbierto, paseActivity, PASES, saldo, semanaMinutos, tasaCorta, tasaTexto } from './lib/minutos'
import { avisarFinPase, borrarPase, guardarPase, urlPase } from './lib/firebase'
import { clockOf, lockActive, planOf } from './lib/rutina'
import { pauseActivity, pauseApp, PAUSE_APPS } from './lib/pause'
import { DuoIcon } from './DuoIcons'
import { Sheet } from './Sheet'
import { haptic } from './lib/haptic'
import { siFaltaArchivo } from './lib/version'
import { PaseAbierto } from './PaseAbierto'

const CamaraReps = lazy(() => import('./CamaraReps').catch(e => siFaltaArchivo<typeof import('./CamaraReps')>(e)))
type Commit = (update: (d: AppData) => AppData) => void
const APPS = PAUSE_APPS.filter(a => a.scheme)
const hora = (ms: number) => new Date(ms).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })

export function CamaraValor({ ej, kind, onValor, onCerrar, limite, meta, redes = false, hastaFallar = false, sinMinutos = false, paraEnMeta = false }: { ej: string; kind?: Tipo; onValor: (valor: number) => void; onCerrar: () => void; limite?: number; meta?: number; redes?: boolean; hastaFallar?: boolean; sinMinutos?: boolean; paraEnMeta?: boolean }) {
  return <Suspense fallback={<div className="d-cam cargando"><div className="d-cam-intro"><h2>Preparando la cámara…</h2></div></div>}>
    <CamaraReps ej={ej} kind={kind} onCerrar={onCerrar} onGuardar={onValor} limite={limite} meta={meta} redes={redes} hastaFallar={hastaFallar} sinMinutos={sinMinutos} paraEnMeta={paraEnMeta} />
  </Suspense>
}

export function BotonCamara({ ej, kind, onClick }: { ej: string; kind?: Tipo; onClick: () => void }) {
  if (!esCamara(ej, kind)) return null
  return <button type="button" className="d-btn blue wide d-cam-open" onClick={() => { haptic(8); onClick() }}><DuoIcon name="camara" size={26} />Contar con cámara</button>
}

export function Camara({ ej, commit, onListo, onCerrar, meta }: { ej: string; commit: Commit; onListo: (texto: string) => void; onCerrar: () => void; meta?: number }) {
  const kind = tipoDe(ej)
  return <CamaraValor ej={ej} kind={kind} meta={meta} redes onCerrar={onCerrar} onValor={valor => {
    const day = dateKey()
    commit(d => conCamara(d, day, ej, kind, valor, Date.now(), true))
    const min = Math.floor(minutosDe(ej, valor) + 1e-9)
    onListo(`${valor}${kind === 'seconds' ? ' s' : ''} de ${ej.toLowerCase()}${min > 0 ? ` · +${min} min de redes` : ''}`)
  }} />
}

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function GanarMinutos({ onElegir, minimo = 0, sinTasa = false }: { onElegir: (ej: string) => void; minimo?: number; sinTasa?: boolean }) {
  const [q, setQ] = useState('')
  const b = sinAcentos(q.trim())
  const grupos = CAMARA_GRUPOS.map(g => ({ ...g, ejercicios: b ? g.ejercicios.filter(e => sinAcentos(`${e.name} ${g.grupo}`).includes(b)) : g.ejercicios })).filter(g => g.ejercicios.length)
  return <div className="d-ganar-grupos">
    <label className="d-buscar">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.6" /><path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
      <input type="search" placeholder="Buscar ejercicio" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar ejercicio" enterKeyHint="search" autoComplete="off" />
      {q && <button type="button" className="d-buscar-x" aria-label="Borrar búsqueda" onClick={() => setQ('')}>×</button>}
    </label>
    {grupos.length ? grupos.map(g => <section key={g.grupo}>
      <p className="d-tb-sub">{g.grupo}</p>
      <div className="d-ganar">{g.ejercicios.map(e => <button key={e.name} type="button" className="d-ganar-btn" onClick={() => { haptic(8); onElegir(e.name) }}>
        <DuoIcon name={e.kind === 'seconds' ? 'reloj' : 'pesa'} size={24} />
        <b>{e.name}</b>
        {!sinTasa && <small>{minimo > 0 ? `${faltan(e.name, minimo)}${e.kind === 'seconds' ? ' s' : ''} = ${minimo} min` : tasaCorta(e.name)}</small>}
      </button>)}</div>
    </section>) : <p className="d-hint">No encontré "{q.trim()}". Prueba con otra palabra.</p>}
  </div>
}

const QUIERO = [5, 10, 15, 30]

export function RedesPage({ data, commit, onAjustes }: { data: AppData; commit: Commit; onAjustes?: () => void }) {
  const today = dateKey()
  const [quiero, setQuiero] = useState(10)
  const [elegir, setElegir] = useState(false)
  const [ej, setEj] = useState<string | null>(null)
  const [cam, setCam] = useState(false)
  const [nota, setNota] = useState('')
  const sem = semanaMinutos(data, today)
  const seg = ej ? tipoDe(ej) === 'seconds' : false
  const cuanto = ej ? faltan(ej, quiero) : 0
  const activo = !!data.settings.candado?.llave
  const abrirRedes = () => { haptic(10); window.location.assign(new URL('?candado=redes', document.baseURI).href) }
  return <section className="d-redes">
    <div className="d-card d-minutos">
      <div className="d-card-head"><h2>Tus minutos de redes</h2><DuoIcon name="reloj" size={34} /></div>
      <Saldo data={data} />
      {activo && !paseAbierto(data, Date.now()) && <button type="button" className="d-btn green wide d-abrir-redes" onClick={abrirRedes}><DuoIcon name="candado" size={24} />Abrir mis redes</button>}
      {activo && <PaseAbierto data={data} commit={commit} onMessage={setNota} boton />}
      <p className="d-hint left">Suman los ejercicios que cuente la cámara aquí, en Libre o en un reto; tu rutina no cuenta. Se reinicia cada noche.{sem.ganados > 0 || sem.gastados > 0 ? ` Esta semana: ganaste ${sem.ganados} min y usaste ${sem.gastados}.` : ''}</p>
    </div>

    <div className="d-card d-redes-ganar">
      <h2>Ganar minutos</h2>
      <p className="d-tb-sub">¿Cuántos minutos quieres ganar?</p>
      <div className="d-chips">{QUIERO.map(m => <button key={m} type="button" className={quiero === m ? 'on' : ''} onClick={() => { haptic(8); setQuiero(m) }}>{m} min</button>)}</div>
      {ej ? <div className="d-redes-plan">
        <small>Para {quiero} minutos haz</small>
        <strong>{seg ? `${cuanto} s` : cuanto}</strong>
        <b>{seg ? `de ${ej.toLowerCase()}` : ej.toLowerCase()}</b>
        <small>{tasaTexto(ej)}</small>
        <button type="button" className="d-btn green wide" onClick={() => { haptic(10); setCam(true) }}><DuoIcon name="camara" size={24} />Abrir cámara</button>
        <button type="button" className="d-btn white wide small" onClick={() => setElegir(true)}>Cambiar ejercicio</button>
      </div> : <button type="button" className="d-btn blue wide" onClick={() => { haptic(8); setElegir(true) }}>Seleccionar ejercicio</button>}
      {nota && <p className="d-minutos-nota"><DuoIcon name="check" size={22} />{nota}</p>}
    </div>

    <div className="d-card">
      <h2>Cuánto vale cada ejercicio</h2>
      {CAMARA_GRUPOS.map((g, i) => <details key={g.grupo} className="d-redes-grupo" open={i === 0}>
        <summary>{g.grupo}</summary>
        <ul className="d-redes-tasas">{g.ejercicios.map(e => <li key={e.name}><b>{e.name}</b><span>{tasaCorta(e.name)}</span></li>)}</ul>
      </details>)}
    </div>

    <div className={`d-card d-redes-candado ${activo ? 'on' : ''}`}>
      <div className="d-card-head"><h2>Bloqueo de redes</h2><DuoIcon name="candado" size={32} /></div>
      <p className="d-hint left">{activo ? 'Activo: tus redes se abren solo con los minutos que ganas aquí.' : 'Todavía no está activo. Se prende una vez con Atajos del iPhone.'}</p>
      {onAjustes && <button type="button" className="d-btn white wide small" onClick={onAjustes}>{activo ? 'Ver el bloqueo en Ajustes' : 'Activarlo en Ajustes'}</button>}
    </div>

    {elegir && <Sheet title={`Ganar ${quiero} minutos`} onClose={() => setElegir(false)}>
      <p className="d-hint left">Esto tienes que hacer con la cámara para ganar {quiero} minutos:</p>
      <GanarMinutos minimo={quiero} onElegir={x => { setEj(x); setElegir(false) }} />
    </Sheet>}
    {cam && ej && <Camara ej={ej} meta={cuanto} commit={commit} onCerrar={() => setCam(false)} onListo={t => { setCam(false); haptic([15, 30, 15]); setNota(t) }} />}
  </section>
}

type Paso = 'inicio' | 'abriendo' | 'listo' | 'resistio'

export function CandadoPage({ data, commit, app, onSalir }: { data: AppData; commit: Commit; app: string; onSalir: (a?: 'Entrenar') => void }) {
  const today = dateKey()
  const [paso, setPaso] = useState<Paso>('inicio')
  const [ej, setEj] = useState<string | null>(null)
  const [nota, setNota] = useState('')
  const [ahora] = useState(() => Date.now())
  const llave = data.settings.candado?.llave
  const s = saldo(data, today)
  const bloqueado = lockActive(data, today, clockOf(Date.now()))
  const elegida = app && app !== 'redes' ? pauseApp(app) : null
  const abierto = paseAbierto(data, ahora)
  const hasta = data.settings.candado?.hasta ?? 0

  async function abrir(min: number, urgencia = false) {
    if (!llave) return
    haptic([12, 30, 12])
    setPaso('abriendo')
    const desde = Date.now(), fin = desde + min * 60000
    try {
      await guardarPase(llave, hastaTexto(fin))
    } catch {
      setNota('No se pudo abrir. Revisa tu señal y vuelve a intentar.')
      setPaso('inicio')
      return
    }
    const act = urgencia ? emergenciaActivity(today, elegida?.id ?? 'redes') : paseActivity(today, elegida?.id ?? 'redes', min)
    commit(d => d.activities.some(a => a.id === act.id) ? d : { ...d, activities: [...d.activities, act], settings: { ...d.settings, candado: { llave, desde, hasta: fin, pase: act.id } } })
    if (data.settings.avisos) avisarFinPase(fin)
    setPaso('listo')
    if (elegida?.scheme) window.location.href = elegida.scheme
  }
  function emergencia() {
    if (!window.confirm(`¿Abrir ${EMERGENCIA_MIN} minutos para uso importante, como contestar un mensaje o publicar? No gasta tus minutos. Cuando acabes, toca "Ya terminé".`)) return
    void abrir(EMERGENCIA_MIN, true)
  }
  async function devolver() {
    if (!llave) return
    haptic(10)
    try { await guardarPase(llave, hastaTexto(0)) } catch { setNota('No se pudo. Revisa tu señal.'); return }
    commit(devolverPase)
    if (data.settings.avisos) avisarFinPase(0)
    setNota('Te devolví los minutos. Revisa el atajo en Ajustes → Bloqueo de redes.')
    setPaso('inicio')
  }
  function resistir() {
    haptic(10)
    commit(d => ({ ...d, activities: [...d.activities, pauseActivity(today, elegida ?? pauseApp('instagram'), { kind: 'resistida' })] }))
    setPaso('resistio')
  }
  const botonesApps = elegida?.scheme ? <a className="d-btn green wide" href={elegida.scheme}>Abrir {elegida.name}</a>
    : <div className="d-candado-apps">{APPS.map(a => <a key={a.id} className="d-btn white" href={a.scheme}>{a.name}</a>)}</div>

  return <div className="d-candado" role="main">
    <header className="d-run-top"><button type="button" className="d-x" onClick={() => onSalir()} aria-label="Ir a bambú">×</button><span className="d-libre-tag">Candado</span><span /></header>
    {paso === 'listo' ? <div className="d-candado-body">
      <span className="d-candado-ico ok"><DuoIcon name="check" size={56} /></span>
      <h1>Abierto hasta las {hora(hasta)}</h1>
      <p>Te quedan {saldo(data, today)} min para hoy.</p>
      {botonesApps}
      <PaseAbierto data={data} commit={commit} onMessage={setNota} boton />
      <button type="button" className="d-link" onClick={() => onSalir()}>Ir a bambú</button>
    </div> : paso === 'resistio' ? <div className="d-candado-body">
      <span className="d-candado-ico oro"><DuoIcon name="estrella" size={56} /></span>
      <h1>Bien hecho</h1>
      <p>Una vez menos. Eso también cuenta.</p>
      <button type="button" className="d-btn green wide" onClick={() => onSalir()}>Ir a bambú</button>
    </div> : abierto && paso === 'inicio' ? <div className="d-candado-body">
      <span className="d-candado-ico ok"><DuoIcon name="reloj" size={56} /></span>
      <h1>Tu pase sigue abierto</h1>
      <p>Hasta las {hora(abierto.hasta)}, te quedan {Math.max(1, Math.ceil((abierto.hasta - ahora) / 60000))} min.</p>
      {botonesApps}
      <PaseAbierto data={data} commit={commit} onMessage={setNota} boton />
      {nota && <p className="d-hint">{nota}</p>}
      {ahora - abierto.desde < DEVOLVER_MS && <div className="d-card d-candado-devolver">
        <b>¿El atajo te regresó aquí sin dejarte entrar?</b>
        <button type="button" className="d-btn white wide" onClick={() => void devolver()}>Devolverme los minutos</button>
      </div>}
      <button type="button" className="d-link" onClick={() => onSalir()}>Ir a bambú</button>
    </div> : <div className="d-candado-body">
      <span className="d-candado-ico"><DuoIcon name="candado" size={56} /></span>
      <h1>{elegida ? `${elegida.name} tiene candado` : 'Tus redes tienen candado'}</h1>
      {!llave ? <p>Activa el candado en Ajustes para usar tus minutos.</p> : <>
        <Saldo data={data} />
        {nota && <p className="d-minutos-nota"><DuoIcon name="check" size={22} />{nota}</p>}
        {bloqueado ? <p className="d-candado-lock">Se pasó tu hora de entrenar ({planOf(data).deadline}). Haz aunque sea una serie para abrir.</p>
          : s > 0 ? <div className="d-candado-elegir">
            <p className="d-tb-sub">¿Cuánto tiempo abro?</p>
            <div className="d-candado-pases">{PASES.map(m => <button key={m} type="button" className="d-btn green" disabled={m > s || paso === 'abriendo'} onClick={() => void abrir(m)}>{m}<small>min</small></button>)}</div>
            {!PASES.includes(s as typeof PASES[number]) && s < PASES[PASES.length - 1] * 4 && <button type="button" className="d-btn white wide" disabled={paso === 'abriendo'} onClick={() => void abrir(s)}>Usar mis {s} min</button>}
          </div> : <p className="d-candado-falta">Ya no te quedan minutos. Gánalos con la cámara:</p>}
        {!data.settings.sinUsoImportante && <button type="button" className="d-btn white wide d-candado-urgencia" disabled={paso === 'abriendo'} onClick={emergencia}>{EMERGENCIA_MIN} min para uso importante</button>}
        <h2 className="d-sheet-h3">Gana más minutos</h2>
        <p className="d-hint left">Suman los ejercicios que cuente la cámara aquí, en Libre o en un reto (tu rutina no cuenta).</p>
        <GanarMinutos onElegir={setEj} minimo={bloqueado || s >= PASES[0] ? 0 : PASES[0] - s} />
      </>}
      {!llave && nota && <p className="d-hint red">{nota}</p>}
      <button type="button" className="d-btn white wide" onClick={resistir}>Mejor no entro</button>
    </div>}
    {ej && <Camara ej={ej} commit={commit} onCerrar={() => setEj(null)} onListo={t => { setEj(null); setPaso('inicio'); haptic([15, 30, 15]); setNota(t) }} />}
  </div>
}

export function Saldo({ data }: { data: AppData }) {
  const today = dateKey()
  return <div className="d-candado-saldo">
    <div className="d-minutos-num center"><strong>{saldo(data, today)}</strong><span>min para hoy</span></div>
    <div className="d-candado-desglose">
      <span>Libres<b>{libresDe(data)}</b></span>
      <span>Ganados<b>+{ganados(data, today)}</b></span>
      <span>Usados<b>−{gastados(data, today)}</b></span>
    </div>
  </div>
}

export function CandadoSetup({ data, commit, onMessage, cloud }: { data: AppData; commit: Commit; onMessage: (t: string) => void; cloud: boolean }) {
  const [busy, setBusy] = useState(false)
  const [ver, setVer] = useState(false)
  const llave = data.settings.candado?.llave
  const url = `${window.location.origin}${window.location.pathname}?candado=redes`
  const copiar = (t: string, que: string) => { navigator.clipboard?.writeText(t).then(() => onMessage(`${que} copiado.`)).catch(() => onMessage(t)) }
  async function activar() {
    const nueva = llave ?? nuevaLlave()
    setBusy(true)
    try {
      await guardarPase(nueva, hastaTexto(0))
      if (!llave) commit(d => ({ ...d, settings: { ...d.settings, candado: { llave: nueva } } }))
      setVer(true)
      onMessage('Candado listo. Ahora arma el atajo en tu iPhone.')
    } catch { onMessage('No se pudo activar. Revisa tu señal.') }
    setBusy(false)
  }
  async function probar() {
    if (!llave) return
    setBusy(true)
    try {
      await guardarPase(llave, hastaTexto(Date.now() + 60000))
      onMessage('Abre Instagram ahora. Si entras, tu atajo funciona. En 1 minuto se vuelve a cerrar.')
    } catch { onMessage('No se pudo. Revisa tu señal.') }
    setBusy(false)
  }
  async function quitar() {
    if (!llave || !window.confirm('¿Quitar el candado? Después borra también la automatización en Atajos.')) return
    try { await borrarPase(llave) } catch { onMessage('No se pudo quitar. Revisa tu señal.'); return }
    commit(d => ({ ...d, settings: { ...d.settings, candado: undefined } }))
    onMessage('Candado quitado.')
  }
  const libres = libresDe(data)
  const setLibres = (m: number) => { haptic(6); commit(d => ({ ...d, settings: { ...d.settings, minLibres: m } })) }
  const textoLibres = (m: number) => m === 0 ? 'Ninguno' : m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`
  return <div className="d-card d-candado-setup">
    <div className="d-card-head"><h2>Bloqueo de redes</h2><span className={`d-estado ${llave ? 'on' : ''}`}>{llave ? 'Activo' : 'Apagado'}</span></div>
    <p className="d-hint left">Cuando abres Instagram, TikTok o la que elijas, tu iPhone revisa si tienes tiempo. Si no, te manda a bambú a usar tus minutos o a ganarlos con ejercicio.</p>
    <Saldo data={data} />
    <div className="d-field">Minutos libres cada día
      <div className="d-chips">{LIBRES_OPCIONES.map(m => <button key={m} type="button" className={libres === m ? 'on' : ''} aria-pressed={libres === m} onClick={() => setLibres(m)}>{textoLibres(m)}</button>)}</div>
    </div>
    <p className="d-hint left">{libres ? `Cada día te doy ${textoLibres(libres)} gratis` : 'No te doy minutos gratis'}; lo demás lo ganas con cualquier ejercicio que cuente la cámara.</p>
    <button type="button" role="switch" aria-checked={!data.settings.sinUsoImportante} className={`d-switch ${data.settings.sinUsoImportante ? '' : 'on'}`} onClick={() => { haptic(6); commit(d => ({ ...d, settings: { ...d.settings, sinUsoImportante: d.settings.sinUsoImportante ? undefined : true } })) }}>
      <span><strong>{EMERGENCIA_MIN} min para uso importante</strong><small>Para contestar un mensaje o publicar sin gastar tus minutos.</small></span><i aria-hidden="true" />
    </button>
    <details className="d-more"><summary>Cuánto vale cada ejercicio</summary>
      <table className="d-rec-table"><tbody>{CAMARA_BASICOS.map(e => e.name).map(n => <tr key={n}><td><b>{n}</b></td><td>{tasaTexto(n).split(' = ')[0]}</td><td className="rec">{tasaTexto(n).split(' = ')[1]}</td></tr>)}</tbody></table>
    </details>
    {!cloud ? <p className="d-hint left red">Necesitas una cuenta para el candado.</p>
      : !llave ? <button type="button" className="d-btn green wide" disabled={busy} onClick={() => void activar()}>{busy ? 'Activando…' : 'Activar candado'}</button>
        : <>
          <button type="button" className="d-btn blue wide" disabled={busy} onClick={() => void probar()}>{busy ? 'Abriendo…' : 'Probar mi atajo (1 min gratis)'}</button>
          <button type="button" className="d-btn white wide" onClick={() => setVer(!ver)}>{ver ? 'Ocultar los pasos' : 'Ver cómo armar el atajo'}</button>
          {ver && <ol className="d-steps-guide">
            <li><span>Abre <b>Atajos</b>, toca <b>+</b> y ponle de nombre <b>Bambú Candado</b>.</span></li>
            <li><span>Agrega <b>Obtener contenido de URL</b> y pega este enlace: <button type="button" className="d-link" onClick={() => copiar(urlPase(llave), 'Enlace de revisión')}>Copiar enlace de revisión</button></span></li>
            <li><span>Agrega <b>Obtener valor del diccionario</b> y en la clave pega esto (sin punto al final): <button type="button" className="d-link" onClick={() => copiar('fields.hasta.stringValue', 'Clave')}>Copiar clave</button></span></li>
            <li><span>Agrega <b>Obtener fechas de la entrada</b> con ese valor.</span></li>
            <li><span>Agrega <b>Si</b>: Fechas <b>es posterior a</b>, <b>mantén presionada</b> la fecha y elige <b>Fecha actual</b> (no escribas una fecha). Si sale una fila vacía de Condición, quítala con ⊖. Entre <b>Si</b> y <b>Terminar si</b> pon <b>Detener este atajo</b>. Así, si tienes tiempo, te deja pasar.</span></li>
            <li><span>Después de <b>Terminar si</b>, agrega <b>Abrir URL</b> (no la acción que solo dice URL) con este enlace: <button type="button" className="d-link" onClick={() => copiar(url, 'Enlace del candado')}>Copiar enlace del candado</button></span></li>
            <li><span>En <b>Automatización</b> toca <b>+</b>, elige <b>App</b>, marca Instagram, TikTok y las que quieras, <b>Se abre</b> y <b>Ejecutar de inmediato</b>. Acción: <b>Ejecutar atajo → Bambú Candado</b>.</span></li>
            <li><span>Abre bambú una vez en <b>Safari</b> con tu cuenta: ahí se abre el candado.</span></li>
            <li><span>Para que Safari no se llene de pestañas y se trabe: <b>Ajustes del iPhone → Safari → Cerrar pestañas → Tras un día</b>.</span></li>
          </ol>}
          <button type="button" className="d-link" onClick={() => void quitar()}>Quitar candado</button>
        </>}
  </div>
}
