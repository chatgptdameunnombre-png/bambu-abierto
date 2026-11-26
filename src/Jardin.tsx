import { useMemo, useState } from 'react'
import { activeHabits, dateKey, type AppData } from './lib/model'
import { dayScore, gardenStats, habitFrequency, shiftDay, stage, wakeOn } from './lib/jardin'
import { levelOf, totalXp, xpOn, DAILY_GOAL } from './lib/xp'
import { fmtDay } from './ui'
import { DuoIcon } from './DuoIcons'
import { rankOf } from './lib/rangos'
import { BodyCard } from './Musculos'
import { resumenSemana, tiempoTexto } from './lib/semana'
import { semanaCard, shareBlob } from './ShareCard'
import { mondayOf } from './lib/libre'
import { marcador } from './lib/retos'
import { cargarRetos } from './Duelos'
import { cuenta, cuentaActiva } from './lib/firebase'

function SemanaCard({ data, today }: { data: AppData; today: string }) {
  const s = useMemo(() => resumenSemana(data, today), [data, today])
  const [estado, setEstado] = useState('')
  async function compartir() {
    setEstado('Dibujando…')
    try {
      const uid = cuentaActiva ? cuenta.guardada()?.uid : undefined
      const ds = uid ? await Promise.race([cargarRetos(uid).catch(() => null), new Promise<null>(r => setTimeout(() => r(null), 4000))]) : null
      const m = ds && uid ? marcador(ds, uid, Date.parse(`${mondayOf(today)}T00:00:00`)) : null
      const apodo = data.settings.tablas?.apodo || data.profile.name
      const blob = await semanaCard(s, apodo, m && m.ganados + m.perdidos + m.empates > 0 ? m : undefined)
      const r = await shareBlob(blob, `bambu-semana-${s.desde}.png`, 'Mi semana en Bambú, contada con la cámara.')
      setEstado(r === 'downloaded' ? 'Imagen guardada en tu teléfono.' : '')
    } catch { setEstado('No se pudo hacer la imagen.') }
  }
  return <div className="d-card d-semana">
    <div className="d-card-head"><h2>Tu semana</h2><DuoIcon name="rayo" size={32} /></div>
    <div className="d-semana-hero"><strong>{s.reps.toLocaleString('es-MX')}</strong><span>repeticiones con cámara{s.segundos > 0 ? ` y ${tiempoTexto(s.segundos)} de aguante` : ''}</span></div>
    <div className="d-twin"><span>Días <b>{s.dias}</b></span><span>XP <b>{s.xp.toLocaleString('es-MX')}</b></span><span>Redes <b>+{s.ganados} / −{s.usados} min</b></span></div>
    {s.nuevos.length > 0 && <p className="d-hint left"><DuoIcon name="estrella" size={18} /> {s.nuevos.length === 1 ? 'Récord nuevo' : 'Récords nuevos'}: {s.nuevos.map(r => `${r.name} ${r.seg ? tiempoTexto(r.best) : r.best}`).join(' · ')}</p>}
    <button type="button" className="d-btn green wide" onClick={() => void compartir()}>Compartir mi semana</button>
    {estado && <p className="d-hint">{estado}</p>}
  </div>
}

const STAGE_NAME = ['Tierra', 'Brote', 'Planta', 'Bambú', 'Bambú en flor']

export function PlantShape({ level }: { level: number }) {
  return <>
    <ellipse className="plant-soil" cx="20" cy="43" rx="14" ry="4.5" />
    {level === 0 && <circle className="plant-seed" cx="20" cy="41" r="2" />}
    {level === 1 && <g className="plant-grow">
      <path className="plant-stem" d="M20 42 V32" />
      <path className="plant-leaf" d="M20 35 C14 34 12 29 13 27 C18 28 20 31 20 35Z" />
      <path className="plant-leaf b" d="M20 34 C26 33 28 28 27 26 C22 27 20 30 20 34Z" />
    </g>}
    {level === 2 && <g className="plant-grow">
      <path className="plant-stem" d="M20 42 V21" />
      <path className="plant-leaf" d="M20 36 C13 36 10 31 10 28 C16 28 19 32 20 36Z" />
      <path className="plant-leaf b" d="M20 31 C27 31 30 26 30 23 C24 23 21 27 20 31Z" />
      <path className="plant-leaf" d="M20 25 C15 24 13 19 14 17 C18 18 20 21 20 25Z" />
      <path className="plant-leaf b" d="M20 24 C25 23 27 18 26 16 C22 17 20 20 20 24Z" />
    </g>}
    {level >= 3 && <g className="plant-grow">
      <rect className="plant-cane" x="17" y="9" width="6" height="33" rx="2.5" />
      <path className="plant-node" d="M17 32 H23 M17 22 H23 M17 14 H23" />
      <path className="plant-leaf" d="M18 24 C10 25 6 20 5 16 C12 16 16 20 18 24Z" />
      <path className="plant-leaf b" d="M22 18 C30 18 34 13 35 9 C28 9 24 13 22 18Z" />
      <path className="plant-leaf" d="M18 13 C14 11 12 7 13 3 C17 5 19 9 18 13Z" />
      {level === 4 && <>
        <rect className="plant-cane" x="26.5" y="21" width="4.5" height="21" rx="2" />
        <path className="plant-leaf b" d="M28 26 C34 24 37 20 37 17 C32 18 29 22 28 26Z" />
        <circle className="plant-bloom" cx="20" cy="6" r="4" />
        <circle className="plant-bloom-in" cx="20" cy="6" r="1.6" />
      </>}
    </g>}
  </>
}

export function Plant({ level, size = 40 }: { level: number; size?: number }) {
  return <svg className={`plant plant-${level}`} viewBox="0 0 40 48" width={size} height={size * 1.2} aria-hidden="true"><PlantShape level={level} /></svg>
}

const ROWS = [{ y: 112, s: 0.62 }, { y: 136, s: 0.76 }, { y: 163, s: 0.9 }, { y: 194, s: 1.06 }]
const STARS = [[30, 22], [74, 40], [118, 16], [168, 34], [214, 14], [262, 42], [300, 20], [330, 52]]

function Garden({ data, today, started, picked, onPick }: { data: AppData; today: string; started: string; picked: string; onPick: (d: string) => void }) {
  const monday = shiftDay(today, -((new Date(`${today}T12:00:00`).getDay() + 6) % 7))
  const weeks = [3, 2, 1, 0].map(w => Array.from({ length: 7 }, (_, d) => shiftDay(monday, -w * 7 + d)))
  return <svg className="d-scene" viewBox="0 0 360 232" role="img" aria-label="Tu jardín de las últimas 4 semanas">
    <rect className="sc-sky" x="0" y="0" width="360" height="232" />
    {STARS.map(([x, y], i) => <circle key={i} className="sc-star" cx={x} cy={y} r={i % 3 ? 1.2 : 1.8} />)}
    <circle className="sc-moon" cx="312" cy="38" r="14" />
    <circle className="sc-moon-cut" cx="318" cy="33" r="12" />
    <path className="sc-hill back" d="M0 104 C60 78 120 90 180 84 C240 78 300 70 360 92 V232 H0Z" />
    <path className="sc-hill mid" d="M0 128 C70 110 140 122 200 116 C260 110 310 104 360 118 V232 H0Z" />
    <path className="sc-hill front" d="M0 160 C80 146 160 156 230 150 C290 145 330 144 360 150 V232 H0Z" />
    {weeks.map((week, r) => week.map((day, i) => {
      const row = ROWS[r]
      const future = day > today, before = day < started
      const lv = future || before ? 0 : stage(dayScore(data, day).pct)
      const jitter = ((parseInt(day.slice(8), 10) * 37) % 9) - 4
      const x = 26 + i * 51 + jitter - 20 * row.s
      const y = row.y - 48 * row.s
      return <g key={day} className={`sc-plant ${future ? 'future' : ''} ${before ? 'before' : ''} ${day === today ? 'today' : ''} ${day === picked ? 'on' : ''}`}
        transform={`translate(${x} ${y}) scale(${row.s})`} role="button" tabIndex={future ? -1 : 0} aria-label={`${fmtDay(day)}: ${STAGE_NAME[lv]}`}
        onClick={() => !future && onPick(day)} onKeyDown={e => { if (!future && (e.key === 'Enter' || e.key === ' ')) onPick(day) }}>
        <rect className="sc-hit" x="-4" y="-6" width="48" height="58" rx="10" />
        {day === picked && <ellipse className="sc-pick" cx="20" cy="43" rx="18" ry="6.5" />}
        {future ? <ellipse className="sc-spot" cx="20" cy="43" rx="10" ry="3.2" /> : <PlantShape level={lv} />}
        {day === today && <path className="sc-arrow" d="M14 -10 L20 -3 L26 -10Z" />}
      </g>
    }))}
  </svg>
}

type Range = 7 | 30
type Measure = 'pct' | 'xp'
function Progress({ data, today }: { data: AppData; today: string }) {
  const [range, setRange] = useState<Range>(7)
  const [measure, setMeasure] = useState<Measure>('pct')
  const [tip, setTip] = useState<number | null>(null)
  const days = Array.from({ length: range }, (_, i) => shiftDay(today, i - range + 1))
  const rows = days.map(d => ({ day: d, pct: dayScore(data, d).pct, xp: xpOn(data, d) }))
  const val = (r: typeof rows[number]) => measure === 'pct' ? r.pct * 100 : r.xp
  const max = measure === 'pct' ? 100 : Math.max(DAILY_GOAL, ...rows.map(r => r.xp), 10)
  const goal = measure === 'pct' ? 80 : DAILY_GOAL
  const W = 340, H = 170, L = 30, B = 22, T = 10
  const bw = (W - L) / range
  const y = (v: number) => T + (H - T - B) * (1 - v / max)
  const avg = rows.reduce((a, r) => a + val(r), 0) / rows.length
  const best = rows.reduce((a, r) => val(r) > val(a) ? r : a, rows[0])
  const unit = measure === 'pct' ? '%' : ' XP'
  const sel = tip !== null ? rows[tip] : null
  return <div className="d-card d-chart">
    <div className="d-card-head"><h2>¿Cómo voy?</h2></div>
    <div className="d-chart-controls">
      <div className="d-seg">{([[7, '7 días'], [30, '30 días']] as [Range, string][]).map(([k, l]) => <button key={k} type="button" className={range === k ? 'on' : ''} onClick={() => { setRange(k); setTip(null) }}>{l}</button>)}</div>
      <div className="d-seg">{([['pct', 'Cumplido'], ['xp', 'XP']] as [Measure, string][]).map(([k, l]) => <button key={k} type="button" className={measure === k ? 'on' : ''} onClick={() => setMeasure(k)}>{l}</button>)}</div>
    </div>
    <p className="d-chart-sum">{sel ? <><b>{fmtDay(sel.day)}</b>: {Math.round(val(sel))}{unit}</> : <>Promedio <b>{Math.round(avg)}{unit}</b> · mejor día <b>{fmtDay(best.day)}</b> ({Math.round(val(best))}{unit})</>}</p>
    <svg className="d-chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${measure === 'pct' ? 'Porcentaje cumplido' : 'XP'} por día, últimos ${range} días`}>
      {[0, 0.5, 1].map(f => <g key={f}><line className="ch-grid" x1={L} x2={W} y1={y(max * f)} y2={y(max * f)} /><text className="ch-axis" x={L - 6} y={y(max * f) + 4} textAnchor="end">{Math.round(max * f)}</text></g>)}
      <line className="ch-goal" x1={L} x2={W} y1={y(goal)} y2={y(goal)} />
      <text className="ch-goal-t" x={W} y={y(goal) - 5} textAnchor="end">meta {goal}{unit}</text>
      {rows.map((r, i) => {
        const v = val(r), x = L + i * bw + Math.max(1, bw * 0.15), w = Math.max(3, bw * 0.7), top = y(v), h = Math.max(0, H - B - top)
        return <g key={r.day} onClick={() => setTip(tip === i ? null : i)} onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}>
          <rect className="ch-hit" x={L + i * bw} y={T} width={bw} height={H - T - B} />
          {h > 0 && <path className={`ch-bar ${r.day === today ? 'today' : ''} ${tip === i ? 'on' : ''}`} d={`M${x} ${H - B} V${top + Math.min(4, h)} Q${x} ${top} ${x + Math.min(4, w / 2)} ${top} H${x + w - Math.min(4, w / 2)} Q${x + w} ${top} ${x + w} ${top + Math.min(4, h)} V${H - B}Z`} />}
          {(range === 7 || i % 5 === 4 || r.day === today) && <text className={`ch-axis ${r.day === today ? 'today' : ''}`} x={r.day === today ? W : x + w / 2} y={H - 6} textAnchor={r.day === today ? 'end' : 'middle'}>{r.day === today ? 'hoy' : range === 7 ? ['D', 'L', 'M', 'X', 'J', 'V', 'S'][new Date(`${r.day}T12:00:00`).getDay()] : String(Number(r.day.slice(8)))}</text>}
        </g>
      })}
      <line className="ch-base" x1={L} x2={W} y1={H - B} y2={H - B} />
    </svg>
    <details className="d-chart-table"><summary>Ver como tabla</summary>
      <table><thead><tr><th>Día</th><th>Cumplido</th><th>XP</th></tr></thead><tbody>{[...rows].reverse().map(r => <tr key={r.day}><td>{fmtDay(r.day)}</td><td>{Math.round(r.pct * 100)}%</td><td>{r.xp}</td></tr>)}</tbody></table>
    </details>
  </div>
}

export function JardinPage({ data }: { data: AppData }) {
  const today = dateKey()
  const [picked, setPicked] = useState(today)
  const stats = useMemo(() => gardenStats(data, today), [data, today])
  const xp = useMemo(() => totalXp(data, today), [data, today])
  const lv = levelOf(xp)
  const sel = dayScore(data, picked)
  const wake = wakeOn(data, picked)
  const habits = activeHabits(data.settings)
  const pct = (n: number) => `${Math.round(n * 100)}%`
  return <section className="d-page d-garden-page">
    <h1 className="d-title">Tu jardín</h1>

    <div className="d-card d-scene-card">
      <Garden data={data} today={today} started={stats.started} picked={picked} onPick={setPicked} />
      <div className="d-scene-day">
        <svg className="plant" viewBox="0 0 40 48" width="46" height="55" aria-hidden="true"><PlantShape level={stage(sel.pct)} /></svg>
        <div>
          <b>{fmtDay(picked)} · {STAGE_NAME[stage(sel.pct)]}</b>
          <span>{pct(sel.pct)} cumplido · +{xpOn(data, picked)} XP{sel.trained !== null ? ` · rutina ${pct(sel.trained)}` : ''}{wake ? ` · despertaste ${wake}` : ''}</span>
        </div>
      </div>
      <div className="garden-legend">{STAGE_NAME.map((n, i) => <span key={n}><Plant level={i} size={18} />{n}</span>)}</div>
    </div>

    <h2 className="d-section">Estadísticas</h2>
    <div className="d-stat-grid">
      <div className="d-statcard"><DuoIcon name="fuego" size={32} off={stats.current === 0} /><div><b>{stats.current}</b><span>Días de racha</span></div></div>
      <div className="d-statcard"><DuoIcon name="rayo" size={32} /><div><b>{xp}</b><span>XP total</span></div></div>
      <div className="d-statcard"><span className={`d-lvl t${rankOf(lv.level).rank.tier}`}>{lv.level}</span><div><b>{rankOf(lv.level).rank.name}</b><span>Nivel {lv.level} · faltan {lv.need - lv.into} XP</span></div></div>
      <div className="d-statcard"><DuoIcon name="check" size={32} /><div><b>{stats.perfect}</b><span>Días al 100</span></div></div>
    </div>
    <div className={`d-freeze ${stats.freezeWeek ? 'used' : ''}`}><DuoIcon name="escudo" size={30} /><span><b>{stats.freezeWeek ? 'Comodín usado esta semana' : 'Comodín disponible'}</b><small>{stats.freezeWeek ? `Salvó tu racha ${['hoy', 'ayer'].includes(fmtDay(stats.freezeWeek)) ? fmtDay(stats.freezeWeek) : `el ${fmtDay(stats.freezeWeek)}`}. Vuelve el lunes.` : 'Un día flojo no rompe tu racha. Uno por semana.'}</small></span></div>
    <div className="d-twin"><span>Mejor racha <b>{stats.best}</b></span><span>Semana <b>{pct(stats.week)}</b></span><span>Mes <b>{pct(stats.month)}</b></span></div>

    <SemanaCard data={data} today={today} />

    {habits.length > 0 && <>
      <h2 className="d-section">Tus objetivos</h2>
      <div className="d-card freq">{habits.map(h => {
        const f = habitFrequency(data, h, today)
        return <div className="freq-row" key={h.id}>
          <div className="freq-top"><b>{h.label}</b><span>{pct(f.pct)}</span></div>
          <div className="freq-dots">{f.marks.map((m, i) => <i key={i} className={m ? 'on' : ''} />)}</div>
        </div>
      })}<p className="d-hint left">Últimos 28 días</p></div>
    </>}

    <Progress data={data} today={today} />

    <BodyCard data={data} />
  </section>
}
