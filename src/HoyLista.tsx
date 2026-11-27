import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Sheet } from './Sheet'
import { activeHabits, dateKey, makeId, modulesOf, type AppData } from './lib/model'
import type { PersonalTask } from './lib/personal'
import { firstDay, habitOn, shiftDay, tasksFor } from './lib/jardin'
import { clockOf, lockActive, routineFor, routineProgress } from './lib/rutina'
import { readOn } from './lib/lectura'
import { broteLine, DAILY_GOAL, xpOn, XP } from './lib/xp'
import { haptic } from './lib/haptic'
import { reward } from './juice'
import { celebrate, useNow } from './ui'
import { readingSeconds } from './lib/readingSession'
import { BroteArt } from './Brote'
import { DuoIcon, type DuoIconName } from './DuoIcons'
import { ReadSheet } from './LeerSheet'
import { MorningSheet, morningAnswered, morningDone } from './Manana'
import { setupMorning } from './lib/manana'
import { removeWalkFromRoutine, walkDone, walkLabel, walkProgress, WALK_KM, WALK_MIN } from './lib/cardio'
import { CardioSheet } from './Cardio'
import type { Section } from './TodayPage'

type Commit = (update: (d: AppData) => AppData) => void

export function newTask(text: string, dueDate?: string): PersonalTask {
  return { id: `t-${makeId()}`, text: text.trim().slice(0, 200), status: 'pending', minutes: 25, level: null, updatedAt: Date.now(), notes: '', project: '', subtasks: [], ...(dueDate ? { dueDate } : {}) }
}
export function toggleTask(commit: Commit, id: string, day = dateKey()) {
  haptic()
  commit(d => ({ ...d, tasks: d.tasks.map(t => t.id !== id ? t : t.status === 'done'
    ? { ...t, status: 'pending', completedOn: undefined, updatedAt: Date.now() }
    : { ...t, status: 'done', completedOn: day, updatedAt: Date.now() }) }))
}
export function removeTask(commit: Commit, id: string) {
  commit(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, status: 'archived', updatedAt: Date.now() } : t) }))
}

export { Sheet }

type Kind = 'manana' | 'train' | 'walk' | 'list' | 'read' | 'bible'
type State = 'done' | 'now' | 'todo' | 'locked' | 'missed'
type PathNode = { kind: Kind; label: string; sub?: string; icon: DuoIconName; state: State; partial?: number; xp: number; live?: boolean }

const WAVE = [0, 1.3, 0, -1.3]
const DAY_NAME = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTH = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function dayTitle(day: string): string {
  const d = new Date(`${day}T12:00:00`)
  return `${DAY_NAME[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`
}

type Item = { id: string; label: string; done: boolean; auto: boolean; kind: 'habit' | 'task'; late?: boolean }
function listItems(data: AppData, day: string, today: string): Item[] {
  const habits: Item[] = activeHabits(data.settings).filter(h => h.when !== 'manana').map(h => ({ id: h.id, label: h.label, done: habitOn(data, h, day), auto: habitOn(data, h, day) && !(data.habits[day] ?? []).includes(h.id), kind: 'habit' }))
  const tasks: Item[] = (day === today
    ? data.tasks.filter(t => t.status !== 'archived' && ((t.status !== 'done' && t.dueDate && t.dueDate <= today) || (t.status === 'done' && t.completedOn === today && (!t.dueDate || t.dueDate <= today))))
    : tasksFor(data, day)).map(t => ({ id: t.id, label: t.text, done: t.status === 'done' && t.completedOn === day, auto: false, kind: 'task', late: !!t.dueDate && t.dueDate < today && t.status !== 'done' }))
  return [...habits, ...tasks]
}

function dayNodes(data: AppData, day: string, today: string): PathNode[] {
  const mods = modulesOf(data.settings)
  const future = day > today
  const out: PathNode[] = []
  const morning = morningDone(data, day)
  if (morning.total) {
    const done = morning.done >= morning.total
    out.push({ kind: 'manana', label: 'Buenos días', sub: future ? `${morning.total} preguntas` : `${morning.done} de ${morning.total}`, icon: 'sol', state: future ? 'locked' : done ? 'done' : day < today ? 'missed' : 'todo', partial: morning.done / morning.total, xp: XP.habit * morning.total })
  }
  const rt = mods.training ? routineFor(data, day) : null
  if (rt) {
    const p = routineProgress(data, day, rt)
    const done = p.total > 0 && p.done >= p.total
    const locked = day === today && lockActive(data, today, clockOf(Date.now()))
    out.push({ kind: 'train', label: rt.title, sub: future ? `${rt.items.length} ejercicios` : done ? 'Completa' : `${p.done} de ${p.total} series${locked ? ' · redes bloqueadas' : ''}`, icon: locked && !done ? 'candado' : 'pesa', state: future ? 'locked' : done ? 'done' : day < today ? 'missed' : 'todo', partial: p.total ? p.done / p.total : 0, xp: XP.routine })
  }
  if (data.settings.walkDaily) {
    const done = walkDone(data, day), got = walkLabel(data, day)
    out.push({ kind: 'walk', label: 'Caminar', sub: future ? `${WALK_MIN} min o ${WALK_KM} km` : done ? got : got ? `Llevas ${got}` : `${WALK_MIN} min o ${WALK_KM} km`, icon: 'caminar', state: future ? 'locked' : done ? 'done' : day < today ? 'missed' : 'todo', partial: walkProgress(data, day), xp: 10 })
  }
  const items = listItems(data, day, today)
  if (items.length) {
    const d = items.filter(i => i.done).length
    out.push({ kind: 'list', label: 'Tu lista', sub: future ? `${items.length} cosas` : `${d} de ${items.length}`, icon: 'lista', state: future ? 'locked' : d === items.length ? 'done' : day < today ? 'missed' : 'todo', partial: d / items.length, xp: XP.habit * items.length })
  }
  if (mods.reading) {
    const done = readOn(data, day)
    out.push({ kind: 'read', label: '¿Leíste?', sub: future ? 'Lectura' : done ? 'Sí leíste' : undefined, icon: 'libro', state: future ? 'locked' : done ? 'done' : day < today ? 'missed' : 'todo', xp: XP.read })
  }
  if (mods.bible) {
    const done = data.bible.some(m => m.day === day)
    out.push({ kind: 'bible', label: 'Biblia', sub: future ? 'Un capítulo' : done ? 'Leíste hoy' : 'Un capítulo', icon: 'libro', state: future ? 'locked' : done ? 'done' : day < today ? 'missed' : 'todo', xp: XP.read })
  }
  if (day === today) {
    const i = out.findIndex(n => n.state === 'todo')
    if (i >= 0) out[i] = { ...out[i], state: 'now' }
  }
  return out
}

function Node({ n, x, onTap, mascot }: { n: PathNode; x: number; onTap: (el: HTMLElement) => void; mascot?: ReactNode }) {
  return <div className={`d-step2 ${n.state}`} style={{ '--x': `${x * 62}px` } as CSSProperties}>
    {n.state === 'now' && <span className="d-start">{n.kind === 'train' ? '¡A ENTRENAR!' : n.kind === 'read' || n.kind === 'bible' ? '¡A LEER!' : n.kind === 'manana' ? '¡BUENOS DÍAS!' : n.kind === 'walk' ? '¡A CAMINAR!' : 'EMPEZAR'}</span>}
    <button type="button" className={`d-node2 ${n.state} ${n.live ? 'live' : ''}`} onClick={e => onTap(e.currentTarget)} aria-label={`${n.label}${n.sub ? `, ${n.sub}` : ''}`}>
      {n.partial !== undefined && n.partial > 0 && n.state !== 'done' && n.state !== 'locked' && <svg className="d-node-ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - n.partial * 100} /></svg>}
      <DuoIcon name={n.state === 'done' ? 'check' : n.state === 'locked' ? 'candado' : n.icon} size={44} />
    </button>
    <span className="d-step2-label"><b>{n.label}</b>{n.sub && <small>{n.sub}</small>}</span>
    {mascot}
  </div>
}

export function HoyLista({ data, commit, go, onMessage }: { data: AppData; commit: Commit; go: (s: Section) => void; onMessage: (t: string) => void }) {
  const today = dateKey()
  const [sheet, setSheet] = useState<'list' | 'read' | 'bible' | 'manana' | 'walk' | null>(null)
  const [text, setText] = useState('')
  const [daily, setDaily] = useState(false)
  const [edit, setEdit] = useState(false)
  const scrolled = useRef(false)
  const live = !!data.activeReading
  const now = useNow(live, 1000)
  const xpToday = xpOn(data, today)
  const line = broteLine(data)
  const started = firstDay(data, today)
  const past = [shiftDay(today, -2), shiftDay(today, -1)].filter(d => d >= started && d < today)
  const future = [1, 2, 3].map(n => shiftDay(today, n))
  const todayNodes = dayNodes(data, today, today).map(n => n.kind === 'read' && data.activeReading ? { ...n, live: true, sub: `Leyendo ${Math.floor(readingSeconds(data.activeReading, now) / 60)} min` } : n)
  const allDone = todayNodes.length > 0 && todayNodes.every(n => n.state === 'done')
  const items = listItems(data, today, today)

  useEffect(() => {
    if (!data.settings.morningSetup) commit(d => d.settings.morningSetup ? d : setupMorning(d))
    if (!data.settings.cardioSetup) commit(d => d.settings.cardioSetup ? d : removeWalkFromRoutine(d))
  }, [data.settings.morningSetup, data.settings.cardioSetup]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const flag = `bambu.manana.abierta.${today}`
    try {
      if (new Date().getHours() >= 13 || localStorage.getItem(flag)) return
      const m = morningDone(data, today)
      if (!m.total || m.done >= m.total || morningAnswered(today).length) return
      localStorage.setItem(flag, '1')
      setSheet('manana')
    } catch { return }
  }, [data.settings.morningSetup]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrolled.current) return
    scrolled.current = true
    window.setTimeout(() => document.querySelector('.d-unit2.today')?.scrollIntoView({ block: 'start', behavior: 'auto' }), 60)
  }, [])

  function tap(n: PathNode, day: string) {
    haptic(10)
    if (n.state === 'locked') { onMessage(`Se abre el ${dayTitle(day).toLowerCase()}.`); return }
    if (day !== today) { onMessage(n.state === 'done' ? 'Ese día lo cumpliste.' : 'Ese día ya pasó. Hoy cuenta más.'); return }
    if (n.kind === 'train') go('Entrenar')
    else setSheet(n.kind)
  }
  function toggleHabit(id: string, el: HTMLElement) {
    const on = (data.habits[today] ?? []).includes(id)
    if (!on) reward(el, `+${XP.habit} XP`)
    haptic(on ? 8 : [12, 30, 12])
    commit(d => { const cur = d.habits[today] ?? []; return { ...d, habits: { ...d.habits, [today]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] } } })
  }
  function toggleItem(it: Item, el: HTMLElement) {
    if (it.auto) return
    if (it.kind === 'habit') { toggleHabit(it.id, el); return }
    if (!it.done) reward(el, `+${XP.task} XP`)
    toggleTask(commit, it.id, today)
  }
  function removeItem(it: Item) {
    if (it.kind === 'habit') commit(d => ({ ...d, settings: { ...d.settings, habits: d.settings.habits.map(x => x.id === it.id ? { ...x, archived: true } : x) } }))
    else removeTask(commit, it.id)
  }
  function add() {
    const label = text.trim()
    if (!label) return
    haptic(12)
    if (daily) commit(d => ({ ...d, settings: { ...d.settings, habits: [...d.settings.habits, { id: `h-${makeId().slice(0, 8)}`, label: label.slice(0, 60), mark: label.charAt(0).toUpperCase() }] } }))
    else commit(d => ({ ...d, tasks: [newTask(label, today), ...d.tasks] }))
    setText('')
  }

  const unit = (day: string, kind: 'past' | 'today' | 'future', nodes: PathNode[], offset: number) => {
    const done = nodes.filter(n => n.state === 'done').length
    const rt = routineFor(data, day)
    return <section className={`d-unit2 ${kind}`} key={day}>
      <header className="d-unit2-head">
        <div><b>{kind === 'today' ? 'Hoy' : kind === 'future' && day === shiftDay(today, 1) ? 'Mañana' : dayTitle(day)}</b>
          <span>{kind === 'today' ? `${dayTitle(day)} · ${done} de ${nodes.length}` : kind === 'future' ? (rt ? rt.title : 'Día de descanso') : `${done} de ${nodes.length} hechos`}</span></div>
        {kind === 'today' ? <span className="d-unit2-xp"><DuoIcon name="rayo" size={20} /><b>{Math.min(xpToday, DAILY_GOAL)}/{DAILY_GOAL} XP</b></span>
          : <DuoIcon name={kind === 'future' ? 'candado' : kind === 'past' && done === nodes.length && nodes.length ? 'check' : 'casa'} size={36} />}
        {kind === 'today' && <div className="d-unit2-bar" role="progressbar" aria-label="Meta diaria de XP" aria-valuenow={Math.min(xpToday, DAILY_GOAL)} aria-valuemax={DAILY_GOAL}><span style={{ width: `${Math.min(100, xpToday / DAILY_GOAL * 100)}%` }} /></div>}
      </header>
      {nodes.map((n, i) => <Node key={n.kind} n={n} x={WAVE[(offset + i) % WAVE.length]} onTap={() => tap(n, day)}
        mascot={kind === 'today' && n.state === 'now' ? <div className={`d-mascot ${WAVE[(offset + i) % WAVE.length] > 0 ? 'left' : 'right'}`}><div className="d-mascot-say">{line.text}</div><BroteArt mood={line.mood} size={96} /></div> : undefined} />)}
      {kind === 'today' && <div className="d-step2 chest">
        <button type="button" className={`d-chest ${allDone ? 'open' : ''}`} onClick={() => allDone ? celebrate({ kind: 'day', title: '¡Día completo!', text: `Ganaste ${xpToday} XP hoy. Tu bambú está en flor.` }) : onMessage(`Te faltan ${todayNodes.filter(n => n.state !== 'done').length} para abrir el cofre.`)} aria-label="Cofre del día">
          <DuoIcon name="cofre" size={64} off={!allDone} />
        </button>
        <span className="d-step2-label"><b>{allDone ? '¡Cofre abierto!' : 'Cofre del día'}</b><small>+{XP.goodDay} XP al 80%</small></span>
      </div>}
      {kind === 'today' && !nodes.length && <p className="d-empty">Agrega algo a tu lista para empezar tu camino.</p>}
    </section>
  }

  let offset = 0
  const blocks: ReactNode[] = []
  for (const d of past) { const nodes = dayNodes(data, d, today); blocks.push(unit(d, 'past', nodes, offset)); offset += nodes.length }
  blocks.push(unit(today, 'today', todayNodes, offset)); offset += todayNodes.length + 1
  for (const d of future) { const nodes = dayNodes(data, d, today); blocks.push(unit(d, 'future', nodes, offset)); offset += nodes.length }
  const doneItems = items.filter(i => i.done).length

  return <section className="d-page d-home">
    <div className="d-road">{blocks}<p className="d-road-end">El camino sigue mañana</p></div>

    {sheet === 'list' && <Sheet title="Tu lista de hoy" tall onClose={() => { setSheet(null); setEdit(false) }}>
      <div className="d-goal-top"><b>{doneItems} de {items.length} hechas</b><button type="button" className="d-link" onClick={() => setEdit(!edit)}>{edit ? 'Listo' : 'Editar'}</button></div>
      <div className="d-bar green"><span style={{ width: `${items.length ? doneItems / items.length * 100 : 0}%` }} /></div>
      <ul className="d-tasks">
        {items.map(it => <li key={it.id} className={`${it.done ? 'done' : ''} ${it.late ? 'late' : ''}`}>
          <button type="button" className="d-task" disabled={it.auto} onClick={e => toggleItem(it, e.currentTarget)}>
            <span className={`d-box ${it.done ? 'on' : ''}`}>{it.done && <DuoIcon name="check" size={22} />}</span>
            <span className="d-task-text"><b>{it.label}</b><small>{it.kind === 'habit' ? 'Diario' : 'Solo hoy'}{it.auto ? ' · se marcó solo' : ''}</small></span>
          </button>
          {edit && <button type="button" className="d-x small" aria-label={`Quitar ${it.label}`} onClick={() => removeItem(it)}>×</button>}
        </li>)}
        {!items.length && <li className="d-empty">Tu lista está vacía. Agrega algo abajo.</li>}
      </ul>
      <form className="d-form" onSubmit={e => { e.preventDefault(); add() }}>
        <input className="d-input" value={text} onChange={e => setText(e.target.value)} maxLength={60} placeholder="Agregar algo por hacer" />
        <div className="d-seg">
          <button type="button" className={!daily ? 'on' : ''} onClick={() => setDaily(false)}>Solo hoy</button>
          <button type="button" className={daily ? 'on' : ''} onClick={() => setDaily(true)}>Todos los días</button>
        </div>
        <button type="submit" className="d-btn green wide" disabled={!text.trim()}>Agregar</button>
      </form>
    </Sheet>}
    {sheet === 'walk' && <CardioSheet data={data} commit={commit} onClose={() => setSheet(null)} onMessage={onMessage} />}
    {sheet === 'manana' && <MorningSheet data={data} commit={commit} onClose={() => setSheet(null)} />}
    {(sheet === 'read' || sheet === 'bible') && <ReadSheet data={data} commit={commit} biblia={sheet === 'bible'} onClose={() => setSheet(null)} onMessage={onMessage} />}
  </section>
}
