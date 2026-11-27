import { useEffect, useRef, useState } from 'react'
import { dateKey, modulesOf, type AppData } from './lib/model'
import { BIBLIA, markBible } from './lib/lectura'
import { TOTAL_CHAPTERS, bibleProgress, book as bookOf, nextChapters } from './lib/bible'
import { ChapterPicker } from './ReadingPage'
import { books, logReading, readingStats, readOn, startReading, stopReading, timerOf } from './lib/lectura'
import { pauseReading, readingSeconds } from './lib/readingSession'
import { XP } from './lib/xp'
import { chime, fmtDay, mmss, useNow, useWakeLock } from './ui'
import { reward } from './juice'
import { haptic } from './lib/haptic'
import { Sheet } from './Sheet'
import { DuoIcon } from './DuoIcons'

type Commit = (update: (d: AppData) => AppData) => void
const MINUTES = [10, 15, 20, 30, 45, 60]
const TIMERS = [10, 20, 30, 45]

type Ch = { book: number; chapter: number }
const chId = (c: Ch) => `${c.book}:${c.chapter}`

/** Capítulos de la Biblia: los que siguen en tu ruta a un toque, cualquier otro con el selector, y versículos si fue solo un pedazo. */
function BiblePick({ data, picked, setPicked, verses, setVerses }: { data: AppData; picked: Ch[]; setPicked: (c: Ch[]) => void; verses: string; setVerses: (v: string) => void }) {
  const next = nextChapters(data, data.settings.bibleOrder, 4)
  const shown = [...next, ...picked.filter(p => !next.some(n => chId(n) === chId(p)))]
  const isOn = (c: Ch) => picked.some(p => chId(p) === chId(c))
  const toggle = (c: Ch) => setPicked(isOn(c) ? picked.filter(p => chId(p) !== chId(c)) : [...picked, c])
  return <div className="d-field">¿Qué capítulos leíste?
    <div className="d-bible-caps">{shown.map(c => <button key={chId(c)} type="button" className={isOn(c) ? 'on' : ''} aria-pressed={isOn(c)} onClick={() => { haptic(8); toggle(c) }}><small>{bookOf(c.book).name}</small><b>{c.chapter}</b>{isOn(c) && <i aria-hidden="true"><DuoIcon name="check" size={18} /></i>}</button>)}</div>
    <details className="d-more"><summary>Otro capítulo</summary><ChapterPicker onAdd={id => { const [b, ch] = id.split(':').map(Number); if (!isOn({ book: b, chapter: ch })) setPicked([...picked, { book: b, chapter: ch }]) }} /></details>
    {picked.length === 1 && <label className="d-field">¿Solo unos versículos? <small>opcional</small><input className="d-input" value={verses} maxLength={60} onChange={e => setVerses(e.target.value)} placeholder="Ej. 1 al 12" /></label>}
  </div>
}

function BibleProgressLine({ data }: { data: AppData }) {
  const p = bibleProgress(data, data.settings.bibleOrder)
  if (!p.read && !p.partial && !modulesOf(data.settings).bible) return null
  const libro = p.next ? bookOf(p.next.book) : null
  const enLibro = libro ? new Set(data.bible.filter(m => m.book === libro.id && !m.verses).map(m => m.chapter)).size : 0
  return <div className="d-bible-progress">
    <h3><DuoIcon name="libro" size={26} />Tu Biblia</h3>
    <div className="d-bible-num"><b>{p.percent}%</b><span>{p.read.toLocaleString('es-MX')} de {TOTAL_CHAPTERS.toLocaleString('es-MX')} capítulos</span></div>
    <div className="d-bible-bar" role="progressbar" aria-label="Avance de la Biblia" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.percent}><i style={{ width: `${Math.max(p.percent, p.read ? 2 : 0)}%` }} /></div>
    {libro && p.next && <div className="d-bible-sigue"><span>Sigue</span><b>{libro.name} {p.next.chapter}</b><small>{enLibro} de {libro.chapters} de {libro.name}</small></div>}
  </div>
}

function BookPick({ data, value, onChange }: { data: AppData; value: string; onChange: (v: string) => void }) {
  const list = books(data).filter(b => b.title !== BIBLIA).slice(0, 4)
  const bible = modulesOf(data.settings).bible || modulesOf(data.settings).reading
  return <div className="d-field">¿Qué libro?
    {(list.length > 0 || bible) && <div className="d-chips">{bible && <button type="button" className={value === BIBLIA ? 'on' : ''} aria-pressed={value === BIBLIA} onClick={() => onChange(value === BIBLIA ? '' : BIBLIA)}>La Biblia</button>}{list.map(b => <button key={b.id} type="button" className={value === b.title ? 'on' : ''} onClick={() => onChange(b.title)}>{b.title}{b.currentPage ? <small> pág. {b.currentPage}</small> : null}</button>)}</div>}
    {value !== BIBLIA && <input className="d-input" value={value} maxLength={200} onChange={e => onChange(e.target.value)} placeholder={list.length ? 'U otro libro' : 'Nombre del libro'} />}
  </div>
}

function Stats({ data }: { data: AppData }) {
  const today = dateKey()
  const s = readingStats(data, today)
  return <div className="d-read-stats">
    <h3>Tus tiempos</h3>
    <div className="d-tiles">
      <div className="d-tile blue"><span>Hoy</span><b>{s.todayMinutes} min</b></div>
      <div className="d-tile green"><span>Semana</span><b>{s.weekMinutes} min</b></div>
      <div className="d-tile gold"><span>Racha</span><b><DuoIcon name="fuego" size={22} />{s.streak}</b></div>
    </div>
    {s.recent.length > 0 && <ul className="d-read-list">{s.recent.map((r, i) => <li key={i}><span>{fmtDay(r.day)}</span><b>{r.book}</b><em>{r.minutes} min</em></li>)}</ul>}
    {s.perBook.length > 0 && <>
      <h3>Por libro</h3>
      <ul className="d-read-list">{s.perBook.map(b => <li key={b.title}><DuoIcon name="libro" size={24} /><b>{b.title}{b.page ? <small> · pág. {b.page}</small> : null}</b><em>{b.minutes} min</em></li>)}</ul>
    </>}
    <BibleProgressLine data={data} />
    {!s.recent.length && <p className="d-hint left">Aquí verás tus minutos, tu racha y cuánto llevas de cada libro.</p>}
  </div>
}

export function ReadSheet({ data, commit, onClose, onMessage, biblia = false }: { data: AppData; commit: Commit; onClose: () => void; onMessage: (t: string) => void; biblia?: boolean }) {
  const today = dateKey()
  const active = data.activeReading
  const [picked, setPicked] = useState<Ch[]>([])
  const [verses, setVerses] = useState('')
  const [step, setStep] = useState<'ask' | 'yes' | 'no' | 'marcar' | 'done'>(biblia ? (data.bible.some(m => m.day === today) ? 'done' : 'yes') : readOn(data, today) ? 'done' : 'ask')
  const [book, setBook] = useState(biblia ? BIBLIA : books(data)[0]?.title ?? '')
  const [minutes, setMinutes] = useState(20)
  const [page, setPage] = useState('')
  const [mode, setMode] = useState<'crono' | 'timer'>('crono')
  const [timerMin, setTimerMin] = useState(20)
  const running = !!active && !active.pausedAt
  useWakeLock(!!active)
  const now = useNow(running, 500)
  const fired = useRef(false)
  const secs = active ? readingSeconds(active, now) : 0
  const timer = timerOf(data)
  const left = timer ? timer * 60 - secs : null

  useEffect(() => {
    if (left !== null && left <= 0 && !fired.current) { fired.current = true; chime() }
  }, [left])

  const isBible = book === BIBLIA
  function saveYes(el: HTMLElement) {
    const p = Number(page)
    if (isBible) commit(d => markBible(logReading(d, today, { minutes, book: BIBLIA, mode: 'manual' }), today, picked, verses))
    else commit(d => logReading(d, today, { minutes, book, pageTo: Number.isInteger(p) && p > 0 ? p : undefined, mode: 'manual' }))
    setPicked([]); setVerses('')
    reward(el, `+${XP.read} XP`)
    onMessage(`Lectura guardada: ${minutes} min${book.trim() ? ` de ${book.trim()}` : ''}.`)
    setStep('done')
  }
  function start() {
    haptic([12, 30, 12])
    fired.current = false
    commit(d => startReading(d, today, book, mode === 'timer' ? timerMin : null))
  }
  function finish(el: HTMLElement) {
    const min = Math.max(1, Math.round(secs / 60))
    if (secs < 30) { commit(d => ({ ...d, activeReading: null })); onMessage('Fue muy corto, no se guardó.'); return }
    const bible = active?.title === BIBLIA
    commit(d => stopReading(d))
    reward(el, `+${XP.read} XP`)
    onMessage(`Lectura guardada: ${min} min.`)
    setStep(bible ? 'marcar' : 'done')
  }

  if (active) return <Sheet title={active.title || 'Leyendo'} tall onClose={onClose}>
    <div className="d-run-body in-sheet">
      <p className="d-eyebrow blue">{timer ? `Timer de ${timer} min` : 'Cronómetro'}{active.pausedAt ? ' · en pausa' : ''}</p>
      <div className={`d-dial blue ${running ? 'live' : ''}`}>
        {timer && <svg className="d-dial-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" className="track" pathLength="100" />{left! < timer * 60 && <circle cx="50" cy="50" r="46" className="fill" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - Math.max(0, left!) / (timer * 60) * 100} />}</svg>}
        <strong className="clock">{left !== null ? (left > 0 ? mmss(left) : '¡Listo!') : mmss(secs)}</strong>
        <small>{left !== null ? (left > 0 ? 'faltan' : `${Math.round(secs / 60)} min leídos`) : 'leyendo'}</small>
      </div>
    </div>
    <div className="d-row2">
      <button type="button" className="d-btn white" onClick={() => commit(d => d.activeReading ? { ...d, activeReading: pauseReading(d.activeReading) } : d)}>{active.pausedAt ? 'Seguir' : 'Pausar'}</button>
      <button type="button" className="d-btn green wide" onClick={e => finish(e.currentTarget)}>Terminar y guardar</button>
    </div>
    <button type="button" className="d-link" onClick={() => { if (window.confirm('¿Cancelar esta lectura sin guardarla?')) commit(d => ({ ...d, activeReading: null })) }}>Cancelar sin guardar</button>
  </Sheet>

  return <Sheet title={biblia ? 'Tu Biblia hoy' : '¿Leíste hoy?'} tall onClose={onClose}>
    {step === 'ask' && <div className="d-ask">
      <button type="button" className="d-big-choice green" onClick={() => setStep('yes')}><DuoIcon name="check" size={44} /><b>Sí, ya leí</b><small>Anota cuánto y qué libro</small></button>
      <button type="button" className="d-big-choice blue" onClick={() => setStep('no')}><DuoIcon name="reloj" size={44} /><b>No, a leer</b><small>Cronómetro o timer</small></button>
    </div>}
    {step === 'yes' && <div className="d-form">
      {!biblia && <BookPick data={data} value={book} onChange={setBook} />}
      {isBible && <BiblePick data={data} picked={picked} setPicked={setPicked} verses={verses} setVerses={setVerses} />}
      <div className="d-field">¿Cuánto tiempo?
        <div className="d-seg wrap6">{MINUTES.map(m => <button key={m} type="button" className={minutes === m ? 'on' : ''} onClick={() => setMinutes(m)}>{m}</button>)}</div>
      </div>
      {!isBible && <label className="d-field">Página a la que llegaste (opcional)<input className="d-input num" type="number" inputMode="numeric" min={1} max={20000} value={page} onChange={e => setPage(e.target.value)} /></label>}
      <div className={biblia ? 'd-row1' : 'd-row2'}>{!biblia && <button type="button" className="d-btn white" onClick={() => setStep('ask')}>Atrás</button>}<button type="button" className="d-btn green wide" disabled={isBible && !picked.length} onClick={e => saveYes(e.currentTarget)}>{biblia ? `Guardar ${picked.length > 1 ? `${picked.length} capítulos` : 'capítulo'}` : 'Guardar'}</button></div>
      {isBible && !picked.length && <p className="d-hint left">Toca al menos un capítulo.</p>}
    </div>}
    {step === 'no' && <div className="d-form">
      <BookPick data={data} value={book} onChange={setBook} />
      <div className="d-choice">
        <button type="button" className={mode === 'crono' ? 'on' : ''} onClick={() => setMode('crono')}><b>Cronómetro</b><small>Cuenta hasta que pares</small></button>
        <button type="button" className={mode === 'timer' ? 'on' : ''} onClick={() => setMode('timer')}><b>Timer</b><small>Suena al terminar</small></button>
      </div>
      {mode === 'timer' && <div className="d-seg">{TIMERS.map(m => <button key={m} type="button" className={timerMin === m ? 'on' : ''} onClick={() => setTimerMin(m)}>{m} min</button>)}</div>}
      <div className="d-row2"><button type="button" className="d-btn white" onClick={() => setStep('ask')}>Atrás</button><button type="button" className="d-btn blue wide" onClick={start}>Empezar a leer</button></div>
    </div>}
    {step === 'marcar' && <div className="d-form">
      <BiblePick data={data} picked={picked} setPicked={setPicked} verses={verses} setVerses={setVerses} />
      <div className="d-row2"><button type="button" className="d-btn white" onClick={() => setStep('done')}>Luego</button><button type="button" className="d-btn green wide" disabled={!picked.length} onClick={() => { commit(d => markBible(d, today, picked, verses)); onMessage('Capítulos marcados.'); setPicked([]); setVerses(''); setStep('done') }}>Marcar capítulos</button></div>
    </div>}
    {step === 'done' && <div className="d-done-line"><DuoIcon name="check" size={26} />{biblia ? '¡Ya leíste tu Biblia hoy!' : '¡Ya leíste hoy! Si leíste más, agrégalo.'}</div>}
    {step === 'done' && <button type="button" className="d-btn white wide" onClick={() => setStep(biblia ? 'yes' : 'ask')}>{biblia ? 'Agregar otro capítulo' : 'Agregar otra lectura'}</button>}
    {biblia ? <BibleProgressLine data={data} /> : <Stats data={data} />}
  </Sheet>
}
