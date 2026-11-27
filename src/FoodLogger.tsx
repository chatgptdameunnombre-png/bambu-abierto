import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { dateKey, makeId, type AppData, type Meal, type MealItem, type MealSlot } from './lib/model'
import { FOODS, HAND, itemOf, searchFoods, type Food } from './lib/foods'
import { frequentMeals, mealTotals, SLOT_LABEL } from './lib/nutrition'
import { Icon } from './Icons'
import { reward } from './juice'
import { haptic } from './lib/haptic'
import { guardarFotoComida } from './lib/fotosComida'

type Commit = (update: (d: AppData) => AppData) => void
type Tab = 'repetir' | 'buscar' | 'mano' | 'etiqueta'
type Props = { data: AppData; commit: Commit; slot: MealSlot; growth: boolean; onClose: () => void; onMessage: (t: string, undo?: () => void) => void; foto?: Blob | null }

const QUICK_IDS = ['huevo', 'tortilla', 'frijoles', 'pollo', 'arroz', 'leche', 'platano', 'quesadilla', 'taco-asada', 'ensalada', 'yogur-griego', 'pan-dulce']
const qtyText = (q: number) => Number.isInteger(q) ? String(q) : q.toFixed(1).replace('.0', '')

/** Lo que llevas en el plato antes de guardar. kcal solo para adultos: a un menor no se le enseña el número. */
export function itemLine(i: MealItem, growth: boolean): string {
  return growth ? `${Math.round(i.protein)} g de proteína` : `${i.kcal} kcal · ${Math.round(i.protein)} g proteína`
}

export function saveMeal(commit: Commit, onMessage: Props['onMessage'], slot: MealSlot, items: MealItem[], growth: boolean): Meal {
  const meal: Meal = { id: makeId(), day: dateKey(), at: Date.now(), slot, items }
  commit(d => ({ ...d, meals: [...d.meals, meal] }))
  const t = mealTotals(meal)
  haptic([12, 30, 20])
  onMessage(`${SLOT_LABEL[slot]} ${slot === 'desayuno' ? 'registrado' : 'registrada'}. ${growth ? `${Math.round(t.protein)} g de proteína.` : `${t.kcal} kcal, ${Math.round(t.protein)} g de proteína.`}`, () => commit(d => ({ ...d, meals: d.meals.filter(m => m.id !== meal.id) })))
  return meal
}

export function FoodLogger({ data, commit, slot: initial, growth, onClose, onMessage, foto = null }: Props) {
  const conFoto = (meal: Meal) => { if (foto) void guardarFotoComida(meal.id, foto).catch(() => undefined) }
  const fotoUrl = useMemo(() => foto ? URL.createObjectURL(foto) : null, [foto])
  useEffect(() => () => { if (fotoUrl) URL.revokeObjectURL(fotoUrl) }, [fotoUrl])
  const recent = useMemo(() => frequentMeals(data, 6, initial), [data, initial])
  const [tab, setTab] = useState<Tab>(recent.length ? 'repetir' : 'buscar')
  const [slot, setSlot] = useState<MealSlot>(initial)
  const [cart, setCart] = useState<MealItem[]>([])
  const [query, setQuery] = useState('')
  const [label, setLabel] = useState({ name: '', kcal: '', protein: '' })
  const sheet = useRef<HTMLElement>(null)
  useEffect(() => { sheet.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const results = query.trim() ? searchFoods(query) : QUICK_IDS.map(id => FOODS.find(f => f.id === id)!).filter(Boolean)
  const add = (food: Food, e?: MouseEvent) => {
    setCart(c => {
      const at = c.findIndex(i => i.foodId === food.id)
      if (at < 0) return [...c, itemOf(food, 1)]
      return c.map((i, k) => k === at ? itemOf(food, i.qty + 1) : i)
    })
    if (e) reward(e.currentTarget, '+1')
    haptic(8)
  }
  const setQty = (k: number, qty: number) => setCart(c => qty <= 0 ? c.filter((_, j) => j !== k) : c.map((i, j) => {
    if (j !== k) return i
    const food = [...FOODS, ...HAND].find(f => f.id === i.foodId)
    return food ? itemOf(food, qty) : { ...i, qty, kcal: Math.round(i.kcal / i.qty * qty), protein: Math.round(i.protein / i.qty * qty * 10) / 10 }
  }))
  const handCount = (id: string) => cart.find(i => i.foodId === id)?.qty ?? 0
  const repeat = (m: Meal, e: MouseEvent) => {
    reward(e.currentTarget)
    conFoto(saveMeal(commit, onMessage, slot, m.items, growth))
    onClose()
  }
  const addLabel = () => {
    const kcal = Number(label.kcal) || 0, protein = Number(label.protein) || 0
    if (!label.name.trim() || (!kcal && !protein)) return
    setCart(c => [...c, { name: label.name.trim().slice(0, 80), qty: 1, unit: 'porción', kcal: Math.round(kcal), protein: Math.round(protein * 10) / 10, group: protein >= 10 ? 'proteina' : 'platillo' }])
    setLabel({ name: '', kcal: '', protein: '' })
  }
  const total = cart.reduce((t, i) => ({ kcal: t.kcal + i.kcal, protein: t.protein + i.protein }), { kcal: 0, protein: 0 })

  return <div className="ql-scrim" onClick={onClose}>
    <section ref={sheet} tabIndex={-1} className="ql-sheet food-sheet" role="dialog" aria-modal="true" aria-label="Registrar comida" onClick={e => e.stopPropagation()}>
      <span className="ql-grip" aria-hidden="true" />
      <header className="ql-head">
        {fotoUrl && <img className="food-foto-mini" src={fotoUrl} alt="Tu foto" />}
        <div><h2>¿Qué comiste?</h2><p>{fotoUrl ? 'Tu foto se guarda con esta comida. Ahora dime qué es.' : 'Lo que repites, en un toque. Lo nuevo, en tres.'}</p></div>
        <button type="button" className="ql-close" onClick={onClose} aria-label="Cerrar"><Icon name="cerrar" size={20} /></button>
      </header>
      <div className="food-slot-pick" role="radiogroup" aria-label="Momento">
        {(Object.keys(SLOT_LABEL) as MealSlot[]).map(s => <button key={s} type="button" role="radio" aria-checked={slot === s} className={slot === s ? 'on' : ''} onClick={() => setSlot(s)}>{SLOT_LABEL[s]}</button>)}
      </div>
      <div className="food-tabs" role="tablist">
        {([['repetir', 'Repetir'], ['buscar', 'Buscar'], ['mano', 'A ojo'], ['etiqueta', 'Etiqueta']] as [Tab, string][]).map(([t, l]) =>
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{l}</button>)}
      </div>

      {tab === 'repetir' && (recent.length ? <ul className="food-repeat">{recent.map(m => {
        const t = mealTotals(m)
        return <li key={m.id}><button type="button" onClick={e => repeat(m, e)}>
          <span><strong>{m.items.map(i => `${qtyText(i.qty)} ${i.name.toLowerCase()}`).join(', ')}</strong><small>{growth ? `${Math.round(t.protein)} g de proteína` : `${t.kcal} kcal · ${Math.round(t.protein)} g proteína`}</small></span>
          <i aria-hidden="true"><Icon name="mas-grande" size={18} /></i></button></li>
      })}</ul> : <p className="food-empty">Aquí aparecerá lo que más comes. Registra una vez y la próxima es un toque.</p>)}

      {tab === 'buscar' && <>
        <input className="text-input food-search" type="search" inputMode="search" placeholder="Huevo, tacos, plátano" value={query} onChange={e => setQuery(e.target.value)} aria-label="Buscar alimento" />
        {!query.trim() && <p className="food-hint">Lo más común</p>}
        <div className="food-results">{results.map(f => <button key={f.id} type="button" onClick={e => add(f, e)}>
          <span><strong>{f.name}</strong><small>{f.unit}{f.estimated ? ' · Estimado' : f.source ? ' · Etiqueta del fabricante' : ''}{growth ? '' : ` · ${f.kcal} kcal`}</small></span><i aria-hidden="true">+</i></button>)}
          {query.trim() && !results.length && <p className="food-empty">No está en la lista. Usa A ojo o Etiqueta.</p>}
        </div>
      </>}

      {tab === 'mano' && <div className="food-hand">
        <p className="food-hint">Tu mano mide por ti y crece contigo. Cuenta palmas, puños y pulgares.</p>
        {HAND.map(h => { const n = handCount(h.id); const k = cart.findIndex(i => i.foodId === h.id)
          return <div key={h.id} className="food-hand-row"><span><strong>{h.name}</strong><small>{h.words}</small></span>
            <div className="food-step"><button type="button" aria-label={`Menos ${h.name}`} disabled={!n} onClick={() => setQty(k, n - 0.5)}>−</button><b aria-live="polite">{qtyText(n)}</b><button type="button" aria-label={`Más ${h.name}`} onClick={e => (n ? setQty(k, n + 0.5) : add(h, e))}>+</button></div></div> })}
      </div>}

      {tab === 'etiqueta' && <form className="food-label" onSubmit={e => { e.preventDefault(); addLabel() }}>
        <p className="food-hint">Para lo empaquetado: copia la porción de la etiqueta.</p>
        <input className="text-input" placeholder="Qué es" value={label.name} maxLength={80} onChange={e => setLabel(l => ({ ...l, name: e.target.value }))} aria-label="Nombre" />
        <div className="food-label-nums">
          <label>Proteína (g)<input className="text-input" inputMode="decimal" value={label.protein} onChange={e => setLabel(l => ({ ...l, protein: e.target.value.replace(/[^\d.]/g, '') }))} /></label>
          {!growth && <label>Calorías<input className="text-input" inputMode="numeric" value={label.kcal} onChange={e => setLabel(l => ({ ...l, kcal: e.target.value.replace(/\D/g, '') }))} /></label>}
        </div>
        <button className="secondary-button" disabled={!label.name.trim() || (!Number(label.kcal) && !Number(label.protein))}>Al plato</button>
      </form>}

      {cart.length > 0 && <div className="food-cart">
        <ul>{cart.map((i, k) => <li key={`${i.name}-${k}`}><span><strong>{i.name}</strong><small>{qtyText(i.qty)} {i.unit} · {itemLine(i, growth)}</small></span>
          <div className="food-step"><button type="button" aria-label={`Menos ${i.name}`} onClick={() => setQty(k, i.qty - (i.qty <= 1 ? 0.5 : 1))}>−</button><b>{qtyText(i.qty)}</b><button type="button" aria-label={`Más ${i.name}`} onClick={() => setQty(k, i.qty + (i.qty < 1 ? 0.5 : 1))}>+</button></div></li>)}</ul>
        <button type="button" className="primary-button food-save" onClick={e => { reward(e.currentTarget); conFoto(saveMeal(commit, onMessage, slot, cart, growth)); onClose() }}>
          Guardar {SLOT_LABEL[slot].toLowerCase()} <small>{growth ? `${Math.round(total.protein)} g de proteína` : `${total.kcal} kcal · ${Math.round(total.protein)} g`}</small></button>
      </div>}
    </section>
  </div>
}
