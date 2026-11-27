import { useMemo, useState } from 'react'
import { StretchCard } from './Stretch'
import { dateKey, makeId, type Activity, type AppData, type BodyLog, type Checkin } from './lib/model'
import { EXERCISES, HOME_GEAR, MUSCLES, SLOT_LABEL, TEMPLATES, exercise, ladder, muscleLabel, type Exercise, type Slot } from './lib/exercises'
import { available, currentForSlot, massPlan, muscleStates, personalBest, progression, readyLabel, sessionsOf, setValue, shift, todayPlan, weekPlan, weekSessions, weightTrend, type DayKind, type PlanItem } from './lib/coach'
import { applySwaps, fitToTime } from './lib/session'
import { BACK_METHOD, EVIDENCE } from './lib/science'
import { SessionRunner } from './SessionRunner'
import { ExerciseFigure, FootballAsk, PlanRow, RestTimer, loadSwaps, storeSwaps, type Commit, type Swaps } from './TrainingParts'
import { WeightChart } from './WeightChart'
import { TalloCard } from './TalloCard'
import { PhotoLab } from './PhotoLab'
import { ADAPTATIONS, PRINCIPLES, SOURCES } from './lib/juanma'
import { Card, Chips, Empty, Heading, Sparkline, Stepper, Tabs, mmss, useNow, useWakeLock } from './ui'
import { plural } from './lib/text'

type Props = { data: AppData; commit: Commit; onMessage: (text: string, undo?: () => void) => void }
type Tab = 'hoy' | 'recuperacion' | 'progreso' | 'coach' | 'ejercicios'

export function TrainingPage({ data, commit, onMessage }: Props) {
  const [tab, setTab] = useState<Tab>('hoy')
  return <>
    <Heading eyebrow="ENTRENAMIENTO" title="Construye tu físico." text="Registra cada serie. El coach decide qué toca con tus datos y el método de Juanma." />
    <Tabs label="Secciones de entrenamiento" value={tab} onChange={setTab} options={[['hoy', 'Hoy'], ['recuperacion', 'Recuperación'], ['progreso', 'Progreso'], ['coach', 'Coach'], ['ejercicios', 'Ejercicios']]} />
    {tab === 'hoy' && <><StretchCard data={data} mode="entrenar" /><TodayTab data={data} commit={commit} onMessage={onMessage} /></>}
    {tab === 'recuperacion' && <RecoveryTab data={data} />}
    {tab === 'progreso' && <ProgressTab data={data} commit={commit} onMessage={onMessage} />}
    {tab === 'coach' && <CoachTab data={data} />}
    {tab === 'ejercicios' && <LibraryTab data={data} commit={commit} />}
  </>
}

// ── Hoy ─────────────────────────────────────────────────────────────────
const BUDGET_KEY = 'bambu.sessionMinutes'
function savedBudget(): number | null {
  try { const v = Number(localStorage.getItem(BUDGET_KEY)); return v > 0 ? v : null } catch { return null }
}

function TodayTab({ data, commit, onMessage }: Props) {
  const today = dateKey()
  const now = useNow(true)
  const plan = useMemo(() => todayPlan(data, now), [data, Math.floor(now / 60000)]) // eslint-disable-line react-hooks/exhaustive-deps
  const states = useMemo(() => muscleStates(data, now), [data, Math.floor(now / 600000)]) // eslint-disable-line react-hooks/exhaustive-deps
  const capacity = data.checkins.find(c => c.day === today)?.capacity
  // Con poca capacidad, el coach sugiere la versión corta: el volumen de la semana se cuida igual.
  const [budget, setBudget] = useState<number | null>(() => savedBudget() ?? (capacity !== undefined && capacity <= 40 ? 15 : null))
  const [swaps, setSwaps] = useState<Swaps>(() => loadSwaps(today))
  const items = useMemo(() => applySwaps(plan.items, swaps, data, today), [plan.items, swaps, data, today])
  const swap = (slot: string, id: string | null) => { const next = { ...swaps, [slot]: id ?? undefined }; setSwaps(next); storeSwaps(today, next) }
  const fitted = useMemo(() => fitToTime(items, budget, data.settings, states), [items, budget, data.settings, states])
  const endsAt = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' }).format(new Date(now + fitted.minutes * 60000))
  const [open, setOpen] = useState<string | null>(null)
  const [extra, setExtra] = useState<string>('')
  const [list, setList] = useState(false)
  const todaySets = data.sets.filter(s => s.day === today).sort((a, b) => a.at - b.at)
  const workout = data.activeWorkout && !data.activeWorkout.endedAt ? data.activeWorkout : null
  useWakeLock(!!workout)
  const extraIds = [...new Set(todaySets.map(s => s.exercise))].filter(id => !plan.items.some(i => i.exercise.id === id))
  function pick(minutes: number | null) {
    setBudget(minutes)
    try { if (minutes) localStorage.setItem(BUDGET_KEY, String(minutes)); else localStorage.removeItem(BUDGET_KEY) } catch { /* Preferencia de este teléfono: si falla, se usa la sesión completa. */ }
  }
  function startWorkout() { setList(false); commit(d => ({ ...d, activeWorkout: { startedAt: Date.now(), template: plan.kind } })) }
  function endWorkout() {
    const sets = data.sets.filter(s => s.day === today).length
    commit(d => ({ ...d, activeWorkout: null }))
    onMessage(sets ? `Sesión cerrada: ${plural(sets, 'serie', 'series')}. Ahora come proteína y duerme tus horas.` : 'Sesión cerrada sin series.')
  }
  const guided = !!workout && !list && fitted.items.length > 0
  return <>
    <FootballAsk data={data} commit={commit} onMessage={onMessage} />
    {guided ? <SessionRunner data={data} commit={commit} onMessage={onMessage} grouped={fitted.grouped} express={fitted.express} now={now} onList={() => setList(true)} onEnd={endWorkout} onSwap={swap} />
      : <Card tone={plan.urgent ? 'warn' : 'accent'} className="coach-card">
        <span className="eyebrow">TU PLAN DE HOY</span>
        <h2>{plan.title}</h2>
        {plan.reasons.length > 0 && <ul className="reasons">{plan.reasons.map(r => <li key={r.text}>{r.text}</li>)}</ul>}
        {plan.items.length > 0 && <div className="time-pick">
          <span className="field-label">¿Cuánto tiempo tienes?</span>
          <Chips label="Tiempo para entrenar" value={budget ?? 0} onChange={v => pick(v || null)} options={[[15, '15 min'], [30, '30 min'], [0, 'Sin prisa']]} />
          <p className="hint">{fitted.express ? `Exprés de unos ${fitted.minutes} min: superseries, un ejercicio alterna con otro y el descanso se comparte.` : `Unos ${fitted.minutes} min: terminas como a las ${endsAt.replace(/\.$/, '')}.`}{fitted.dropped.length ? ` Hoy se queda fuera ${fitted.dropped.map(i => i.exercise.name.toLowerCase()).join(', ')}: es lo que ya llevas más cubierto en la semana.` : ''}</p>
        </div>}
        <div className="row-actions">
          {workout ? <><button className="primary-button" onClick={() => setList(false)} disabled={!fitted.items.length}>Seguir sesión <span>{mmss((now - workout.startedAt) / 1000)}</span></button><button className="quiet-button" onClick={endWorkout}>Terminar</button></>
            : <button className="primary-button" onClick={startWorkout} disabled={plan.urgent}>{plan.items.length ? 'Empezar sesión guiada' : 'Empezar sesión'} <span>↗</span></button>}
        </div>
        {plan.items.length > 0 && !workout && <p className="hint">Calienta con una serie ligera del primer ejercicio, a la mitad de repeticiones. Sin estiramientos largos.</p>}
      </Card>}
    {!guided && <TalloCard data={data} now={now} compact />}
    {!guided && <WeekStrip data={data} now={now} />}
    {!guided && <RestTimer data={data} commit={commit} now={now} />}
    {!guided && fitted.items.length > 0 && <Card>
      <div className="section-heading"><div><span className="eyebrow">TU SESIÓN</span><h2>{plan.kind === 'torso' ? 'Torso' : plan.kind === 'pierna' ? 'Pierna y core' : 'Blindaje de futbolista'}</h2></div><span className="subtle-count">{fitted.items.reduce((s, i) => s + Math.min(i.doneToday, i.sets), 0)} de {fitted.items.reduce((s, i) => s + i.sets, 0)} series</span></div>
      <div className="plan-list">{fitted.items.map(item => {
        const mate = fitted.express ? fitted.grouped.find(g => g.includes(item))?.find(i => i !== item) : undefined
        return <PlanRow key={item.slot} item={item} mate={mate?.exercise.name} express={fitted.express} data={data} open={open === item.exercise.id} onToggle={() => setOpen(open === item.exercise.id ? null : item.exercise.id)} commit={commit} onMessage={onMessage} onSwap={id => { swap(item.slot, id); setOpen(id) }} />
      })}</div>
    </Card>}
    {!guided && <Card>
      <span className="eyebrow">OTRO EJERCICIO</span>
      <h2>Registrar algo fuera del plan</h2>
      <label className="field-label">Ejercicio<select className="text-input" value={extra} onChange={e => { setExtra(e.target.value); setOpen(e.target.value) }}>
        <option value="">Elige uno</option>
        {(Object.keys(SLOT_LABEL) as Slot[]).map(slot => <optgroup key={slot} label={SLOT_LABEL[slot]}>{ladder(slot).filter(e => available(e, data.settings.equipment)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>)}
      </select></label>
      {[...extraIds, ...(extra && !extraIds.includes(extra) && !plan.items.some(i => i.exercise.id === extra) ? [extra] : [])].map(id => {
        const ex = exercise(id)
        if (!ex) return null
        const item: PlanItem = { slot: ex.slot, exercise: ex, sets: 2, progression: progression(data, ex), doneToday: todaySets.filter(s => s.exercise === id).length }
        return <PlanRow key={id} item={item} data={data} open={open === id} onToggle={() => setOpen(open === id ? null : id)} commit={commit} onMessage={onMessage} />
      })}
    </Card>}
    {!guided && <QuickActivities data={data} commit={commit} onMessage={onMessage} />}
    {!guided && <CheckinCard data={data} commit={commit} onMessage={onMessage} />}
  </>
}


function QuickActivities({ data, commit, onMessage }: Props) {
  const today = dateKey()
  const [minutes, setMinutes] = useState(60)
  const todays = data.activities.filter(a => a.day === today)
  function add(kind: Activity['kind'], extra: Partial<Activity> = {}) {
    const row: Activity = { id: makeId(), day: today, kind, ...extra }
    commit(d => ({ ...d, activities: [...d.activities, row] }))
    onMessage(kind === 'football' ? 'Fútbol registrado. Tus piernas cuentan como trabajadas.' : 'Registrado.', () => commit(d => ({ ...d, activities: d.activities.filter(a => a.id !== row.id) })))
  }
  return <Card>
    <span className="eyebrow">FÚTBOL Y DESCANSO</span>
    <h2>¿Qué más hiciste hoy?</h2>
    <div className="quick-grid">
      <div className="quick-football"><Stepper label="minutos de fútbol" unit="min" value={minutes} onChange={setMinutes} min={10} max={240} step={10} /><button className="secondary-button" onClick={() => add('football', { minutes })}>Jugué fútbol</button></div>
      <button className="secondary-button" onClick={() => add('walk', { minutes: 30 })}>Caminé 30 min</button>
      <button className="secondary-button" onClick={() => add('rest')}>Día de descanso</button>
    </div>
    {todays.length > 0 && <ul className="set-list">{todays.map(a => <li key={a.id}><span>{({ football: 'Fútbol', rest: 'Descanso', walk: 'Caminata', other: 'Otra' } as const)[a.kind]}</span><strong>{a.minutes ? `${a.minutes} min` : ''}</strong><button className="quiet-button" onClick={() => commit(d => ({ ...d, activities: d.activities.filter(x => x.id !== a.id) }))}>Borrar</button></li>)}</ul>}
  </Card>
}

/** Solo lo que anotaste: un dato vacío no se enseña como "?". */
function checkinLine(c: Checkin): string {
  const parts = [c.sleepHours !== undefined && `${c.sleepHours} h de sueño`, c.energy !== undefined && `energía ${c.energy} de 5`,
    c.proteinMeals !== undefined && `${c.proteinMeals} ${c.proteinMeals === 1 ? 'comida' : 'comidas'} con proteína`,
    c.soreness?.length && `agujetas: ${c.soreness.map(muscleLabel).join(', ')}`, c.pain && `dolor: ${c.pain}`].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Sin datos todavía. Toca Editar.'
}

export function CheckinCard({ data, commit, onMessage, compact = false }: Props & { compact?: boolean }) {
  const today = dateKey()
  const current = data.checkins.find(c => c.day === today)
  const [draft, setDraft] = useState<Checkin>(current ?? { id: today, day: today, sleepHours: 9, energy: 3, proteinMeals: 3, soreness: [] })
  const [editing, setEditing] = useState(!current)
  function save() {
    const row = { ...draft, id: today, day: today }
    commit(d => ({ ...d, checkins: [...d.checkins.filter(c => c.day !== today), row] }))
    setEditing(false)
    onMessage(row.pain === 'pecho' ? 'Guardado. Hoy no entrenes y avísale a un adulto.' : 'Check-in guardado. El coach ya lo tomó en cuenta.')
  }
  const toggleSore = (m: string) => setDraft(d => ({ ...d, soreness: d.soreness?.includes(m) ? d.soreness.filter(x => x !== m) : [...(d.soreness ?? []), m] }))
  if (!editing && current) return <Card tone="quiet" className="checkin-done"><span className="eyebrow">CHECK-IN DE HOY</span><p>{checkinLine(current)}</p><button className="quiet-button" onClick={() => setEditing(true)}>Editar</button></Card>
  return <Card className="checkin">
    <span className="eyebrow">CHECK-IN DE HOY</span>
    <h2>¿Cómo amaneciste?</h2>
    <label className="field-label">Horas de sueño</label>
    <Stepper label="horas de sueño" unit="h" value={draft.sleepHours ?? 9} onChange={v => setDraft(d => ({ ...d, sleepHours: v }))} min={0} max={14} step={0.5} />
    <label className="field-label">Energía</label>
    <Chips label="Energía" value={draft.energy} onChange={v => setDraft(d => ({ ...d, energy: v }))} options={[[1, '1 muerto'], [2, '2'], [3, '3 normal'], [4, '4'], [5, '5 a tope']]} />
    {!compact && <>
      <label className="field-label">Comidas con proteína (ayer o hoy)</label>
      <Chips label="Comidas con proteína" value={draft.proteinMeals} onChange={v => setDraft(d => ({ ...d, proteinMeals: v }))} options={[[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5+']]} />
      <label className="field-label">Agujetas (músculo adolorido, se va solo)</label>
      <Chips multiple label="Agujetas" value={draft.soreness} onChange={toggleSore} options={MUSCLES.map(m => [m.id, m.label] as [string, string])} />
      <label className="field-label">¿Algún dolor que no sea agujeta?</label>
      <Chips label="Dolor" value={draft.pain ?? ''} onChange={v => setDraft(d => ({ ...d, pain: v || undefined }))} options={[['', 'No'], ['hombro', 'Hombro'], ['muñeca', 'Muñeca'], ['codo', 'Codo'], ['rodilla', 'Rodilla'], ['espalda', 'Espalda baja'], ['cuello', 'Cuello'], ['pecho', 'Pecho']]} />
      {draft.pain === 'pecho' && <p className="caution">Dolor de pecho: hoy no entrenes y díselo a tu mamá, papá o un adulto. Si te falta el aire, te mareas o el dolor es fuerte, pide ayuda ya.</p>}
      {draft.pain && draft.pain !== 'pecho' && <p className="caution">Salta los ejercicios que te duelan en {draft.pain}. Si dura más de unos días o duele al moverte normal, que te revise alguien.</p>}
    </>}
    <button className="primary-button wide" onClick={save}>Guardar check-in</button>
  </Card>
}

// ── Recuperación ────────────────────────────────────────────────────────
function RecoveryTab({ data }: { data: AppData }) {
  const now = useNow(true, 60000)
  const states = useMemo(() => muscleStates(data, now), [data, now])
  const week = weekSessions(data)
  const legTarget = data.settings.footballDays.length >= 3 ? 1 : 2
  return <>
    <Card>
      <span className="eyebrow">ESTA SEMANA</span>
      <div className="stat-row"><div><strong>{week.torso}<small>/3</small></strong><span>torso</span></div><div><strong>{week.pierna}<small>/{legTarget}</small></strong><span>pierna</span></div><div><strong>{week.football}</strong><span>fútbol</span></div></div>
      <p className="hint">Juanma: torso 3 y pierna 2 por semana. Con tres días de fútbol, pierna baja a 1.</p>
    </Card>
    {(['torso', 'pierna', 'extra'] as const).map(group => <Card key={group}>
      <h2>{group === 'torso' ? 'Torso' : group === 'pierna' ? 'Piernas' : 'Cuello, antebrazo y core'}</h2>
      <div className="muscle-grid">{states.filter(s => s.group === group).map(s => {
        const pct = Math.min(100, s.weekSets / s.target[1] * 100)
        return <div key={s.id} className={`muscle muscle-${s.status}`}>
          <div className="muscle-top"><strong>{s.label}</strong><span className="muscle-status">{s.status === 'recuperando' ? `Recuperando` : s.status === 'pendiente' ? 'Toca entrenar' : 'Listo'}</span></div>
          <small>{s.readyAt ? `Listo ${readyLabel(s.readyAt, now)}. ${s.reason}` : s.reason}</small>
          <div className="bar" aria-label={`${plural(s.weekSets, 'serie', 'series')} duras en 7 días; rango ${s.target[0]} a ${s.target[1]}`}><span style={{ width: `${pct}%` }} /><i style={{ left: `${s.target[0] / s.target[1] * 100}%` }} /></div>
          <small>{s.weekSets} series duras en 7 días · meta {s.target[0]} a {s.target[1]}</small>
        </div>
      })}</div>
    </Card>)}
  </>
}

const KIND_LABEL: Record<DayKind, string> = { torso: 'Torso', pierna: 'Pierna', futbol: 'Fútbol', descanso: 'Descanso', dolor: 'Pausa' }
const WEEKDAY = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const SHORT: Record<DayKind, string> = { ...KIND_LABEL, descanso: 'Reposo' }
/** Lunes a domingo: lo que pasó (sólido), hoy (marcado) y lo que el coach proyecta (tenue). */
function WeekStrip({ data, now }: { data: AppData; now: number }) {
  const days = useMemo(() => weekPlan(data, now), [data, Math.floor(now / 600000)]) // eslint-disable-line react-hooks/exhaustive-deps
  const trained = days.filter(d => d.done.includes('torso') || d.done.includes('pierna')).length
  return <Card className="week-card">
    <div className="section-heading"><div><span className="eyebrow">TU SEMANA</span><h2>Plan y lo que pasó</h2></div><span className="subtle-count">{trained} {trained === 1 ? 'sesión' : 'sesiones'}</span></div>
    <ol className="week-strip">{days.map((d, i) => {
      const shown = d.past || (d.isToday && d.done.length) ? d.done : d.plan ? [d.plan] : []
      const state = d.past ? (d.done.length ? 'done' : 'empty') : d.isToday ? 'today' : 'plan'
      return <li key={d.day} className={`week-day wd-${state}`} aria-label={`${d.day}: ${d.past ? (d.done.length ? `hiciste ${d.done.map(k => KIND_LABEL[k]).join(' y ')}` : 'sin registro') : `${d.isToday ? 'hoy, ' : ''}toca ${d.plan ? KIND_LABEL[d.plan] : 'nada'}`}`}>
        <small>{WEEKDAY[i]} {Number(d.day.slice(8))}</small>
        {shown.length ? shown.map(k => <span key={k} className={`wk wk-${k}`}>{SHORT[k]}</span>) : <span className="wk wk-none">·</span>}
        {d.past && d.done.length > 0 && <i aria-hidden="true">✓</i>}
        {d.isToday && d.done.length > 0 && <i aria-hidden="true">✓</i>}
      </li>
    })}</ol>
    <p className="hint">Lo tenue es la proyección del coach; cambia en cuanto registras algo.</p>
  </Card>
}

// ── Progreso ────────────────────────────────────────────────────────────
function ProgressTab({ data, commit, onMessage }: Props) {
  const mass = massPlan(data)
  const used = [...new Set(data.sets.map(s => s.exercise))].map(id => exercise(id)).filter((e): e is Exercise => !!e)
  return <>
    <PesoCard data={data} commit={commit} onMessage={onMessage} />
    <PhotoLab data={data} commit={commit} onMessage={onMessage} />
    <Card>
      <span className="eyebrow">TU ESCALERA</span>
      <h2>En qué escalón vas</h2>
      <div className="ladder-grid">{TEMPLATES.flatMap(t => t.slots).map(slot => {
        const current = currentForSlot(data, slot)
        const steps = ladder(slot)
        return <div key={slot}><small>{SLOT_LABEL[slot]}</small><strong>{current.name}</strong><span>Escalón {steps.findIndex(e => e.id === current.id) + 1} de {steps.length}</span></div>
      })}</div>
    </Card>
    <Card>
      <span className="eyebrow">POR EJERCICIO</span>
      <h2>Tus números</h2>
      {used.length ? <div className="exercise-progress-list">{used.map(ex => {
        const sessions = sessionsOf(data, ex.id).slice(0, 12).reverse()
        const best = personalBest(data, ex.id)
        const unit = ex.mode === 'seconds' ? 's' : ''
        return <article key={ex.id}><div><strong>{ex.name}</strong><small>{sessions.length} sesiones · récord {best ? `${setValue(best)}${unit}${best.loadKg ? ` con ${best.loadKg} kg` : ''}` : '–'}</small></div>
          <Sparkline values={sessions.map(s => s.sets.reduce((a, b) => a + setValue(b), 0))} label={`Total por sesión de ${ex.name}`} />
          <small>Última: {sessions[sessions.length - 1]?.sets.map(s => setValue(s) + unit).join(' · ')}</small></article>
      })}</div> : <Empty>Tus números aparecen con tu primera serie.</Empty>}
    </Card>
    <Card><span className="eyebrow">GANAR MASA</span><h2>{mass.status === 'bien' ? 'Vas bien.' : mass.status === 'lento' ? 'Come un poco más.' : mass.status === 'rapido' ? 'Vas rápido.' : 'Junta datos.'}</h2><p>{mass.message}</p></Card>
  </>
}

export function PesoCard({ data, commit, onMessage }: Props) {
  const today = dateKey()
  const current = data.body.find(b => b.day === today)
  const last = [...data.body].filter(b => b.weightKg).sort((a, b) => b.day.localeCompare(a.day))[0]
  const [weight, setWeight] = useState(current?.weightKg ?? last?.weightKg ?? 45)
  const [height, setHeight] = useState(current?.heightCm ?? [...data.body].filter(b => b.heightCm).sort((a, b) => b.day.localeCompare(a.day))[0]?.heightCm ?? 160)
  const mass = massPlan(data)
  function save(patch: Partial<BodyLog>) {
    const row: BodyLog = { ...(current ?? { id: today, day: today }), ...patch, id: today, day: today }
    commit(d => ({ ...d, body: [...d.body.filter(b => b.day !== today), row] }))
    onMessage('Guardado.')
  }
  return <Card className="body-card">
    <span className="eyebrow">PESO Y MEDIDAS</span>
    <h2>Pésate en ayunas</h2>
    <p className="hint">Juanma: 3 a 5 mañanas por semana, después del baño. Mira el promedio, nunca el día.</p>
    <Stepper label="peso" unit="kg" value={weight} onChange={setWeight} min={20} max={200} step={0.1} />
    <button className="secondary-button" onClick={() => save({ weightKg: weight })}>{current?.weightKg ? 'Actualizar peso de hoy' : 'Guardar peso de hoy'}</button>
    <div className={mass.photosDue && !current?.photos ? 'photo-due' : 'photo-ok'}>
      <strong>{current?.photos ? 'Fotos de hoy listas.' : mass.photosDue ? 'Toca foto de progreso.' : 'Fotos al día.'}</strong>
      <p className="hint">Una vez al mes: frente, lado y espalda, en ayunas, misma luz. Se quedan en tu teléfono; aquí solo marcas la fecha. {mass.lastPhotos ? `Últimas: ${mass.lastPhotos}${mass.photosDue ? '' : `, siguientes a partir del ${shift(mass.lastPhotos, 30)}`}.` : 'Aún no hay fotos marcadas.'}</p>
      <label className="checkbox-label"><input type="checkbox" checked={!!current?.photos} onChange={e => save({ photos: e.target.checked || undefined })} />Hoy me tomé las fotos</label>
    </div>
    <details><summary>Estatura</summary>
      <Stepper label="estatura" unit="cm" value={height} onChange={setHeight} min={100} max={220} step={0.5} />
      <button className="secondary-button" onClick={() => save({ heightCm: height })}>Guardar estatura</button>
    </details>
    <div className="stat-row">
      <div><strong>{mass.weekAvg ? mass.weekAvg.toFixed(1) : '–'}</strong><span>promedio 7 días</span></div>
      <div><strong>{mass.monthPct !== null ? `${mass.monthPct > 0 ? '+' : ''}${mass.monthPct}%` : '–'}</strong><span>en un mes</span></div>
      <div><strong>{mass.proteinGrams ?? '–'}<small>g</small></strong><span>proteína al día</span></div>
    </div>
    <WeightChart weeks={weightTrend(data, today)} />
  </Card>
}

// ── Coach ───────────────────────────────────────────────────────────────
function CoachTab({ data }: { data: AppData }) {
  const mass = massPlan(data)
  const [area, setArea] = useState<'entreno' | 'masa' | 'comida' | 'sueño' | 'mente'>('entreno')
  return <>
    <Card tone="accent">
      <span className="eyebrow">TU PLAN PARA GANAR MASA</span>
      <h2>Lo que Juanma haría contigo</h2>
      <ol className="steps">
        <li><strong>Entrena torso 3 y pierna {data.settings.footballDays.length >= 3 ? 1 : 2} por semana,</strong> 2 series duras por ejercicio, y registra todo.</li>
        <li><strong>Proteína en 4 comidas al día.</strong> {mass.proteinGrams ? `Con tu peso son unos ${mass.proteinGrams} g: ${mass.proteinPerMeal} g por comida (una palma de carne o pollo, o 3 huevos, o un plato de frijoles con queso).` : 'Registra tu peso en Progreso y te digo los gramos.'}</li>
        <li><strong>Sube despacio.</strong> Pésate en ayunas y mira el promedio de la semana. Si en 2 o 3 semanas no se mueve, agrega un snack de comida real.</li>
        <li><strong>Duerme {data.settings.sleepTarget} horas.</strong> {mass.sleepAvg ? `Vas en ${mass.sleepAvg.toFixed(1)} h.` : ''} Entreno duro termina 3 horas antes de dormir.</li>
        <li><strong>Camina.</strong> Meta de {data.settings.stepsTarget.toLocaleString('es-MX')} pasos; no le quita recuperación al entreno.</li>
        <li><strong>Foto de progreso cada mes</strong> y comparas meses, no días.</li>
      </ol>
    </Card>
    <Card>
      <span className="eyebrow">ADAPTADO A TI</span>
      <h2>Lo que cambiamos del método de Juanma</h2>
      <p className="hint">Tienes {data.settings.age}{data.settings.footballDays.length ? `, juegas fútbol ${data.settings.footballDays.length === 1 ? 'una vez' : `${data.settings.footballDays.length} veces`} por semana` : ''} y entrenas en casa. Él tiene 16 y va al gimnasio.</p>
      <div className="adapt-grid">{ADAPTATIONS.filter(a => a.football !== true || data.settings.footballDays.length > 0).map(a => <div key={a.title}><strong>{a.title}</strong><p>{a.body}</p></div>)}</div>
    </Card>
    <Card>
      <span className="eyebrow">POR QUÉ EL PLAN ES ASÍ</span>
      <h2>Lo que enseña el método</h2>
      <Chips label="Tema" value={area} onChange={setArea} options={[['entreno', 'Entreno'], ['masa', 'Masa'], ['comida', 'Comida'], ['sueño', 'Sueño y pasos'], ['mente', 'Mente']]} />
      <div className="principles">{PRINCIPLES.filter(p => p.area === area).map(p => <article key={p.id}><h3>{p.title}</h3><p>{p.body}</p></article>)}</div>
      <p className="hint">El método viene de Juanma Arbeláez, que no es médico. Lo que toca tu salud se confirma con fuentes médicas (abajo).</p>
    </Card>
    <Card className="back-method">
      <span className="eyebrow">ESPALDA SIN BARRA</span>
      <h2>Tres movimientos, cero barra</h2>
      <div className="back-moves">{BACK_METHOD.moves.map((m, i) => <article key={m.name}><b>{i + 1}</b><div><strong>{m.name}</strong><p>{m.how}</p><small>{m.exercise}</small></div></article>)}</div>
      <details><summary>Lo que tomamos del video y lo que no</summary>
        <ul>{BACK_METHOD.kept.map(k => <li key={k}>{k}</li>)}</ul>
        <ul className="dropped">{BACK_METHOD.dropped.map(d => <li key={d.what}><strong>Fuera: {d.what}.</strong> {d.why}</li>)}</ul>
      </details>
      <a className="hint" href={BACK_METHOD.url} target="_blank" rel="noreferrer">Idea de {BACK_METHOD.source}</a>
    </Card>
    <Card>
      <span className="eyebrow">LO QUE DICE LA CIENCIA</span>
      <h2>Por qué tu sesión es como es</h2>
      <p className="hint">Estudios revisados por pares. Cada regla de aquí ya está metida en tu plan.</p>
      <div className="evidence">{EVIDENCE.map(e => <details key={e.id}><summary>{e.rule}</summary><p>{e.why}</p><a href={e.url} target="_blank" rel="noreferrer">{e.study}</a></details>)}</div>
    </Card>
    <Card>
      <span className="eyebrow">FUENTES MÉDICAS</span>
      <h2>Para confirmarlo por tu cuenta</h2>
      <ul className="sources">{SOURCES.map(x => <li key={x.url}><a href={x.url} target="_blank" rel="noreferrer">{x.title}</a><small>{x.org} · {x.about}</small></li>)}</ul>
    </Card>
    <Card>
      <span className="eyebrow">EQUIPO CASERO</span>
      <h2>Qué conseguir, en orden</h2>
      <div className="gear">{HOME_GEAR.map((g, i) => <article key={g.name}><b>{i + 1}</b><div><strong>{g.name}</strong><p>{g.why}</p><p className="hint">{g.how}</p><small>Desbloquea: {g.unlocks}</small></div></article>)}</div>
    </Card>
  </>
}

// ── Ejercicios ──────────────────────────────────────────────────────────
function LibraryTab({ data, commit }: { data: AppData; commit: Commit }) {
  const gear: [string, string][] = [['paralelas', 'Mini paralelas'], ['mochila', 'Mochila'], ['libros', 'Libros'], ['silla', 'Silla'], ['toalla', 'Toalla'], ['puerta', 'Puerta'], ['mesa', 'Mesa firme'], ['barra', 'Barra'], ['palo', 'Palo y cuerda']]
  const toggle = (g: string) => commit(d => ({ ...d, settings: { ...d.settings, equipment: d.settings.equipment.includes(g) ? d.settings.equipment.filter(x => x !== g) : [...d.settings.equipment, g] } }))
  return <>
    <Card><span className="eyebrow">TU EQUIPO</span><h2>¿Con qué cuentas?</h2><p className="hint">El coach solo te pone ejercicios que puedes hacer con esto.</p><Chips multiple label="Equipo" value={data.settings.equipment} onChange={toggle} options={gear} /></Card>
    {(Object.keys(SLOT_LABEL) as Slot[]).map(slot => <Card key={slot}>
      <h2>{SLOT_LABEL[slot]}</h2>
      <ol className="ladder">{ladder(slot).map(ex => <li key={ex.id} className={available(ex, data.settings.equipment) ? '' : 'locked'}>
        <details><summary><strong>{ex.name}</strong><small>{ex.range[0]} a {ex.range[1]}{ex.mode === 'seconds' ? ' s' : ' reps'}{available(ex, data.settings.equipment) ? '' : ` · necesitas ${ex.equipment.filter(e => !data.settings.equipment.includes(e) && e !== 'nada').join(', ')}`}</small></summary>
          <ExerciseFigure ex={ex} />
          <ul>{ex.cues.map(c => <li key={c}>{c}</li>)}</ul>{ex.mistakes.length > 0 && <p><strong>Evita:</strong> {ex.mistakes.join('. ')}.</p>}{ex.caution && <p className="caution">{ex.caution}</p>}
          <p className="hint">Trabaja: {Object.keys(ex.muscles).map(muscleLabel).join(', ')}</p></details>
      </li>)}</ol>
    </Card>)}
    <p className="hint">{EXERCISES.length} ejercicios. Cuando llegas al tope del rango en todas tus series, el coach te sube al siguiente escalón.</p>
  </>
}
