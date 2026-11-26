import { useEffect, useMemo, useState } from 'react'
import { esCompetir } from './lib/modo'
import { dateKey, type AppData } from './lib/model'
import { dayScore, gardenStats, GOOD, shiftDay } from './lib/jardin'
import { DAILY_GOAL, levelOf, totalXp, xpOn, XP } from './lib/xp'
import { DuoIcon } from './DuoIcons'
import { useNewCards } from './Album'
import { Sheet } from './Sheet'
import { RANKS, rankOf } from './lib/rangos'
import { celebrate } from './ui'
import type { Section } from './TodayPage'

const LETTER = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export function StatsBar({ data, go }: { data: AppData; go: (s: Section) => void }) {
  const today = dateKey()
  const [sheet, setSheet] = useState<'fire' | 'xp' | null>(null)
  useNewCards(data)
  const stats = useMemo(() => gardenStats(data, today), [data, today])
  const xp = useMemo(() => totalXp(data, today), [data, today])
  const lv = levelOf(xp)
  const { rank, next } = rankOf(lv.level)
  useEffect(() => {
    try {
      const seen = Number(localStorage.getItem('bambu.nivel.visto') ?? 0)
      if (seen && lv.level > seen) {
        const newRank = rankOf(seen).rank.name !== rank.name
        celebrate({ kind: 'level', title: newRank ? `¡Ahora eres ${rank.name}!` : `¡Nivel ${lv.level}!`, text: newRank ? rank.motto : `Sigues como ${rank.name}. Vas por más.`, image: rank.img })
      }
      if (lv.level !== seen) localStorage.setItem('bambu.nivel.visto', String(lv.level))
    } catch { return }
  }, [lv.level]) // eslint-disable-line react-hooks/exhaustive-deps
  const score = dayScore(data, today)
  const lit = score.pct >= GOOD
  const xpToday = xpOn(data, today)
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6))
  return <>
    <div className="d-stats">
      {!esCompetir(data.settings) && <button type="button" className={`d-stat fire ${lit ? '' : 'off'}`} onClick={() => setSheet('fire')} aria-label={`Racha de ${stats.current} días`}>
        <DuoIcon name="fuego" size={30} off={!lit} /><b>{stats.current}</b>
      </button>}
      <button type="button" className="d-stat xp" onClick={() => setSheet('xp')} aria-label={`${xp} XP`}>
        <DuoIcon name="rayo" size={30} /><b>{xp}</b>
      </button>
      <button type="button" className="d-stat lvl" onClick={() => setSheet('xp')} aria-label={`Nivel ${lv.level}`}>
        <span className={`d-lvl t${rank.tier}`}>{lv.level}</span><b className="d-rank-name">{rank.name}</b>
      </button>
    </div>
    {sheet === 'fire' && <Sheet title="Tu racha" onClose={() => setSheet(null)}>
      <div className={`d-streak ${lit ? 'lit' : ''}`}>
        <DuoIcon name="fuego" size={110} off={stats.current === 0 && !lit} />
        <div><b>{stats.current}</b><span>{stats.current === 1 ? 'día de racha' : 'días de racha'}</span></div>
      </div>
      <div className="d-streak-week">{days.map(d => {
        const on = dayScore(data, d).pct >= GOOD
        const shield = stats.frozen.includes(d)
        return <span key={d} className={`${on ? 'on' : ''} ${d === today ? 'today' : ''}`}><DuoIcon name={shield ? 'escudo' : 'fuego'} size={34} off={!on && !shield} /><small>{LETTER[new Date(`${d}T12:00:00`).getDay()]}</small></span>
      })}</div>
      <div className={`d-freeze ${stats.freezeWeek ? 'used' : ''}`}><DuoIcon name="escudo" size={30} /><span><b>{stats.freezeWeek ? 'Comodín usado' : 'Comodín disponible'}</b><small>{stats.freezeWeek ? `Salvó tu racha el ${LONG[new Date(`${stats.freezeWeek}T12:00:00`).getDay()]}. Vuelve el lunes.` : 'Si un día no llegas al 80%, se usa solo y tu racha sigue. Uno por semana.'}</small></span></div>
      <p className="d-sheet-text">{lit ? '¡Hoy ya cuenta! Tu fuego está encendido.' : `Cumple el 80% de tu día para encender el fuego de hoy. Vas en ${Math.round(score.pct * 100)}%.`}</p>
      <p className="d-sheet-text dim">Mejor racha: {stats.best} {stats.best === 1 ? 'día' : 'días'}.</p>
      <button type="button" className="d-btn green wide" onClick={() => { setSheet(null); go('Historial') }}>Ver mi jardín</button>
    </Sheet>}
    {sheet === 'xp' && <Sheet title="Tu rango" tall onClose={() => setSheet(null)}>
      <div className={`d-rank-hero t${rank.tier}`}>
        <img src={rank.img} alt="" width="120" height="120" />
        <div><span>Nivel {lv.level}</span><b>{rank.name}</b><small>{rank.motto}</small></div>
      </div>
      <div className="d-goal-top"><b>{xp} XP en total</b><span>{lv.need - lv.into} XP para el nivel {lv.level + 1}</span></div>
      <div className="d-bar purple thick"><span style={{ width: `${lv.pct * 100}%` }} /></div>
      <div className="d-goal-top"><b>Hoy</b><span>{xpToday} de {DAILY_GOAL} XP</span></div>
      <div className="d-bar gold"><span style={{ width: `${Math.min(100, xpToday / DAILY_GOAL * 100)}%` }} /></div>
      <h3 className="d-sheet-h3">Rangos</h3>
      <ol className="d-ranks">{RANKS.map(r => <li key={r.name} className={`t${r.tier} ${r.name === rank.name ? 'now' : lv.level >= r.from ? 'got' : 'locked'}`}>
        <img src={r.img} alt="" width="44" height="44" />
        <span><b>{r.name}</b><small>{r.name === rank.name ? 'Tu rango' : lv.level >= r.from ? 'Superado' : `Desde el nivel ${r.from}`}</small></span>
      </li>)}</ol>
      {next && <p className="d-sheet-text dim">Siguiente: {next.name} en el nivel {next.from}.</p>}
      <h3 className="d-sheet-h3">Cómo ganas XP</h3>
      <ul className="d-xp-table">
        <li><DuoIcon name="estrella" size={28} /><span>Cada objetivo</span><b>+{XP.habit}</b></li>
        <li><DuoIcon name="lista" size={28} /><span>Cada tarea</span><b>+{XP.task}</b></li>
        <li><DuoIcon name="pesa" size={28} /><span>Cada serie</span><b>+{XP.set}</b></li>
        <li><DuoIcon name="check" size={28} /><span>Rutina completa</span><b>+{XP.routine}</b></li>
        <li><DuoIcon name="fuego" size={28} /><span>Día al 80% o más</span><b>+{XP.goodDay}</b></li>
        <li><DuoIcon name="caminar" size={28} /><span>Caminata, correr o bici</span><b>+10</b></li>
        <li><DuoIcon name="cofre" size={28} /><span>Mazmorra del día</span><b>+40</b></li>
        <li><DuoIcon name="espada" size={28} /><span>Vencer un monstruo</span><b>+20 a +80</b></li>
      </ul>
    </Sheet>}
  </>
}
