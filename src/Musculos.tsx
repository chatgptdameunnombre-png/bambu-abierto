import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { dateKey, type AppData } from './lib/model'
import { bodyAdvice, muscleStats, PERIODS, type Muscle, type MuscleStat, type Period } from './lib/musculos'
import { fmtDay } from './ui'
import { Sheet } from './Sheet'

const CAPAS: [Muscle, string][] = [['Hombros', 'hombros'], ['Pecho', 'pecho'], ['Brazos', 'brazos'], ['Abdomen', 'abdomen'], ['Espalda', 'espalda'], ['Piernas', 'piernas']]
type Mascara = { w: number; h: number; a: Uint8ClampedArray }

function useMascaras() {
  const ref = useRef<Partial<Record<Muscle, Mascara>>>({})
  useEffect(() => {
    let vivo = true
    for (const [m, f] of CAPAS) {
      const im = new Image()
      im.onload = () => {
        if (!vivo) return
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height
        const x = c.getContext('2d', { willReadFrequently: true }); if (!x) return
        x.drawImage(im, 0, 0)
        ref.current[m] = { w: im.width, h: im.height, a: x.getImageData(0, 0, im.width, im.height).data }
      }
      im.src = `cuerpo/${f}.png`
    }
    return () => { vivo = false }
  }, [])
  return ref
}

export function Body({ stats, sel, onPick }: { stats: Record<Muscle, MuscleStat>; sel: Muscle | null; onPick: (m: Muscle) => void }) {
  const mascaras = useMascaras()
  function tocar(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height
    let mejor: Muscle | null = null, dist = Infinity
    for (const [m] of CAPAS) {
      const k = mascaras.current[m]; if (!k) continue
      const cx = Math.round(fx * k.w), cy = Math.round(fy * k.h)
      for (let dy = -10; dy <= 10; dy += 2) for (let dx = -10; dx <= 10; dx += 2) {
        const x = cx + dx, y = cy + dy
        if (x < 0 || y < 0 || x >= k.w || y >= k.h || k.a[(y * k.w + x) * 4 + 3] < 128) continue
        const d = dx * dx + dy * dy
        if (d < dist) { dist = d; mejor = m }
      }
    }
    if (mejor) onPick(mejor)
  }
  return <div className="d-body-img" onClick={tocar}>
    <img src="cuerpo/base.png" alt="Mapa de tus músculos" width={623} height={629} draggable={false} />
    {CAPAS.map(([m, f]) => stats[m].level > 0 || sel === m ? <span key={f} className={`mu-capa l${stats[m].level} ${sel === m ? 'sel' : ''}`} style={{ WebkitMaskImage: `url(cuerpo/${f}.png)`, maskImage: `url(cuerpo/${f}.png)` }} aria-hidden="true" /> : null)}
    <span className="mu-pie" style={{ left: '22.1%' }}>Frente</span><span className="mu-pie" style={{ left: '78.7%' }}>Espalda</span>
    <div className="visually-hidden">{CAPAS.map(([m]) => <button key={m} type="button" onClick={() => onPick(m)}>{m}: {stats[m].sets} series</button>)}</div>
  </div>
}

export function BodyCard({ data, onTrain }: { data: AppData; onTrain?: (m: Muscle) => void }) {
  const today = dateKey()
  const [period, setPeriod] = useState<Period>('mes')
  const stats = useMemo(() => muscleStats(data, today, period), [data, today, period])
  const [sel, setSel] = useState<Muscle | null>(null)
  const s = sel ? stats[sel] : null
  const pname = PERIODS.find(p => p.id === period)!.name
  return <div className="d-card d-body-card">
    <div className="d-card-head"><h2>Tu cuerpo</h2></div>
    <div className="d-mode three" role="tablist" aria-label="Periodo">{PERIODS.map(p => <button key={p.id} type="button" role="tab" aria-selected={period === p.id} className={period === p.id ? 'on' : ''} onClick={() => setPeriod(p.id)}>{p.name}</button>)}</div>
    <p className="d-hint left">{bodyAdvice(stats)} Toca un músculo para ver tus números.</p>
    <Body stats={stats} sel={sel} onPick={setSel} />
    <div className="d-legend"><span className="l3">Mucho</span><span className="l2">Medio</span><span className="l1">Poco</span><span className="l0">Nada</span></div>
    {s && <Sheet title={s.muscle} onClose={() => setSel(null)}>
      <p className="d-hint left">{pname === 'Siempre' ? 'Desde que empezaste' : `Últimos ${pname}`}</p>
      <div className="d-tiles">
        <div className="d-tile green"><span>Series</span><b>{s.sets}</b></div>
        <div className="d-tile blue"><span>Reps</span><b>{s.reps}</b></div>
        <div className="d-tile gold"><span>Días</span><b>{s.days}</b></div>
      </div>
      {s.seconds > 0 && <p className="d-hint left">Holds: {s.seconds >= 120 ? `${Math.round(s.seconds / 6) / 10} min` : `${s.seconds} s`} en total.</p>}
      <h3 className="d-sheet-h3">Tus mejores</h3>
      {s.top.length ? <ul className="d-read-list">{s.top.map(t => <li key={t.name}><b>{t.name}</b><em>{t.best}{t.kind === 'seconds' ? ' s' : ' reps'}</em></li>)}</ul> : <p className="d-hint left">No hay series de {s.muscle.toLowerCase()} en este periodo.</p>}
      {s.lastDay && <p className="d-hint left">Última vez: {fmtDay(s.lastDay)}.</p>}
      {onTrain && <button type="button" className="d-btn green wide" onClick={() => { onTrain(s.muscle); setSel(null) }}>Ver ejercicios de {s.muscle.toLowerCase()}</button>}
    </Sheet>}
  </div>
}
