import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { dateKey, type AppData } from './lib/model'
import { adventure, attack, damage, dodgeChance, MONSTERS, rollDodge, type Monster, type Scene } from './lib/aventura'
import { season, seasonAttack, SEASON_DODGE } from './lib/temporada'
import { clearedDays, clearRoom, dungeonOf, DUNGEON_XP, ROOMS } from './lib/mazmorra'
import { album } from './lib/album'
import { AlbumSheet, CardMini } from './Album'
import { TablasSheet } from './Tablas'
import { weeklyBoss } from './lib/jefe'
import { BossSheet } from './Jefe'
import { BotonCamara, CamaraValor } from './Candado'
import { esCamara } from './lib/conteo'
import { exerciseList, norm, records, type Exercise } from './lib/libre'
import { celebrate, rewardSound, useWakeLock } from './ui'
import { haptic } from './lib/haptic'
import { DuoIcon } from './DuoIcons'

type Commit = (update: (d: AppData) => AppData) => void
const WAVE = [0, 1.3, 0, -1.3]

function Extra({ m }: { m: Monster }) {
  switch (m.extra) {
    case 'gorro': return <g><path className="mo-acc" d="M27 27 Q32 4 62 4 Q80 6 86 22 Q74 16 70 26 Q50 16 27 27Z" /><circle className="mo-acc2" cx="87" cy="23" r="6" /></g>
    case 'antenas': return <g><path className="mo-ant" d="M40 21 L30 4 M60 21 L70 4" /><circle className="mo-acc2" cx="30" cy="4" r="5" /><circle className="mo-acc2" cx="70" cy="4" r="5" /></g>
    case 'corona': return <path className="mo-acc2 mo-round" d="M30 23 L33 5 L42 14 L50 2 L58 14 L67 5 L70 23Z" />
    case 'sombrero': return <g><path className="mo-hat" d="M36 22 L58 -10 L64 22Z" /><ellipse className="mo-hat" cx="50" cy="22" rx="30" ry="5.5" /><path className="mo-acc2" d="M38 18 L63 18 L64 22 L36 22Z" /></g>
    case 'zzz': return <g className="mo-zzz"><path d="M76 10h9l-9 10h9" /><path d="M89 -4h6l-6 7h6" /></g>
    default: return null
  }
}

export function MonsterArt({ m, size = 120, beaten = false, hit = false, dodge = false, shadow = false }: { m: Monster; size?: number; beaten?: boolean; hit?: boolean; dodge?: boolean; shadow?: boolean }) {
  const eyes = m.eyes === 1 ? [50] : m.eyes === 2 ? [38, 62] : [30, 50, 70]
  return <svg className={`monster ${m.color} ${beaten ? 'beaten' : ''} ${hit ? 'hit' : ''} ${dodge ? 'dodge' : ''} ${shadow ? 'shadow' : ''}`} viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
    {m.extra === 'alas' && <g className="mo-wing"><ellipse cx="14" cy="22" rx="18" ry="10" transform="rotate(-38 14 22)" /><ellipse cx="86" cy="22" rx="18" ry="10" transform="rotate(38 86 22)" /></g>}
    {m.extra === 'dragon' && <g className="mo-bat"><path d="M30 34 C20 14 6 8 -4 12 C4 18 4 24 -2 30 C6 29 10 33 10 40 C14 36 20 36 24 42Z" /><path d="M70 34 C80 14 94 8 104 12 C96 18 96 24 102 30 C94 29 90 33 90 40 C86 36 80 36 76 42Z" /></g>}
    {Array.from({ length: m.horns }, (_, i) => { const x = m.horns === 1 ? 50 : 30 + i * (40 / (m.horns - 1)); return <path key={i} className="mo-horn" d={`M${x - 6} 26 L${x} 6 L${x + 6} 26Z`} /> })}
    <path className="mo-arm" d="M14 58 C4 52 4 40 10 36 M86 58 C96 52 96 40 90 36" />
    <path className="mo-body" d="M50 18 C78 18 90 38 90 60 C90 82 74 94 50 94 C26 94 10 82 10 60 C10 38 22 18 50 18Z" />
    {!shadow && <>
      <ellipse className="mo-belly" cx="50" cy="70" rx="24" ry="17" />
      {eyes.map(x => beaten
        ? <path key={x} className="mo-x" d={`M${x - 6} 38 L${x + 6} 50 M${x + 6} 38 L${x - 6} 50`} />
        : <g key={x}><circle className="mo-eye" cx={x} cy="44" r="8.5" /><circle className="mo-pupil" cx={x + 1.5} cy="45.5" r="4" /></g>)}
      {beaten ? <path className="mo-mouth" d="M38 70 Q50 64 62 70" /> : <><path className="mo-mouth" d="M34 64 Q50 78 66 64Z" /><path className="mo-tooth" d="M42 64 l3 5 l3 -5Z M52 64 l3 5 l3 -5Z" /></>}
    </>}
    {shadow && <text className="mo-q" x="50" y="68" textAnchor="middle">?</text>}
    <ellipse className="mo-foot" cx="34" cy="94" rx="9" ry="4" /><ellipse className="mo-foot" cx="66" cy="94" rx="9" ry="4" />
    {!shadow && <Extra m={m} />}
  </svg>
}

const STARS = [[30, 22], [72, 40], [120, 16], [168, 34], [214, 12], [262, 30], [318, 20], [340, 48], [96, 52], [190, 58]]
function SceneArt({ scene }: { scene: Scene }) {
  return <svg className="arena-art" viewBox="0 0 360 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    {scene === 'noche' && <>
      {STARS.map(([x, y], i) => <circle key={i} className="sc-star" cx={x} cy={y} r={i % 3 ? 1.4 : 2.2} />)}
      <circle className="sc-moon" cx="300" cy="44" r="20" /><circle className="sc-sky-cut" cx="310" cy="38" r="17" />
      <path className="sc-far" d="M0 150 Q60 112 120 140 T240 132 T360 140 V200 H0Z" />
      <path className="sc-near" d="M0 170 Q90 140 180 166 T360 160 V200 H0Z" />
    </>}
    {scene === 'ciudad' && <>
      {STARS.slice(0, 6).map(([x, y], i) => <circle key={i} className="sc-star" cx={x} cy={y} r="1.3" />)}
      {[[0, 96, 44], [48, 70, 38], [90, 110, 30], [124, 58, 46], [174, 92, 34], [212, 66, 42], [258, 104, 30], [292, 78, 40], [334, 100, 26]].map(([x, y, w]) => <rect key={x} className="sc-far" x={x} y={y} width={w} height={200 - y} rx="3" />)}
      {[[12, 112], [24, 130], [60, 90], [60, 118], [136, 80], [150, 104], [186, 110], [224, 88], [238, 116], [304, 96], [304, 124]].map(([x, y]) => <rect key={`${x}-${y}`} className="sc-window" x={x} y={y} width="7" height="9" rx="1.5" />)}
      <rect className="sc-near" x="0" y="168" width="360" height="32" />
    </>}
    {scene === 'pantalla' && <>
      {[40, 80, 120, 160].map(y => <path key={y} className="sc-grid" d={`M0 ${y} H360`} />)}
      {[45, 90, 135, 180, 225, 270, 315].map(x => <path key={x} className="sc-grid" d={`M${x} 0 V200`} />)}
      {[[34, 30], [290, 24], [318, 84], [58, 96], [250, 120]].map(([x, y], i) => <rect key={i} className="sc-app" x={x} y={y} width="22" height="22" rx="6" />)}
      <path className="sc-near" d="M0 168 H360 V200 H0Z" />
    </>}
    {scene === 'bosque' && <>
      {[[10, 120], [44, 100], [80, 128], [262, 104], [300, 122], [334, 96]].map(([x, y]) => <path key={x} className="sc-far" d={`M${x} ${y} L${x + 26} 200 H${x - 26}Z`} />)}
      {[[24, 64], [92, 40], [276, 52], [330, 70], [150, 30], [214, 46]].map(([x, y], i) => <circle key={i} className="sc-fly" cx={x} cy={y} r="2.4" />)}
      <path className="sc-near" d="M0 170 Q90 156 180 168 T360 164 V200 H0Z" />
    </>}
    {scene === 'volcan' && <>
      <path className="sc-far" d="M0 140 L70 90 L104 96 L160 150 L230 150 L270 70 L300 74 L360 132 V200 H0Z" />
      <path className="sc-lava" d="M270 70 L300 74 L294 96 L280 88 L274 104Z" />
      {[[284, 46], [296, 30], [276, 24], [60, 60], [320, 54]].map(([x, y], i) => <circle key={i} className="sc-ember" cx={x} cy={y} r={i % 2 ? 2 : 3} />)}
      <path className="sc-near" d="M0 168 Q100 156 200 170 T360 166 V200 H0Z" />
    </>}
    {scene === 'tormenta' && <>
      <path className="sc-cloud" d="M-10 40 Q20 10 60 28 Q90 4 130 26 Q160 12 180 36 H-10Z" />
      <path className="sc-cloud" d="M190 30 Q220 2 262 22 Q300 0 330 24 Q356 16 380 34 H190Z" />
      <path className="sc-bolt" d="M92 34 L78 70 H92 L80 104 L110 58 H96 L108 34Z" />
      <path className="sc-far" d="M0 150 L50 118 L96 140 L150 110 L210 140 L262 112 L318 136 L360 122 V200 H0Z" />
      <path className="sc-near" d="M0 170 H360 V200 H0Z" />
    </>}
    {scene === 'nieve' && <>
      {STARS.map(([x, y], i) => <circle key={i} className="sc-snow" cx={x} cy={y + 20} r={i % 2 ? 2 : 3} />)}
      {[[40, 112], [300, 104], [334, 124]].map(([x, y]) => <path key={x} className="sc-pine" d={`M${x} ${y} L${x + 18} ${y + 50} H${x - 18}Z`} />)}
      <path className="sc-far" d="M0 150 Q70 120 150 146 T300 136 T360 142 V200 H0Z" />
      <path className="sc-near" d="M0 172 Q100 150 200 170 T360 166 V200 H0Z" />
    </>}
    {scene === 'fiesta' && <>
      <path className="sc-string" d="M0 18 Q90 40 180 18 T360 18" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => { const x = 12 + i * 40, y = 22 + Math.round(Math.sin(i * 0.9) * 6) + (i % 2 ? 6 : 0); return <path key={i} className={`sc-flag f${i % 4}`} d={`M${x} ${y} h26 v26 l-6.5 -5 l-6.5 5 l-6.5 -5 l-6.5 5Z`} /> })}
      {[[40, 150], [80, 160], [290, 154], [320, 162], [60, 164], [300, 166]].map(([x, y], i) => <circle key={i} className="sc-petal" cx={x} cy={y} r="4" />)}
      <path className="sc-near" d="M0 170 H360 V200 H0Z" />
    </>}
    {scene === 'mazmorra' && <>
      {[0, 1, 2, 3, 4].map(r => [0, 1, 2, 3, 4, 5, 6, 7].map(c => <rect key={`${r}-${c}`} className="sc-brick" x={c * 48 - (r % 2 ? 24 : 0)} y={r * 32 + 4} width="44" height="28" rx="3" />))}
      {[70, 290].map(x => <g key={x}><rect className="sc-torch" x={x - 3} y="78" width="6" height="22" rx="2" /><ellipse className="sc-flame" cx={x} cy="70" rx="8" ry="12" /><circle className="sc-glow" cx={x} cy="72" r="28" /></g>)}
      <path className="sc-near" d="M0 168 H360 V200 H0Z" />
    </>}
  </svg>
}

function Arena({ scene, children, tall = false }: { scene: Scene; children: ReactNode; tall?: boolean }) {
  return <div className={`d-arena sc-${scene} ${tall ? 'tall' : ''}`}>
    <SceneArt scene={scene} />
    <span className="d-arena-floor" />
    <div className="d-arena-mon">{children}</div>
  </div>
}

type Hit = { dmg: number; dodged: number; weak: boolean; key: number }
type Strike = (d: AppData, exercise: string, kind: 'reps' | 'seconds', value: number, dodged: number) => AppData

function Fight({ data, commit, m, dealt, eyebrow, dodgeLevel, next, onStrike, onClose }: { data: AppData; commit: Commit; m: Monster; dealt: number; eyebrow: string; dodgeLevel: number; next?: string; onStrike: Strike; onClose: () => void }) {
  useWakeLock(true)
  const list = useMemo(() => exerciseList(data).filter(e => esCamara(e.name, e.kind)), [data])
  const recs = records(data)
  const ordered = useMemo(() => [...list].sort((a, b) => Number(b.group === m.weak) - Number(a.group === m.weak) || (recs.get(b.name)?.last ?? '').localeCompare(recs.get(a.name)?.last ?? '')), [list, m.weak]) // eslint-disable-line react-hooks/exhaustive-deps
  const [q, setQ] = useState('')
  const found = q.trim() ? ordered.filter(e => norm(e.name).includes(norm(q))) : ordered
  const [ex, setEx] = useState<Exercise>(ordered[0])
  const [hit, setHit] = useState<Hit | null>(null)
  const [won, setWon] = useState(false)
  const [cam, setCam] = useState(false)
  const left = Math.max(0, m.hp - dealt)
  const weak = ex.group === m.weak
  const isHold = ex.kind === 'seconds'
  const porUnidad = isHold ? damage({ seconds: 2 }, weak) : damage({ reps: 1 }, weak)

  function choose(e: Exercise) {
    setEx(e)
  }
  function strike(value: number) {
    if (value <= 0) return
    const dmg = isHold ? damage({ seconds: value }, weak) : damage({ reps: value }, weak)
    const dodged = rollDodge(dodgeLevel, dmg)
    commit(d => onStrike(d, ex.name, isHold ? 'seconds' : 'reps', value, dodged))
    setHit({ dmg, dodged, weak, key: Date.now() })
    haptic(dodged ? [10, 60, 10] : weak ? [30, 40, 60] : [20, 30, 20])
    if (dmg - dodged >= left) {
      setWon(true)
      celebrate({ kind: 'achievement', title: `¡Venciste a ${m.name}!`, text: `+${m.xp} XP.${next ? ` Sigue ${next}.` : ''}` })
    }
  }

  const shown = won ? 0 : left
  return <div className="d-runner d-fight" role="dialog" aria-label={`Pelea contra ${m.name}`}>
    <header className="d-run-top">
      <button type="button" className="d-x" onClick={onClose} aria-label="Cerrar">×</button>
      <div className="d-hp-wrap"><div className="d-hp"><span style={{ width: `${shown / m.hp * 100}%` }} /></div><small>{eyebrow} · {shown} / {m.hp} de vida</small></div>
    </header>
    <div className="d-run-body">
      <Arena scene={m.scene} tall>
        <MonsterArt key={hit?.key} m={m} size={140} beaten={won} hit={!!hit && !won && hit.dmg > hit.dodged} dodge={!!hit && !won && hit.dodged > 0} />
        {hit && <span key={`d${hit.key}`} className={`d-dmg ${hit.weak ? 'crit' : ''} ${hit.dodged ? 'miss' : ''}`}>
          {hit.dmg - hit.dodged > 0 ? `-${hit.dmg - hit.dodged}` : '¡Esquivó!'}
          {hit.dodged > 0 && hit.dmg - hit.dodged > 0 && <small>esquivó {hit.dodged}</small>}
        </span>}
      </Arena>
      <div className="d-fight-name">
        <h2>{won ? `¡Venciste a ${m.name}!` : m.name}</h2>
        <p>{won ? `+${m.xp} XP${next ? ` · Te espera ${next}` : ''}` : m.title}</p>
      </div>
      {!won && <>
        <div className="d-fight-tags">
          <span className="gold">Débil a {m.weak.toLowerCase()} ×2</span>
          <span>Esquiva {Math.round(dodgeChance(dodgeLevel) * 100)}%</span>
        </div>
        <div className="d-search"><input className="d-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar ejercicio" aria-label="Buscar ejercicio" />{q && <button type="button" className="d-x small" onClick={() => setQ('')} aria-label="Borrar búsqueda">×</button>}</div>
        <div className="d-chips scroll fight">{found.length ? found.map(e => <button key={e.name} type="button" className={`${ex.name === e.name ? 'on' : ''} ${e.group === m.weak ? 'weak' : ''}`} onClick={() => choose(e)}>{e.name}</button>) : <span className="d-hint">No hay ninguno con ese nombre.</span>}</div>
        <p className="d-fight-ex">{ex.name}{weak ? ' · ¡pega doble!' : ''}</p>
        <p className="d-hint">{isHold ? `Cada 2 segundos le quitas ${porUnidad} de vida.` : `Cada repetición le quita ${porUnidad} de vida.`} Solo cuenta lo que ve la cámara.</p>
      </>}
      {cam && <CamaraValor ej={ex.name} kind={ex.kind} onCerrar={() => setCam(false)} onValor={v => { setCam(false); strike(v) }} />}
    </div>
    <footer className="d-run-foot">
      {won ? <button type="button" className="d-btn green wide" onClick={onClose}>{next ? 'Al mapa' : 'Listo'}</button>
        : <button type="button" className="d-btn red wide" onClick={() => { haptic(10); setCam(true) }}><DuoIcon name="camara" size={26} />¡Atacar con la cámara!</button>}
    </footer>
  </div>
}

function DungeonView({ data, commit, onClose }: { data: AppData; commit: Commit; onClose: () => void }) {
  useWakeLock(true)
  const today = dateKey()
  const dg = dungeonOf(data, today)
  const cleared = clearedDays(data).filter(d => d < today).length
  const [room, setRoom] = useState(Math.max(0, dg.next))
  const r = dg.rooms[room]
  const [cam, setCam] = useState(false)
  const [visto, setVisto] = useState<number | null>(null)
  const value = visto ?? 0
  const ready = value >= r.target

  function goTo(k: number) {
    setVisto(null)
    setRoom(k)
  }
  function done() {
    commit(d => clearRoom(d, today, room, r.name, r.kind, value))
    haptic([15, 30, 15])
    const left = dg.rooms.map((x, k) => k !== room && !x.done ? k : -1).filter(k => k >= 0)
    if (!left.length) { rewardSound(true); celebrate({ kind: 'achievement', title: '¡Mazmorra superada!', text: `+${DUNGEON_XP} XP. Mañana hay otra.` }) }
    else goTo(left[0])
  }

  return <div className="d-runner d-fight" role="dialog" aria-label="Mazmorra del día">
    <header className="d-run-top">
      <button type="button" className="d-x" onClick={onClose} aria-label="Cerrar">×</button>
      <div className="d-hp-wrap"><div className="d-rooms">{dg.rooms.map((x, k) => <span key={k} className={`${x.done ? 'done' : ''} ${k === room && !dg.cleared ? 'now' : ''}`} />)}</div><small>Mazmorra nivel {dg.tier + 1} · {dg.rooms.filter(x => x.done).length} de {ROOMS} salas</small></div>
    </header>
    <div className="d-run-body">
      <Arena scene="mazmorra" tall><span className={`d-chest-big ${dg.cleared ? 'open' : ''}`}><DuoIcon name="cofre" size={110} off={!dg.cleared} /></span></Arena>
      {dg.cleared ? <div className="d-fight-name"><h2>¡Mazmorra superada!</h2><p>+{DUNGEON_XP} XP · Llevas {cleared + 1} en total. Mañana sale otra.</p></div> : <>
        <div className="d-fight-name"><h2>{r.name}</h2><p>Sala {room + 1} de {ROOMS} · meta: {r.target}{r.kind === 'seconds' ? ' s' : ' reps'}</p></div>
        <div className="d-room-grid">{dg.rooms.map((x, k) => <button key={k} type="button" disabled={x.done} className={`${k === room ? 'on' : ''} ${x.done ? 'done' : ''}`} onClick={() => goTo(k)}>{x.done ? <DuoIcon name="check" size={18} /> : <em>{k + 1}</em>}<span><b>{x.target}{x.kind === 'seconds' ? ' s' : ''}</b> {x.name}</span></button>)}</div>
        <div className={`d-dial ${value >= r.target ? 'green' : 'blue'} small`}><strong>{value}</strong><small>de {r.target}{r.kind === 'seconds' ? ' s' : ''}</small></div>
        <p className="d-hint">Solo cuenta lo que ve la cámara.</p>
        <BotonCamara ej={r.name} kind={r.kind} onClick={() => setCam(true)} />
        {cam && <CamaraValor ej={r.name} kind={r.kind} onCerrar={() => setCam(false)} onValor={v => { setCam(false); setVisto(v) }} />}
      </>}
    </div>
    <footer className="d-run-foot">
      {dg.cleared ? <button type="button" className="d-btn green wide" onClick={onClose}>Listo</button>
        : <button type="button" className="d-btn green wide" disabled={!ready} onClick={done}>{ready ? `¡Hecho! ${value}${r.kind === 'seconds' ? ' s' : ''}` : `Meta: ${r.target}${r.kind === 'seconds' ? ' s' : ''} con la cámara`}</button>}
    </footer>
  </div>
}

function SeasonView({ data, commit, onClose }: { data: AppData; commit: Commit; onClose: () => void }) {
  const today = dateKey()
  const st = season(data, today)
  const [fight, setFight] = useState<number | null>(null)
  const now = st.battles[st.current]
  return <div className="d-runner d-full" role="dialog" aria-label={`Temporada ${st.name}`}>
    <header className="d-run-top">
      <button type="button" className="d-x" onClick={onClose} aria-label="Cerrar">×</button>
      <div className="d-hp-wrap"><b className="d-season-name">Temporada: {st.name}</b><small>{st.month} {st.year} · quedan {st.daysLeft} {st.daysLeft === 1 ? 'día' : 'días'}</small></div>
    </header>
    <div className="d-run-body">
      {now ? <div className="d-boss">
        <Arena scene={st.scene}><MonsterArt m={now.monster} size={112} /></Arena>
        <div className="d-boss-info">
          <p className="d-eyebrow red">{st.current === 3 ? 'Jefe de temporada' : `Monstruo ${st.current + 1} de 4`}</p>
          <h2>{now.monster.name}</h2>
          <span className="d-boss-title">{now.monster.title}</span>
          <div className="d-hp"><span style={{ width: `${(now.monster.hp - now.dealt) / now.monster.hp * 100}%` }} /></div>
          <div className="d-fight-tags left"><span>{now.monster.hp - now.dealt} de {now.monster.hp} de vida</span><span className="gold">Débil a {now.monster.weak.toLowerCase()}</span><span>+{now.monster.xp} XP</span></div>
          <button type="button" className="d-btn red wide" onClick={() => setFight(st.current)}>¡Pelear!</button>
        </div>
      </div> : <div className="d-hero gold"><div className="d-hero-text"><p>Temporada completa</p><h1>¡Insignia ganada!</h1><span>Ya está en tu álbum. El próximo mes salen monstruos nuevos.</span></div><DuoIcon name="escudo" size={56} /></div>}
      <div className="d-season-row">{st.battles.map((b, k) => {
        const s = b.defeatedDay ? 'done' : k === st.current ? 'now' : 'locked'
        return <div key={k} className={`d-season-mon ${s}`}><MonsterArt m={b.monster} size={46} beaten={s === 'done'} shadow={s === 'locked'} /><small>{s === 'locked' ? '???' : b.monster.name}</small></div>
      })}<div className={`d-season-mon badge ${st.done ? 'done' : 'locked'}`}><DuoIcon name="escudo" size={38} off={!st.done} /><small>Insignia</small></div></div>
      <p className="d-hint left">Los monstruos de temporada solo están este mes. Si los vences a todos te llevas la insignia legendaria para tu álbum.</p>
    </div>
    {fight !== null && <Fight data={data} commit={commit} m={st.battles[fight].monster} dealt={st.battles[fight].dealt} eyebrow={st.name} dodgeLevel={SEASON_DODGE[fight]} next={st.battles[fight + 1]?.monster.name} onStrike={(d, e, k, v, dg) => seasonAttack(d, today, fight, e, k, v, Date.now(), dg)} onClose={() => setFight(null)} />}
  </div>
}

export function AventuraCard({ data, commit, onAbrir }: { data: AppData; commit: Commit; onAbrir: () => void }) {
  const today = dateKey()
  const { battles, current } = adventure(data)
  const [fight, setFight] = useState(false)
  const now = battles[current]
  if (!now) return <button type="button" className="d-adv-mini done" onClick={onAbrir}>
    <span className="d-adv-mini-info"><small className="d-eyebrow">Aventura completa</small><b>¡Eres leyenda!</b><small>Jefe de la semana, mazmorra y álbum</small></span><span className="d-go">›</span>
  </button>
  return <div className="d-adv-mini">
    <span className={`d-week-art sc-${now.monster.scene}`}><SceneArt scene={now.monster.scene} /><MonsterArt m={now.monster} size={70} /></span>
    <span className="d-adv-mini-info">
      <small className="d-eyebrow">Aventura · monstruo {current + 1} de {MONSTERS.length}</small>
      <b>{now.monster.name}</b>
      <span className="d-hp"><span style={{ width: `${(now.monster.hp - now.dealt) / now.monster.hp * 100}%` }} /></span>
      <small>{now.monster.hp - now.dealt} de vida · débil a {now.monster.weak.toLowerCase()}</small>
      <span className="d-adv-mini-btns"><button type="button" className="d-btn red small" onClick={() => setFight(true)}>¡Pelear!</button><button type="button" className="d-link" onClick={onAbrir}>Ver todo ›</button></span>
    </span>
    {fight && <Fight data={data} commit={commit} m={now.monster} dealt={now.dealt} eyebrow={`Monstruo ${current + 1} de ${MONSTERS.length}`} dodgeLevel={current} next={MONSTERS[current + 1]?.name} onStrike={(d, e, k, v, dg2) => attack(d, today, current, e, k, v, Date.now(), dg2)} onClose={() => setFight(false)} />}
  </div>
}

export function AventuraPage({ data, commit }: { data: AppData; commit: Commit }) {
  const today = dateKey()
  const { battles, current } = adventure(data)
  const [fight, setFight] = useState<number | null>(null)
  const [view, setView] = useState<'mazmorra' | 'temporada' | 'album' | 'jefe' | 'tablas' | null>(null)
  const wb = useMemo(() => weeklyBoss(data, today), [data, today])
  const todayHit = wb.days.find(x => x.day === today)?.total ?? 0
  const beaten = battles.filter(b => b.defeatedDay).length
  const now = battles[current]
  const dg = dungeonOf(data, today)
  const st = season(data, today)
  const cards = useMemo(() => album(data, today), [data, today])
  const got = cards.filter(c => c.earned).length
  return <section className="d-page">
    <button type="button" className={`d-week ${wb.defeatedDay ? 'won' : ''}`} onClick={() => setView('jefe')}>
      <span className={`d-week-art sc-${wb.monster.scene}`}><SceneArt scene={wb.monster.scene} /><MonsterArt m={wb.monster} size={70} beaten={!!wb.defeatedDay} /></span>
      <span className="d-week-info">
        <small className="d-eyebrow red">Jefe de la semana · {wb.defeatedDay ? '¡vencido!' : `quedan ${wb.daysLeft} ${wb.daysLeft === 1 ? 'día' : 'días'}`}</small>
        <b>{wb.monster.name}</b>
        <span className="d-hp"><span style={{ width: `${(wb.monster.hp - wb.dealt) / wb.monster.hp * 100}%` }} /></span>
        <small>{wb.defeatedDay ? `+100 XP ganados` : `${wb.monster.hp - wb.dealt} de vida · hoy le quitaste ${todayHit}`}</small>
      </span>
      <span className="d-go">›</span>
    </button>
    {now ? <div className="d-boss">
      <Arena scene={now.monster.scene}><MonsterArt m={now.monster} size={118} /></Arena>
      <div className="d-boss-info">
        <p className="d-eyebrow red">Monstruo {current + 1} de {MONSTERS.length}</p>
        <h2>{now.monster.name}</h2>
        <span className="d-boss-title">{now.monster.title}</span>
        <div className="d-hp"><span style={{ width: `${(now.monster.hp - now.dealt) / now.monster.hp * 100}%` }} /></div>
        <div className="d-fight-tags left"><span>{now.monster.hp - now.dealt} de {now.monster.hp} de vida</span><span className="gold">Débil a {now.monster.weak.toLowerCase()}</span></div>
        <button type="button" className="d-btn red wide" onClick={() => setFight(current)}>¡Pelear!</button>
      </div>
    </div> : <div className="d-hero gold"><div className="d-hero-text"><p>Aventura completa</p><h1>¡Eres leyenda!</h1><span>Venciste a los {MONSTERS.length} monstruos.</span></div><DuoIcon name="estrella" size={56} /></div>}

    <div className="d-quests">
      <button type="button" className={`d-quest dungeon ${dg.cleared ? 'done' : ''}`} onClick={() => setView('mazmorra')}>
        <DuoIcon name="cofre" size={40} off={false} />
        <b>Mazmorra del día</b>
        <small>{dg.cleared ? '¡Superada!' : `${dg.rooms.filter(r => r.done).length} de ${ROOMS} salas · +${DUNGEON_XP} XP`}</small>
        <span className="d-quest-opt">Opcional</span>
      </button>
      <button type="button" className={`d-quest season ${st.done ? 'done' : ''}`} onClick={() => setView('temporada')}>
        <span className={`d-quest-bg sc-${st.scene}`} aria-hidden="true"><SceneArt scene={st.scene} /></span>
        <DuoIcon name="espada" size={40} />
        <b>{st.name}</b>
        <small>{st.done ? '¡Insignia ganada!' : `${st.current} de 4 · quedan ${st.daysLeft} días`}</small>
        <span className="d-quest-opt">Temporada</span>
      </button>
    </div>
    <button type="button" className="d-album-btn" onClick={() => setView('album')}>
      <span className="d-album-fan">{cards.filter(c => c.earned).slice(-3).map(c => <CardMini key={c.id} c={c} />)}{!got && <CardMini c={cards[0]} />}</span>
      <span><b>Álbum de cartas</b><small>{got} de {cards.length} cartas</small></span>
      <span className="d-go">›</span>
    </button>
    <button type="button" className="d-album-btn tablas" onClick={() => setView('tablas')}>
      <span className="d-tb-cup"><DuoIcon name="trofeo" size={38} /></span>
      <span><b>Tablas</b><small>{data.settings.tablas ? `Compites como ${data.settings.tablas.apodo}` : 'Compite tus récords con otras personas'}</small></span>
      <span className="d-go">›</span>
    </button>

    <p className="d-hint left">Cada rep quita 1 de vida y cada 2 s de hold también. Con su debilidad pega doble. A veces esquivan: te tocará hacer unas de más.</p>
    <div className="d-road">{battles.map((b, i) => {
      const s = b.defeatedDay ? 'done' : i === current ? 'now' : 'locked'
      return <div className={`d-step2 ${s}`} key={b.monster.id} style={{ '--x': `${WAVE[i % WAVE.length] * 62}px` } as CSSProperties}>
        <button type="button" className={`d-node2 mon ${s}`} onClick={() => s === 'now' ? setFight(i) : undefined} aria-label={`${b.monster.name}${s === 'done' ? ', vencido' : s === 'locked' ? ', bloqueado' : ''}`}>
          <MonsterArt m={b.monster} size={s === 'now' ? 72 : 62} beaten={s === 'done'} shadow={s === 'locked'} />
        </button>
        <span className="d-step2-label"><b>{s === 'locked' ? '???' : b.monster.name}</b><small>{s === 'done' ? 'Vencido' : s === 'now' ? `${b.monster.hp - b.dealt} de vida` : `${b.monster.hp} de vida`}</small></span>
      </div>
    })}<p className="d-beaten">{beaten} de {MONSTERS.length} vencidos</p></div>
    {fight !== null && <Fight data={data} commit={commit} m={battles[fight].monster} dealt={battles[fight].dealt} eyebrow={`Monstruo ${fight + 1} de ${MONSTERS.length}`} dodgeLevel={fight} next={MONSTERS[fight + 1]?.name} onStrike={(d, e, k, v, dg2) => attack(d, today, fight, e, k, v, Date.now(), dg2)} onClose={() => setFight(null)} />}
    {view === 'mazmorra' && <DungeonView data={data} commit={commit} onClose={() => setView(null)} />}
    {view === 'temporada' && <SeasonView data={data} commit={commit} onClose={() => setView(null)} />}
    {view === 'album' && <AlbumSheet cards={cards} onClose={() => setView(null)} />}
    {view === 'jefe' && <BossSheet wb={wb} onClose={() => setView(null)} />}
    {view === 'tablas' && <TablasSheet data={data} commit={commit} onClose={() => setView(null)} />}
  </section>
}
