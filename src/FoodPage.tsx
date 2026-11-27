import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { dateKey, type AppData, type BodyLog, type Meal, type MealSlot, type NutritionGoal, type NutritionProfile } from './lib/model'
import { currentWeight, dayTotals, frequentMeals, mealTotals, PHASE_LABEL, planFor, shiftDay, SLOT_LABEL, slotFor, type AdultPlan, type GrowthPlan } from './lib/nutrition'
import { FoodLogger, saveMeal } from './FoodLogger'
import { FoodCheckin } from './FoodCheckin'
import { DuoIcon } from './DuoIcons'
import { reward } from './juice'
import { haptic } from './lib/haptic'
import { borrarFotoComida, fotoComida, prepararFoto } from './lib/fotosComida'

type Commit = (update: (d: AppData) => AppData) => void
type Props = { data: AppData; commit: Commit; onMessage: (t: string, undo?: () => void) => void }

export const OPEN_MEAL_KEY = 'bambu.openMeal'
const SLOTS = Object.keys(SLOT_LABEL) as MealSlot[]

function Barra({ label, value, meta, unidad = '' }: { label: string; value: number; meta?: number; unidad?: string }) {
  const pct = meta ? Math.min(100, Math.round(value / meta * 100)) : 0
  return <div className={`d-comida-barra ${meta && value >= meta ? 'llena' : ''}`}>
    <div><span>{label}</span><b>{value}{unidad}{meta ? <small> de {meta}{unidad}</small> : null}</b></div>
    <i role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={meta || 0} aria-valuenow={value}><u style={{ width: `${pct}%` }} /></i>
  </div>
}

function nombreComida(m: Meal): string {
  const t = m.items.slice(0, 3).map(i => i.name.toLowerCase()).join(', ')
  const c = t.charAt(0).toUpperCase() + t.slice(1)
  return c.length > 42 ? `${c.slice(0, 40).trimEnd()}…` : c
}

function useFotos(meals: Meal[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const ids = meals.map(m => m.id).join(',')
  useEffect(() => {
    let vivo = true
    const hechas: string[] = []
    Promise.all(meals.map(async m => { const b = await fotoComida(m.id).catch(() => null); return [m.id, b] as const })).then(lista => {
      if (!vivo) return
      const out: Record<string, string> = {}
      for (const [id, b] of lista) if (b) { const u = URL.createObjectURL(b); hechas.push(u); out[id] = u }
      setUrls(out)
    })
    return () => { vivo = false; hechas.forEach(u => URL.revokeObjectURL(u)) }
  }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps
  return urls
}

function Semana({ data, plan }: { data: AppData; plan: GrowthPlan | AdultPlan }) {
  const today = dateKey()
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6))
  return <div className="d-card">
    <div className="d-card-head"><h2>Tu semana</h2></div>
    <div className="d-comida-semana">{days.map(d => {
      const t = dayTotals(data, d)
      const hit = plan.mode === 'crecimiento' ? t.proteinMeals >= 4 : !!plan.protein && t.protein >= plan.protein * 0.9
      return <div key={d} className={`${hit ? 'hit' : t.meals ? 'some' : ''} ${d === today ? 'today' : ''}`}>
        <small>{new Intl.DateTimeFormat('es-MX', { weekday: 'narrow' }).format(new Date(`${d}T12:00:00`))}</small>
        <i aria-label={`${t.meals} comidas${hit ? ', meta de proteína' : ''}`}>{hit ? <DuoIcon name="check" size={18} /> : t.meals || ''}</i>
      </div>
    })}</div>
    <p className="d-hint left">{plan.mode === 'crecimiento' ? 'Palomita: 4 comidas con proteína ese día. El número: comidas registradas.' : 'Palomita: llegaste a tu proteína. El número: comidas registradas.'}</p>
  </div>
}

function Method() {
  return <details className="d-more"><summary>Cómo decide bambú</summary>
    <ol className="d-metodo">
      <li><b>Mide.</b> Lo que comes en segundos y tu peso de la mañana. El promedio de la semana manda, no el día.</li>
      <li><b>Decide.</b> La fase sale de tu cintura entre tu estatura, tus años entrenando y tu meta.</li>
      <li><b>Calibra.</b> Arranca con la fórmula de Mifflin-St Jeor. Con tres semanas de registros, tu gasto real sale de lo que comiste y lo que cambió tu peso.</li>
      <li><b>Ajusta.</b> Cada semana contra un ritmo con evidencia: definir 0.5 a 1% del peso por semana, ganar 0.25 a 0.5%, proteína de 1.6 a 2.2 g por kilo.</li>
    </ol>
    <p className="d-hint left">Fuentes: Helms 2014, Iraki 2019, Morton 2018, Frankenfield 2005, Barakat 2020, Ashwell 2012.</p>
  </details>
}

function Metas({ data, commit, growth, plan }: { data: AppData; commit: Commit; growth: boolean; plan: GrowthPlan | AdultPlan }) {
  const today = dateKey()
  const n = data.settings.nutrition ?? {}
  const last = (k: 'heightCm' | 'waistCm') => [...data.body].filter(b => b[k]).sort((a, b) => b.day.localeCompare(a.day))[0]?.[k]
  const weight = currentWeight(data, today)
  const [draft, setDraft] = useState({ weight: '', height: '', waist: '', age: '' })
  const setN = (patch: NutritionProfile) => commit(d => ({ ...d, settings: { ...d.settings, nutrition: { ...d.settings.nutrition, ...patch } } }))
  const save = () => {
    const w = Number(draft.weight), h = Number(draft.height), c = Number(draft.waist), a = Number(draft.age)
    if (Number.isInteger(a) && a >= 8 && a <= 99) commit(d => ({ ...d, settings: { ...d.settings, age: a, sinEdad: undefined } }))
    if (!draft.weight && !draft.height && !draft.waist) { setDraft({ weight: '', height: '', waist: '', age: '' }); return }
    commit(d => {
      const row: BodyLog = { ...(d.body.find(b => b.day === today) ?? { id: today, day: today }) }
      if (w >= 20 && w <= 250) row.weightKg = w
      if (h >= 100 && h <= 230) row.heightCm = h
      if (c >= 40 && c <= 200) row.waistCm = c
      return { ...d, body: [...d.body.filter(b => b.day !== today), row] }
    })
    setDraft({ weight: '', height: '', waist: '', age: '' })
  }
  const sinEdad = data.settings.sinEdad === true
  const chips = <T extends string | number>(label: string, value: T | undefined, ops: [T, string][], on: (v: T) => void) => <div className="d-field">{label}
    <div className="d-chips">{ops.map(([v, l]) => <button key={String(v)} type="button" className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => on(v)}>{l}</button>)}</div></div>
  const rate = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(2).replace(/0$/, '')}%`
  return <div className="d-card d-comida-metas" id="tus-metas">
    <div className="d-card-head"><h2>Tus metas</h2></div>
    {plan.mode === 'crecimiento' ? (plan.floor ? <ul className="d-comida-datos">
      <li><span>Tu gasto</span><b>{plan.floor.eer} kcal</b></li>
      <li><span>Tu piso</span><b>{plan.floor.kcal} kcal</b></li>
      <li><span>Proteína</span><b>{plan.floor.protein} g o más</b></li>
    </ul> : <p className="d-hint left">Pon tu peso y estatura y te calculo tu piso de energía para crecer.</p>)
      : plan.tdee ? <ul className="d-comida-datos">
        <li><span>{plan.phase ? PHASE_LABEL[plan.phase] : 'Tu plan'}</span><b>{plan.kcal} kcal</b></li>
        <li><span>Gasto diario</span><b>{plan.tdee.value} kcal</b></li>
        <li><span>Ritmo</span><b>{plan.rate.target === 0 ? 'Peso estable' : `${rate(plan.rate.target)} / semana`}</b></li>
      </ul> : <p className="d-hint left">Pon tu peso, estatura y cintura, y tu meta. Con eso te calculo calorías y proteína.</p>}
    {sinEdad && <p className="d-hint left">No pusiste tu edad. Mientras no la pongas, te cuido como a alguien que está creciendo: nunca te pongo tope de calorías.</p>}
    <div className="d-comida-medidas">
      <label>Edad<input className="d-input" inputMode="numeric" placeholder={sinEdad ? 'Opcional' : String(data.settings.age)} value={draft.age} onChange={e => setDraft(x => ({ ...x, age: e.target.value.replace(/\D/g, '').slice(0, 2) }))} /></label>
      <label>Peso (kg)<input className="d-input" inputMode="decimal" placeholder={weight ? weight.toFixed(1) : '70'} value={draft.weight} onChange={e => setDraft(x => ({ ...x, weight: e.target.value.replace(/[^\d.]/g, '') }))} /></label>
      <label>Estatura (cm)<input className="d-input" inputMode="numeric" placeholder={last('heightCm') ? String(last('heightCm')) : '170'} value={draft.height} onChange={e => setDraft(x => ({ ...x, height: e.target.value.replace(/\D/g, '') }))} /></label>
      {!growth && <label>Cintura (cm)<input className="d-input" inputMode="numeric" placeholder={last('waistCm') ? String(last('waistCm')) : '80'} value={draft.waist} onChange={e => setDraft(x => ({ ...x, waist: e.target.value.replace(/\D/g, '') }))} /></label>}
    </div>
    <button type="button" className="d-btn green wide" disabled={!draft.weight && !draft.height && !draft.waist && !draft.age} onClick={save}>Guardar</button>
    {chips('Sexo (cambia la fórmula)', n.sex, [['h', 'Hombre'], ['m', 'Mujer']], v => setN({ sex: v }))}
    {growth ? chips('Tu meta', n.goal === 'musculo' || n.goal === 'ambos' ? 'musculo' : 'salud', [['musculo', 'Subir de peso y músculo'], ['salud', 'Crecer sano']], v => setN({ goal: v as NutritionGoal }))
      : <>{chips('Tu meta', n.goal, [['definir', 'Verme más marcado'], ['musculo', 'Más músculo'], ['ambos', 'Las dos'], ['salud', 'Salud y energía']], v => setN({ goal: v as NutritionGoal }))}
        {chips('Años entrenando fuerza', n.trainingYears, [[0, 'Menos de 1'], [1, '1 a 3'], [3, 'Más de 3']], v => setN({ trainingYears: v }))}</>}
    {growth && <details className="d-more"><summary>Cómo decide bambú</summary>
      <p className="d-hint left">Tu cuerpo necesita alimento para crecer, aprender y jugar. Las calorías son tu piso, nunca tu techo. bambú nunca te va a pedir comer menos; si quieres un plan más fino, que lo arme un nutriólogo.</p>
    </details>}
    {!growth && <Method />}
  </div>
}

export function FoodPage({ data, commit, onMessage }: Props) {
  const plan = planFor(data)
  const growth = plan.mode === 'crecimiento'
  const today = dateKey()
  const ahora = slotFor(new Date().getHours())
  const [slot, setSlot] = useState<MealSlot>(ahora)
  const [open, setOpen] = useState<MealSlot | null>(() => { try { if (sessionStorage.getItem(OPEN_MEAL_KEY)) { sessionStorage.removeItem(OPEN_MEAL_KEY); return ahora } } catch { /* sin sesión, abre cerrado */ } return null })
  const [foto, setFoto] = useState<Blob | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const meals = data.meals.filter(m => m.day === today).sort((a, b) => a.at - b.at)
  const fotos = useFotos(meals)
  const usual = useMemo(() => frequentMeals(data, 4, slot), [data, slot])
  const t = dayTotals(data, today)
  const metas = growth ? ((plan as GrowthPlan).floor ? { kcal: (plan as GrowthPlan).floor!.kcal, protein: (plan as GrowthPlan).floor!.protein } : null)
    : ((plan as AdultPlan).kcal && (plan as AdultPlan).protein ? { kcal: (plan as AdultPlan).kcal!, protein: (plan as AdultPlan).protein! } : null)
  const dice = !metas ? 'Calcula tus metas y te digo cuánto te falta.'
    : growth ? (t.kcal >= metas.kcal ? 'Ya llegaste a tu piso. Lo extra también suma para crecer.' : `Te faltan ${metas.kcal - t.kcal} kcal para tu piso de hoy.`)
      : metas.kcal - t.kcal >= 0 ? `Te quedan ${metas.kcal - t.kcal} kcal y ${Math.max(0, metas.protein - Math.round(t.protein))} g de proteína.` : `Te pasaste ${t.kcal - metas.kcal} kcal. Un día no cambia nada; la semana sí.`
  const remove = (id: string) => {
    const meal = data.meals.find(m => m.id === id)
    commit(d => ({ ...d, meals: d.meals.filter(m => m.id !== id) }))
    if (meal) onMessage('Comida borrada.', () => commit(d => ({ ...d, meals: [...d.meals, meal] })))
    void borrarFotoComida(id).catch(() => undefined)
  }
  const deSiempre = (m: Meal, e: MouseEvent<HTMLButtonElement>) => { reward(e.currentTarget); saveMeal(commit, onMessage, slot, m.items, growth) }
  const conFoto = async (f: File | undefined) => {
    if (!f) return
    try { setFoto(await prepararFoto(f)); setOpen(slot) } catch { onMessage('No se pudo leer la foto.') }
  }
  return <section className="d-page d-comida">
    <div className="d-comida-hero">
      <div className="d-comida-top">
        <div><p>Comida de hoy</p><b>{t.kcal}<small> kcal</small></b></div>
        <span className="d-comida-plato"><DuoIcon name="plato" size={54} /></span>
      </div>
      <Barra label={growth ? 'Energía para crecer' : 'Calorías'} value={t.kcal} meta={metas?.kcal} />
      <Barra label="Proteína" value={Math.round(t.protein)} meta={metas?.protein} unidad=" g" />
      <p className="d-comida-dice">{dice}</p>
      {!metas && <button type="button" className="d-btn white small" onClick={() => document.getElementById('tus-metas')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Calcular mis metas</button>}
    </div>

    <div className="d-card">
      <div className="d-card-head"><h2>¿Qué comiste?</h2></div>
      <div className="d-chips d-comida-slots">{SLOTS.map(s => <button key={s} type="button" className={slot === s ? 'on' : ''} aria-pressed={slot === s} onClick={() => { haptic(6); setSlot(s) }}>{SLOT_LABEL[s]}</button>)}</div>
      {usual.length > 0 && <>
        <p className="d-hint left">Lo de siempre, en un toque</p>
        <div className="d-comida-usual">{usual.map(m => { const x = mealTotals(m); return <button key={m.id} type="button" onClick={e => deSiempre(m, e)}>
          <b>{nombreComida(m)}</b><small>{growth ? `${Math.round(x.protein)} g de proteína` : `${x.kcal} kcal · ${Math.round(x.protein)} g`}</small><i aria-hidden="true"><DuoIcon name="mas" size={22} /></i>
        </button> })}</div>
      </>}
      <div className="d-comida-acciones">
        <button type="button" className="d-btn white d-comida-foto" aria-label="Con foto" onClick={() => archivo.current?.click()}><DuoIcon name="camara" size={26} /></button>
        <button type="button" className="d-btn green wide" onClick={() => { setFoto(null); setOpen(slot) }}>{usual.length ? 'Otra cosa' : `Registrar ${SLOT_LABEL[slot].toLowerCase()}`}</button>
      </div>
      <input ref={archivo} className="visually-hidden" type="file" accept="image/*" capture="environment" aria-label="Tomar foto de tu comida" onChange={e => { void conFoto(e.target.files?.[0]); e.target.value = '' }} />
    </div>

    {growth && <FoodCheckin />}

    {meals.length > 0 && <div className="d-card">
      <div className="d-card-head"><h2>Hoy</h2><span className="d-comida-cuenta">{meals.length} {meals.length === 1 ? 'comida' : 'comidas'}</span></div>
      <ul className="d-comida-lista">{meals.map(m => { const x = mealTotals(m); return <li key={m.id}>
        {fotos[m.id] ? <img src={fotos[m.id]} alt="" /> : <span className="d-comida-ico"><DuoIcon name="plato" size={26} /></span>}
        <span className="d-comida-txt"><b>{SLOT_LABEL[m.slot]}</b><small>{nombreComida(m)}</small></span>
        <em>{growth ? `${Math.round(x.protein)} g` : `${x.kcal} kcal`}</em>
        <button type="button" className="d-x" aria-label={`Borrar ${SLOT_LABEL[m.slot].toLowerCase()}`} onClick={() => remove(m.id)}>×</button>
      </li> })}</ul>
    </div>}

    <Semana data={data} plan={plan} />
    <Metas data={data} commit={commit} growth={growth} plan={plan} />
    {open && <FoodLogger data={data} commit={commit} slot={open} foto={foto} growth={growth && !(plan as GrowthPlan).floor} onClose={() => { setOpen(null); setFoto(null) }} onMessage={onMessage} />}
  </section>
}
