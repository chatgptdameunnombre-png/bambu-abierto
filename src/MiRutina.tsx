import { useEffect, useMemo, useRef, useState } from 'react'
import { dateKey, type AppData, type Routine, type RoutineItem, type RoutineKind, type TrainPlan } from './lib/model'
import { applyBump, bumps, CATALOG, clockOf, doneCount, label, lockActive, logSet, newItem, nextStep, planOf, quietBump, roundsOf, routineProgress, setsNeeded, stepsOf, undoLast, weekIndex, WEEK_DAYS, WEEK_SHORT, type Step } from './lib/rutina'
import { XP } from './lib/xp'
import { chime, useNow, useWakeLock } from './ui'
import { haptic } from './lib/haptic'
import { BroteArt } from './Brote'
import { DuoIcon } from './DuoIcons'
import { LibrePage } from './Libre'
import { AventuraPage } from './Aventura'
import { RedesPage } from './Candado'
import { DuelosPage, useDuelosToca } from './Duelos'
import { BotonCamara, CamaraValor } from './Candado'
import { conCamara } from './lib/minutos'

type Commit = (update: (d: AppData) => AppData) => void
type Msg = (t: string, undo?: () => void) => void
const PREP = 10
export const RUN_KEY = 'bambu.rutina.abierta'
function runSaved(day: string): boolean { try { return localStorage.getItem(RUN_KEY) === day } catch { return false } }
type Feedback = { name: string; value: string; xp: number; rest: boolean; side?: 1 | 2 }

function Ring({ total, left }: { total: number; left: number }) {
  const frac = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0
  return <svg className="d-dial-ring" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="46" className="track" pathLength="100" />
    {frac > 0 && <circle cx="50" cy="50" r="46" className="fill" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - frac * 100} />}
  </svg>
}

function Runner({ data, commit, rt, today, start, rest, onClose }: { data: AppData; commit: Commit; rt: Routine; today: string; start: string | null; rest: number; onClose: () => void }) {
  useWakeLock(true)
  const [focus, setFocus] = useState<string | null>(start)
  const [count, setCount] = useState(0)
  const [adjust, setAdjust] = useState(false)
  const [timer, setTimer] = useState<{ startedAt: number | null; before: number }>({ startedAt: null, before: 0 })
  const [restUntil, setRestUntil] = useState<number | null>(null)
  const [prepUntil, setPrepUntil] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [opened] = useState(() => Date.now())
  const [earned, setEarned] = useState(0)
  const [cam, setCam] = useState(false)
  const steps = useMemo(() => stepsOf(rt), [rt])
  const pending = steps.filter(st => doneCount(data, today, st.item) < st.slot)
  const step: Step | null = (focus && pending.find(st => st.item.id === focus)) || nextStep(data, today, rt)
  const item = step?.item
  const running = timer.startedAt !== null
  const now = useNow(running || restUntil !== null || prepUntil !== null, 200)
  const elapsed = timer.before + (timer.startedAt ? (now - timer.startedAt) / 1000 : 0)
  const left = item ? Math.max(0, item.target - elapsed) : 0
  const restLeft = restUntil ? Math.max(0, Math.ceil((restUntil - now) / 1000)) : 0
  const prepLeft = prepUntil ? Math.max(0, Math.ceil((prepUntil - now) / 1000)) : 0
  const beeped = useRef(0)
  const prog = routineProgress(data, today, rt)
  const fired = useRef(false)

  useEffect(() => { setCount(0); setAdjust(false); setTimer({ startedAt: null, before: 0 }); setPrepUntil(null); fired.current = false }, [item?.id, step?.slot])
  useEffect(() => {
    if (!prepUntil) return
    if (prepLeft <= 0) { setPrepUntil(null); setTimer({ startedAt: Date.now(), before: 0 }); chime(); return }
    if (prepLeft <= 3 && beeped.current !== prepLeft) { beeped.current = prepLeft; haptic(40) }
  }, [prepLeft, prepUntil])
  useEffect(() => { if (restUntil && restLeft <= 0) { chime(); setRestUntil(null) } }, [restLeft, restUntil])
  useEffect(() => {
    if (!item || item.kind !== 'seconds' || !running || item.target <= 0 || left > 0 || fired.current) return
    fired.current = true
    chime()
    save(item.target)
  }, [left, running]) // eslint-disable-line react-hooks/exhaustive-deps

  function save(value: number, camara = false) {
    if (!item || !step) return
    haptic([15, 30, 15])
    const before = step
    setTimer(t => ({ startedAt: null, before: t.before }))
    commit(d => camara ? conCamara(d, today, item.name, item.kind === 'seconds' ? 'seconds' : 'reps', value) : logSet(d, today, item, value))
    const after = steps.find(st => doneCount(data, today, st.item) + (st.item.name === item.name ? 1 : 0) < st.slot)
    const xp = XP.set + (after ? 0 : XP.routine)
    setEarned(e => e + xp)
    setFeedback({ name: item.name, value: `${item.kind === 'seconds' ? `${Math.round(value)} s` : item.kind === 'free' ? 'hecho' : `${value} reps`}${before.side ? before.side === 1 ? ', lado izquierdo' : ', lado derecho' : ''}`, xp, side: before.side, rest: !!after && rest > 0 && before.phase === 'circuit' && after.phase === 'circuit' && after.round > before.round })
    setFocus(before.side === 1 ? item.id : null)
  }
  function hold() {
    haptic(10)
    if (prepUntil) return
    if (timer.startedAt) { setTimer(t => ({ startedAt: null, before: t.before + (Date.now() - (t.startedAt ?? Date.now())) / 1000 })); return }
    if (elapsed === 0) { beeped.current = 0; setPrepUntil(Date.now() + PREP * 1000); return }
    setTimer(t => ({ ...t, startedAt: Date.now() }))
  }
  function next() {
    if (feedback?.rest) setRestUntil(Date.now() + rest * 1000)
    setFeedback(null)
  }
  function undo() {
    if (!feedback) return
    commit(d => undoLast(d, today, feedback.name))
    setEarned(e => Math.max(0, e - feedback.xp))
    setFeedback(null)
  }

  const done = !step || !item
  let body
  let footer
  if (restUntil !== null) {
    body = <div className="d-run-body">
      <p className="d-eyebrow blue">Descanso entre rondas</p>
      <div className="d-dial blue"><Ring total={rest} left={restLeft} /><strong>{restLeft}</strong><small>segundos</small></div>
      <p className="d-run-next">Sigue: <b>{item?.name}</b></p>
    </div>
    footer = <button type="button" className="d-btn blue wide" onClick={() => setRestUntil(null)}>Saltar descanso</button>
  } else if (done) {
    const min = Math.max(1, Math.round((Date.now() - opened) / 60000))
    body = <div className="d-run-body">
      <BroteArt mood="orgulloso" size={150} />
      <h2 className="d-run-title">¡Rutina completa!</h2>
      <div className="d-tiles">
        <div className="d-tile gold"><span>XP ganado</span><b><DuoIcon name="rayo" size={24} />{earned}</b></div>
        <div className="d-tile green"><span>Series</span><b><DuoIcon name="pesa" size={24} />{prog.done}</b></div>
        <div className="d-tile blue"><span>Tiempo</span><b><DuoIcon name="reloj" size={24} />{min} min</b></div>
      </div>
      <p className="d-run-next">Toca la etiqueta del piso para cerrarla.</p>
    </div>
    footer = <button type="button" className="d-btn green wide" onClick={onClose}>Continuar</button>
  } else if (item && step) {
    const roundText = step.phase === 'before' ? 'Antes de las rondas' : step.phase === 'after' ? 'Para cerrar' : `Ronda ${step.round} de ${Math.max(rt.rounds, step.of)}`
    const sideText = step.side === 1 ? 'Lado izquierdo' : step.side === 2 ? 'Lado derecho' : ''
    body = <div className="d-run-body">
      <p className="d-eyebrow">{roundText}</p>
      <h2 className="d-run-title">{item.name}</h2>
      {sideText && <span className={`d-side ${step.side === 1 ? 'l' : 'r'}`}>{sideText}</span>}
      <p className="d-run-target">{label(item)}{setsNeeded(rt, item) > 1 ? ` · ${doneCount(data, today, item)} de ${setsNeeded(rt, item)} hechas` : ''}</p>
      {item.kind === 'reps' && item.target > 0 && !adjust && <>
        <button type="button" className="d-dial green tap" disabled={!!feedback} onClick={() => save(item.target)} aria-label={`Hice las ${item.target}`}>
          <Ring total={1} left={1} />
          <strong>{item.target}</strong><small>reps</small>
        </button>
        {!feedback && <button type="button" className="d-btn white small" onClick={() => { setCount(item.target); setAdjust(true) }}>Hice otra cantidad</button>}
      </>}
      {item.kind === 'reps' && (item.target === 0 || adjust) && <>
        <div className="d-adjust">
          <button type="button" className="d-btn white" disabled={!!feedback} onClick={() => setCount(c => Math.max(0, c - 1))} aria-label="Menos uno">−</button>
          <div className="d-dial green small"><strong>{count}</strong><small>reps</small></div>
          <button type="button" className="d-btn white" disabled={!!feedback} onClick={() => setCount(c => c + 1)} aria-label="Más uno">+</button>
        </div>
        {!feedback && item.target > 0 && <button type="button" className="d-link" onClick={() => setAdjust(false)}>Volver</button>}
      </>}
      {item.kind === 'seconds' && prepUntil !== null && <button type="button" className="d-dial gold-solid tap live" onClick={() => setPrepUntil(Date.now())} aria-label="Ya estoy, empezar">
        <Ring total={PREP} left={prepLeft} />
        <strong>{prepLeft}</strong><small>acomódate</small>
      </button>}
      {item.kind === 'seconds' && prepUntil === null && <button type="button" className={`d-dial blue tap ${running ? 'live' : ''}`} disabled={!!feedback} onClick={hold} aria-label={running ? 'Pausar' : 'Empezar'}>
        <Ring total={item.target} left={left} />
        <strong>{Math.ceil(left)}</strong><small>{running || elapsed === 0 ? 'segundos' : 'en pausa'}</small>
      </button>}
      {item.kind === 'free' && <div className="d-dial gold"><DuoIcon name="estrella" size={96} /></div>}
      {item.kind !== 'free' && !feedback && !running && prepUntil === null && <BotonCamara ej={item.name} kind={item.kind} onClick={() => setCam(true)} />}
      {cam && <CamaraValor ej={item.name} kind={item.kind} onCerrar={() => setCam(false)} onValor={v => { setCam(false); save(v, true) }} />}
    </div>
    if (!feedback) footer = item.kind === 'reps'
      ? <button type="button" className="d-btn green wide" disabled={(adjust || item.target === 0) && count === 0} onClick={() => save(adjust || item.target === 0 ? count : item.target)}>{adjust || item.target === 0 ? `Guardar ${count}` : `Hice las ${item.target}${step.side ? ' de este lado' : ''}`}</button>
      : item.kind === 'seconds'
        ? prepUntil !== null ? <div className="d-row2">
          <button type="button" className="d-btn white" onClick={() => setPrepUntil(null)}>Cancelar</button>
          <button type="button" className="d-btn green wide" onClick={() => setPrepUntil(Date.now())}>Ya estoy</button>
        </div> : <div className="d-row2">
          {elapsed > 0 && !running && <button type="button" className="d-btn white" onClick={() => save(elapsed)}>Terminé</button>}
          <button type="button" className={`d-btn ${running ? 'white' : 'blue'} wide`} onClick={hold}>{running ? 'Pausar' : elapsed > 0 ? 'Seguir' : 'Empezar'}</button>
        </div>
        : <button type="button" className="d-btn green wide" onClick={() => save(1)}>¡Hecho!</button>
  }

  return <div className="d-runner" role="dialog" aria-label="Rutina en curso">
    <header className="d-run-top">
      <button type="button" className="d-x" onClick={() => { if (prog.done > 0 && prog.done < prog.total && !window.confirm('¿Salir de la rutina? Lo que hiciste ya está guardado y puedes seguir después.')) return; onClose() }} aria-label="Cerrar">×</button>
      <div className="d-bar green thick"><span style={{ width: `${prog.total ? prog.done / prog.total * 100 : 0}%` }} /></div>
      <span className="d-run-count">{prog.done}/{prog.total}</span>
    </header>
    {body}
    {feedback ? <footer className="d-feedback">
      <div className="d-feedback-row">
        <span className="d-feedback-icon"><DuoIcon name="check" size={30} /></span>
        <div><b>{feedback.side === 1 ? '¡Lado izquierdo listo!' : feedback.side === 2 ? '¡Los dos lados listos!' : '¡Bien hecho!'}</b><span>{feedback.name}, {feedback.value} · +{feedback.xp} XP</span>{feedback.side === 1 && <em className="d-next-side">Cambia de lado: sigue el derecho</em>}</div>
        <button type="button" className="d-link" onClick={undo}>Deshacer</button>
      </div>
      <button type="button" className="d-btn green wide" onClick={next}>{feedback.side === 1 ? 'Continuar: lado derecho' : 'Continuar'}</button>
    </footer> : <footer className="d-run-foot">{footer}</footer>}
  </div>
}

function Editor({ plan, day, onSave, onCancel }: { plan: TrainPlan; day: number; onSave: (p: TrainPlan) => void; onCancel: () => void }) {
  const [rt, setRt] = useState<Routine | null>(plan.week[day] ? structuredClone(plan.week[day]) : null)
  const [pick, setPick] = useState('')
  const [own, setOwn] = useState('')
  const groups = [...new Set(CATALOG.map(c => c[3]))]
  const setItem = (i: number, patch: Partial<RoutineItem>) => setRt(r => r && { ...r, items: r.items.map((it, j) => j === i ? { ...it, ...patch } : it) })
  const move = (i: number, by: number) => setRt(r => { if (!r) return r; const items = [...r.items]; const j = i + by; if (j < 0 || j >= items.length) return r; [items[i], items[j]] = [items[j], items[i]]; return { ...r, items } })
  const add = (it: RoutineItem) => setRt(r => r && { ...r, items: [...r.items.filter(x => x.when !== 'after'), it, ...r.items.filter(x => x.when === 'after')] })

  return <div className="d-card d-editor">
    <div className="d-card-head"><h2>{WEEK_DAYS[day]}</h2><button type="button" className="d-link" onClick={() => setRt(rt ? null : { title: 'Rutina', rounds: 3, items: [] })}>{rt ? 'Hacerlo descanso' : 'Poner rutina'}</button></div>
    {!rt ? <p className="d-hint left">Día de descanso.</p> : <>
      <label className="d-field">Nombre<input className="d-input" value={rt.title} maxLength={80} onChange={e => setRt({ ...rt, title: e.target.value })} /></label>
      <label className="d-field">Rondas</label>
      <div className="d-seg">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" className={rt.rounds === n ? 'on' : ''} onClick={() => setRt({ ...rt, rounds: n })}>{n}</button>)}</div>
      <ul className="d-ed-list">{rt.items.map((it, i) => <li key={it.id}>
        <input className="d-input" value={it.name} maxLength={80} onChange={e => setItem(i, { name: e.target.value })} aria-label="Ejercicio" />
        <div className="d-ed-row">
          <select className="d-input" value={it.kind} onChange={e => setItem(i, { kind: e.target.value as RoutineKind })} aria-label="Tipo">
            <option value="reps">Reps</option><option value="seconds">Segundos</option><option value="free">Solo marcar</option>
          </select>
          {it.kind !== 'free' && <input className="d-input num" type="number" inputMode="numeric" min={0} max={3600} value={it.target} onChange={e => setItem(i, { target: Math.max(0, Math.min(3600, Number(e.target.value) || 0)) })} aria-label="Objetivo" />}
          <select className="d-input" value={it.when ?? ''} onChange={e => setItem(i, { when: (e.target.value || undefined) as RoutineItem['when'] })} aria-label="Cuándo">
            <option value="">En las rondas</option><option value="before">Antes</option><option value="after">Al final</option>
          </select>
          <select className="d-input" value={it.rounds ?? ''} onChange={e => setItem(i, { rounds: e.target.value ? Number(e.target.value) : undefined })} aria-label="Veces">
            <option value="">{it.when ? '1 vez' : `${rt.rounds} rondas`}</option>{[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'vez' : 'veces'}</option>)}
          </select>
        </div>
        <div className="d-ed-tools">
          <button type="button" onClick={() => move(i, -1)} aria-label="Subir">↑</button>
          <button type="button" onClick={() => move(i, 1)} aria-label="Bajar">↓</button>
          <button type="button" className={`side ${it.sides ? 'on' : ''}`} onClick={() => setItem(i, { sides: it.sides ? undefined : true })} aria-pressed={!!it.sides}>Por lado</button>
          <button type="button" className="del" onClick={() => setRt({ ...rt, items: rt.items.filter((_, j) => j !== i) })} aria-label="Quitar">×</button>
        </div>
      </li>)}</ul>
      <div className="d-inline">
        <select className="d-input" value={pick} onChange={e => setPick(e.target.value)} aria-label="Del catálogo">
          <option value="">Agregar del catálogo</option>
          {groups.map(g => <optgroup key={g} label={g}>{CATALOG.filter(c => c[3] === g).map(c => <option key={c[0]} value={c[0]}>{c[0]}</option>)}</optgroup>)}
        </select>
        <button type="button" className="d-btn blue" disabled={!pick} onClick={() => { const c = CATALOG.find(x => x[0] === pick); if (c) add({ ...newItem(c[0], c[1], c[2]), ...(c[4] ? { sides: true } : {}), ...(c[3] === 'Obligatorio' || c[3] === 'Cardio intenso' ? { when: 'after' as const } : {}) }); setPick('') }}>+</button>
      </div>
      <div className="d-inline">
        <input className="d-input" value={own} maxLength={80} onChange={e => setOwn(e.target.value)} placeholder="O escribe uno tuyo" />
        <button type="button" className="d-btn blue" disabled={!own.trim()} onClick={() => { add(newItem(own.trim(), 'reps', 10)); setOwn('') }}>+</button>
      </div>
      <label className="d-field">Copiar de otro día<select className="d-input" value="" onChange={e => { const src = plan.week[Number(e.target.value)]; if (src) setRt(structuredClone({ ...src, items: src.items.map(it => ({ ...it, id: newItem(it.name, it.kind, it.target).id })) })) }}>
        <option value="">Elegir día</option>{WEEK_DAYS.map((d, i) => i !== day && plan.week[i] ? <option key={i} value={i}>{d}: {plan.week[i]!.title}</option> : null)}
      </select></label>
    </>}
    <div className="d-row2">
      <button type="button" className="d-btn white" onClick={onCancel}>Cancelar</button>
      <button type="button" className="d-btn green wide" onClick={() => onSave({ ...plan, week: plan.week.map((x, i) => i === day ? (rt && rt.items.length ? { ...rt, title: rt.title.trim() || 'Rutina' } : null) : x) })}>Guardar</button>
    </div>
  </div>
}

type Modo = 'rutina' | 'libre' | 'redes' | 'duelos' | 'aventura'
const MODOS: Modo[] = ['rutina', 'libre', 'redes', 'duelos', 'aventura']
const MODO_NOMBRE: Record<Modo, string> = { rutina: 'Rutina', libre: 'Libre', redes: 'Redes', duelos: 'Retos', aventura: 'Aventura' }

export function MiRutina({ data, commit, onMessage, onIr }: { data: AppData; commit: Commit; onMessage: Msg; onIr?: (a: 'Amigos' | 'Ajustes') => void }) {
  const today = dateKey()
  const todayIdx = weekIndex(today)
  const [view, setView] = useState(todayIdx)
  const [editing, setEditing] = useState(false)
  const [mode, setModeState] = useState<Modo>(() => { try { const v = localStorage.getItem('bambu.entreno.modo') as Modo; return MODOS.includes(v) ? v : 'rutina' } catch { return 'rutina' } })
  const toca = useDuelosToca()
  const setMode = (m: Modo) => { try { localStorage.setItem('bambu.entreno.modo', m) } catch { /* solo recuerda la pestaña */ } setModeState(m) }
  const [run, setRunState] = useState<{ start: string | null } | null>(() => runSaved(today) ? { start: null } : null)
  const setRun = (v: { start: string | null } | null) => { try { if (v) localStorage.setItem(RUN_KEY, today); else localStorage.removeItem(RUN_KEY) } catch { /* solo recuerda la rutina abierta */ } setRunState(v) }
  const plan = planOf(data)
  const rt = plan.week[view]
  const isToday = view === todayIdx
  const prog = rt && isToday ? routineProgress(data, today, rt) : null
  const next = rt && isToday ? nextStep(data, today, rt) : null
  const locked = lockActive(data, today, clockOf(Date.now()))
  const ideas = bumps(data, today)
  const savePlan = (p: TrainPlan) => commit(d => ({ ...d, settings: { ...d.settings, train: p } }))

  const modeBar = <div className="d-mode five" role="tablist" aria-label="Tipo de entreno">
    {MODOS.map(m => <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{MODO_NOMBRE[m]}{m === 'duelos' && toca > 0 && <i className="d-mode-badge" aria-label={`${toca} retos te esperan`}>{toca}</i>}</button>)}
  </div>
  if (mode === 'libre') return <div className="d-page">{modeBar}<LibrePage data={data} commit={commit} onAmigos={onIr ? () => onIr('Amigos') : undefined} /></div>
  if (mode === 'duelos') return <div className="d-page">{modeBar}<DuelosPage data={data} commit={commit} onMessage={onMessage} onAmigos={onIr ? () => onIr('Amigos') : undefined} /></div>
  if (mode === 'redes') return <div className="d-page">{modeBar}<RedesPage data={data} commit={commit} onAjustes={onIr ? () => onIr('Ajustes') : undefined} /></div>
  if (mode === 'aventura') return <div className="d-page">{modeBar}<AventuraPage data={data} commit={commit} /></div>
  return <section className="d-page">
    {modeBar}
    <div className="d-days" role="tablist" aria-label="Días">{WEEK_SHORT.map((d, i) => <button key={i} type="button" role="tab" aria-selected={view === i} className={`${view === i ? 'on' : ''} ${i === todayIdx ? 'today' : ''} ${plan.week[i] ? '' : 'rest'}`} onClick={() => { setView(i); setEditing(false) }}>{d}</button>)}</div>

    <div className={`d-hero ${locked && isToday ? 'red' : 'green'}`}>
      <div className="d-hero-text">
        <p>{isToday ? 'Hoy toca' : WEEK_DAYS[view]}</p>
        <h1>{rt ? rt.title : 'Descanso'}</h1>
        {rt && <span>{rt.rounds} rondas · {rt.items.length} ejercicios</span>}
      </div>
      <DuoIcon name={locked && isToday ? 'candado' : 'pesa'} size={64} />
    </div>

    {editing ? <Editor plan={plan} day={view} onCancel={() => setEditing(false)} onSave={p => { savePlan(p); setEditing(false); onMessage(`Rutina del ${WEEK_DAYS[view].toLowerCase()} guardada.`) }} /> : <>
      {isToday && rt && prog && <div className="d-card d-now">
        <div className="d-now-top"><b>{prog.done} de {prog.total} series</b><span>+{XP.routine} XP al terminar</span></div>
        <div className="d-bar green thick"><span style={{ width: `${prog.total ? prog.done / prog.total * 100 : 0}%` }} /></div>
        {plan.lock && !prog.done && <p className={`d-hint left ${locked ? 'red' : ''}`}>{locked ? 'Tus redes están bloqueadas hasta que entrenes.' : `Antes de las ${plan.deadline} o se bloquean tus redes.`}</p>}
        {next ? <button type="button" className="d-btn green wide" onClick={() => setRun({ start: null })}>{prog.done ? 'Seguir' : 'Empezar rutina'}</button>
          : <p className="d-done-line"><DuoIcon name="check" size={26} />¡Rutina completa! Toca el piso para cerrarla.</p>}
      </div>}

      {ideas.length > 0 && <div className="d-card d-bumps">
        <div className="d-card-head"><h2>¡Ya puedes subir!</h2><DuoIcon name="estrella" size={34} /></div>
        <p className="d-hint left">Te salieron completas 2 veces seguidas.</p>
        {ideas.map(b => <div className="d-bump" key={b.item.name}>
          <b>{b.text}</b>
          <div className="d-row2">
            <button type="button" className="d-btn white small" onClick={() => savePlan(quietBump(plan, b.item.name, today))}>Todavía no</button>
            <button type="button" className="d-btn gold small" onClick={() => { savePlan(applyBump(plan, b.item.name, b.to)); onMessage(`${b.item.name} sube a ${b.to}.`) }}>Subir</button>
          </div>
        </div>)}
      </div>}

      {rt ? <div className="d-card">
        <div className="d-card-head"><h2>Ejercicios</h2><button type="button" className="d-link" onClick={() => setEditing(true)}>Editar</button></div>
        <ul className="d-ex">{rt.items.map(it => {
          const n = setsNeeded(rt, it), d = isToday ? Math.min(n, doneCount(data, today, it)) : 0
          const full = isToday && d >= n
          return <li key={it.id}>
            <button type="button" className={`d-ex-row ${full ? 'done' : ''}`} disabled={!isToday || full} onClick={() => setRun({ start: it.id })}>
              <span className={`d-ex-icon ${it.kind}`}><DuoIcon name={full ? 'check' : it.kind === 'seconds' ? 'reloj' : it.kind === 'free' ? 'estrella' : 'pesa'} size={30} /></span>
              <span className="d-ex-text"><b>{it.name}</b><small>{label(it)}{it.when === 'before' ? ' · antes' : it.when === 'after' ? ' · al final' : roundsOf(rt, it) !== rt.rounds ? ` · ${roundsOf(rt, it)} veces` : ''}</small></span>
              <span className="d-dots">{Array.from({ length: n }, (_, k) => <i key={k} className={k < d ? 'on' : ''} />)}</span>
            </button>
          </li>
        })}</ul>
      </div> : <div className="d-card"><p className="d-hint left">Día de descanso.</p><button type="button" className="d-btn blue wide" onClick={() => setEditing(true)}>Poner rutina</button></div>}
    </>}
    {run && rt && isToday && <Runner data={data} commit={commit} rt={rt} today={today} start={run.start} rest={plan.restSeconds} onClose={() => setRun(null)} />}
  </section>
}
