import { useCallback, useEffect, useState } from 'react'
import { dateKey, type AppData } from './lib/model'
import type { Dir } from './lib/perfil'
import { borrarReto, crearReto, cuenta, cuentaActiva, leerReto, marcarReto, misRetos } from './lib/firebase'
import { MAX_PERSONAS, SEG_REPS, TIPOS, TOPE_AGUANTE, aVencer, estadoReto, lugarDe, lugares, nombreTipo, valorTexto, visibles, type Reto, type TipoReto } from './lib/retos'
import { conCamara } from './lib/minutos'
import { CamaraValor } from './Candado'
import { Avatar, type Commit } from './Tablas'
import { Sheet } from './Sheet'
import { DuoIcon } from './DuoIcons'
import { haptic } from './lib/haptic'
import { relDe, useSocial } from './useSocial'

let cache: { uid: string; at: number; lista: Reto[] } | null = null
const OCULTOS = 'bambu.retos.ocultos'
const leerOcultos = (): string[] => { try { const v = JSON.parse(localStorage.getItem(OCULTOS) ?? '[]'); return Array.isArray(v) ? v.slice(-200) : [] } catch { return [] } }

export function cargarRetos(uid: string, force = false): Promise<Reto[]> {
  if (!force && cache?.uid === uid && Date.now() - cache.at < 60000) return Promise.resolve(cache.lista)
  return misRetos(uid).then(lista => { cache = { uid, at: Date.now(), lista }; return lista })
}

export function useRetos(uid: string | undefined) {
  const [lista, setLista] = useState<Reto[] | null>(() => cache && cache.uid === uid ? cache.lista : null)
  const [failed, setFailed] = useState(false)
  const load = useCallback((force = false) => {
    if (!uid) return
    setFailed(false)
    cargarRetos(uid, force).then(setLista).catch(() => setFailed(true))
  }, [uid])
  useEffect(() => { load() }, [load])
  return { lista, failed, reload: () => load(true) }
}

export function useDuelosToca(): number {
  const uid = cuentaActiva ? cuenta.guardada()?.uid : undefined
  const { lista } = useRetos(uid)
  return uid && lista ? lista.filter(r => estadoReto(r, uid) === 'te-toca').length : 0
}

type Intento = { tipo: TipoReto; ej: string; rivales?: string[]; reto?: Reto }
const kindDe = (t: TipoReto) => t === 'aguante' ? 'seconds' as const : 'reps' as const
const lugarTexto = (n: number) => `${n}.º`

export function RetosCard({ uid, amigos, dirOf, commit, onMessage }: { uid: string; amigos: Dir[]; dirOf: (id: string) => Dir | undefined; commit: Commit; onMessage: (t: string) => void }) {
  const { lista, failed, reload } = useRetos(uid)
  const [ocultos, setOcultos] = useState(leerOcultos)
  const [nuevo, setNuevo] = useState(false)
  const [tipo, setTipo] = useState<TipoReto>('reps')
  const [ej, setEj] = useState(TIPOS[0].ejercicios[0])
  const [elegidos, setElegidos] = useState<string[]>([])
  const [cam, setCam] = useState<Intento | null>(null)
  const [pendiente, setPendiente] = useState<(Intento & { valor: number }) | null>(null)
  const [ver, setVer] = useState<Reto | null>(null)
  const [busy, setBusy] = useState(false)
  const nombre = (id: string) => id === uid ? 'Tú' : dirOf(id)?.apodo ?? 'Amigo'
  const vis = visibles(lista ?? [], uid, ocultos)

  async function enviar(it: Intento & { valor: number }) {
    setBusy(true)
    try {
      if (it.reto) {
        let r = it.reto
        try { await marcarReto(r, uid, it.valor) } catch {
          const fresco = await leerReto(r.id)
          if (!fresco || uid in fresco.marcas) throw new Error('reto')
          r = fresco
          await marcarReto(r, uid, it.valor)
        }
        const hecho = { ...r, marcas: { ...r.marcas, [uid]: it.valor } }
        const l = lugarDe(hecho, uid)
        onMessage(l && l.de > 1 ? `Vas ${lugarTexto(l.lugar)} de ${l.de} con ${valorTexto(hecho, it.valor)}.` : `Listo: ${valorTexto(hecho, it.valor)}.`)
      } else if (it.rivales?.length) {
        await crearReto(it.rivales, it.tipo, it.ej, it.valor)
        onMessage(`Hiciste ${valorTexto({ tipo: it.tipo, ejercicio: it.ej }, it.valor)}. Ya les toca a ${it.rivales.length === 1 ? nombre(it.rivales[0]) : `${it.rivales.length} amigos`}.`)
      }
      setPendiente(null)
    } catch {
      setPendiente(it)
      onMessage('No se pudo mandar tu marca. Revisa tu señal y vuelve a intentar.')
    } finally { setBusy(false); reload() }
  }
  function alTerminar(valor: number) {
    const c = cam
    setCam(null)
    if (!c) return
    if (valor > 0) { const day = dateKey(); commit(d => conCamara(d, day, c.ej, kindDe(c.tipo), valor)) }
    void enviar({ ...c, valor })
  }
  function abrirNuevo(r?: Reto) {
    haptic(8)
    const t = r?.tipo ?? 'reps'
    setTipo(t)
    setEj(r?.ejercicio ?? TIPOS.find(x => x.tipo === t)!.ejercicios[0])
    setElegidos(r ? r.participantes.filter(p => p !== uid && amigos.some(a => a.uid === p)) : [])
    setNuevo(true)
  }
  function ocultar(r: Reto) {
    const v = [...ocultos, r.id].slice(-200)
    setOcultos(v)
    try { localStorage.setItem(OCULTOS, JSON.stringify(v)) } catch { return }
    if (r.de === uid && estadoReto(r, uid) !== 'esperando') void borrarReto(r.id).catch(() => undefined)
  }
  function cambiarTipo(t: TipoReto) { setTipo(t); setEj(TIPOS.find(x => x.tipo === t)!.ejercicios[0]) }
  const alternar = (id: string) => setElegidos(x => x.includes(id) ? x.filter(y => y !== id) : x.length >= MAX_PERSONAS - 1 ? x : [...x, id])

  const fila = (r: Reto) => {
    const e = estadoReto(r, uid)
    const listos = r.participantes.filter(p => p in r.marcas).length
    const top = aVencer(r)
    const l = lugarDe(r, uid)
    const titulo = e === 'te-toca' ? `${nombre(r.de)} te retó` : e === 'esperando' ? (r.de === uid ? 'Tu reto' : `Reto de ${nombre(r.de)}`) : e === 'vencido' ? 'Se te pasó el tiempo' : l && l.lugar === 1 ? (l.empate ? 'Empate en primer lugar' : '¡Ganaste!') : l ? `Quedaste ${lugarTexto(l.lugar)} de ${l.de}` : 'Reto terminado'
    const sub = `${nombreTipo(r.tipo)} · ${r.ejercicio} · ${e === 'te-toca' && top ? `a vencer ${valorTexto(r, top.valor)} (${nombre(top.uid)})` : `${listos} de ${r.participantes.length} listos`}`
    return <div className={`d-am-row d-duelo ${e === 'terminado' && l?.lugar === 1 ? 'gane' : e}`} key={r.id}>
      <button type="button" className="d-am-who" onClick={() => setVer(r)}><Avatar n={dirOf(r.de)?.avatar ?? 0} size={46} /><span><b>{titulo}</b><small>{sub}</small></span></button>
      {e === 'te-toca' && <button type="button" className="d-btn green small" disabled={busy} onClick={() => { haptic(8); setCam({ tipo: r.tipo, ej: r.ejercicio, reto: r }) }}>Aceptar</button>}
      {e === 'terminado' && <button type="button" className="d-btn white small" onClick={() => abrirNuevo(r)}>Revancha</button>}
      {e !== 'te-toca' && e !== 'esperando' && <button type="button" className="d-x" aria-label="Quitar" onClick={() => ocultar(r)}>×</button>}
    </div>
  }

  const t = TIPOS.find(x => x.tipo === tipo)!
  return <div className="d-card d-duelos">
    <div className="d-am-title"><h2>Retos</h2>{amigos.length > 0 && <button type="button" className="d-btn green small" onClick={() => abrirNuevo()}>Retar</button>}</div>
    {failed && <p className="d-hint">No se pudieron cargar los retos. Revisa tu señal.</p>}
    {pendiente && <button type="button" className="d-btn blue wide small" disabled={busy} onClick={() => void enviar(pendiente)}>Mandar otra vez mi marca</button>}
    {lista && !vis.length && <p className="d-hint left">{amigos.length ? 'Reta a uno o a varios amigos: repeticiones en 60 s, aguantar más o Cindy. Todo con la cámara.' : 'Cuando tengas amigos podrás retarlos.'}</p>}
    {vis.map(fila)}

    {nuevo && <Sheet title="Nuevo reto" tall onClose={() => setNuevo(false)}>
      <p className="d-tb-sub">¿Qué tipo?</p>
      <div className="d-reto-tipos">{TIPOS.map(x => <button key={x.tipo} type="button" className={`d-reto-tipo ${tipo === x.tipo ? 'on' : ''}`} aria-pressed={tipo === x.tipo} onClick={() => cambiarTipo(x.tipo)}><b>{x.nombre}</b><small>{x.texto}</small></button>)}</div>
      {t.ejercicios.length > 1 && <>
        <p className="d-tb-sub">¿Qué ejercicio?</p>
        <div className="d-chips">{t.ejercicios.map(x => <button key={x} type="button" className={ej === x ? 'on' : ''} onClick={() => setEj(x)}>{x}</button>)}</div>
      </>}
      <p className="d-tb-sub">¿A quién retas? <small>{elegidos.length ? `${elegidos.length} ${elegidos.length === 1 ? 'amigo' : 'amigos'}` : 'uno o varios'}</small></p>
      <div className="d-chips">
        {amigos.length > 1 && <button type="button" className={elegidos.length === Math.min(amigos.length, MAX_PERSONAS - 1) ? 'on' : ''} onClick={() => setElegidos(elegidos.length ? [] : amigos.slice(0, MAX_PERSONAS - 1).map(a => a.uid))}>Todos</button>}
        {amigos.map(a => <button key={a.uid} type="button" className={elegidos.includes(a.uid) ? 'on' : ''} onClick={() => alternar(a.uid)}>{a.apodo}</button>)}
      </div>
      <p className="d-hint left"><DuoIcon name="camara" size={20} /> Tú vas primero con la cámara. Los demás tienen 2 días.</p>
      <button type="button" className="d-btn green wide" disabled={!elegidos.length} onClick={() => { setNuevo(false); setCam({ tipo, ej, rivales: elegidos }) }}>Empezar mi intento</button>
    </Sheet>}

    {ver && <Sheet title={`${nombreTipo(ver.tipo)} · ${ver.ejercicio}`} onClose={() => setVer(null)}>
      <ol className="d-reto-lugares">{lugares(ver).map(x => <li key={x.uid} className={x.uid === uid ? 'yo' : ''}><span className="d-reto-lugar">{lugarTexto(x.lugar)}</span><Avatar n={dirOf(x.uid)?.avatar ?? 0} size={34} /><b>{nombre(x.uid)}</b><em>{valorTexto(ver, x.valor)}</em></li>)}</ol>
      {ver.participantes.filter(p => !(p in ver.marcas)).map(p => <p key={p} className="d-hint left">{nombre(p)}: {estadoReto(ver, uid) === 'terminado' ? 'no participó' : 'todavía no'}</p>)}
    </Sheet>}
    {cam && <CamaraValor ej={cam.ej} kind={kindDe(cam.tipo)} limite={cam.tipo === 'reps' ? SEG_REPS : cam.tipo === 'aguante' ? TOPE_AGUANTE : undefined} hastaFallar={cam.tipo === 'aguante'} onCerrar={() => setCam(null)} onValor={alTerminar} />}
  </div>
}

export function DuelosPage({ data, commit, onMessage, onAmigos }: { data: AppData; commit: Commit; onMessage: (t: string) => void; onAmigos?: () => void }) {
  const uid = cuentaActiva ? cuenta.guardada()?.uid : undefined
  const joined = !!data.settings.tablas
  const amigos = data.settings.amigos ?? []
  const aceptados = data.settings.tablas?.privada ? data.settings.aprobados ?? [] : null
  const { social, failed } = useSocial(uid, amigos, !!uid && joined)
  const como = <div className="d-card">
    <h2>Cómo funciona</h2>
    <ul className="d-duelo-como">
      <li>Eliges tipo, ejercicio y a uno o varios amigos (hasta {MAX_PERSONAS - 1}).</li>
      <li>Tú vas primero con la cámara; los demás tienen 2 días para superarte.</li>
      <li>Más repeticiones: 60 s. Aguantar más: hasta que pierdes la postura. Cindy: 20 min.</li>
      <li>Media repetición vale cero. Los retos no dan minutos de redes.</li>
    </ul>
  </div>
  if (!uid || !joined) return <section className="d-redes">
    <div className="d-card d-am-empty">
      <DuoIcon name="espada" size={64} />
      <h2>Retos con amigos</h2>
      <p className="d-hint">Para retar a tus amigos necesitas cuenta y perfil.</p>
      {onAmigos && <button type="button" className="d-btn green wide" onClick={onAmigos}>Ir a Amigos</button>}
    </div>
    {como}
  </section>
  const mutuos = (social?.dir ?? []).filter(d => d.uid !== uid && amigos.includes(d.uid) && relDe(uid, amigos, d, social, aceptados) === 'amigos')
  return <section className="d-redes">
    {failed && <p className="d-hint">No se pudo cargar. Revisa tu señal.</p>}
    {!social && !failed && <p className="d-hint">Cargando…</p>}
    {social && <RetosCard uid={uid} amigos={mutuos} dirOf={id => social.dir.find(d => d.uid === id)} commit={commit} onMessage={onMessage} />}
    {social && !mutuos.length && onAmigos && <button type="button" className="d-btn white wide" onClick={onAmigos}>Agregar amigos</button>}
    {como}
  </section>
}
