import { BibleReader, TravelCard } from './BibleReader'
import { useMemo, useState } from 'react'
import { dateKey, makeId, modulesOf, type AppData, type BibleMark, type Reading, type Work } from './lib/model'
import { finishReading, pauseReading, readingSeconds, type ActiveReading } from './lib/readingSession'
import { CANON, ETAPAS, TOTAL_CHAPTERS, addChapterMarks, book, bibleProgress, describeRanges, etapaDe, nextChapters, toRanges } from './lib/bible'
import { backfillDays, streak, realReading } from './lib/progress'
import { BinauralAudio } from './BinauralAudio'
import { Card, Chips, Empty, Heading, Stepper, Tabs, fmtDay, mmss, useNow, useWakeLock } from './ui'
import { freshReading } from './lib/sesionLectura'
import { plural } from './lib/text'

type Commit = (update: (d: AppData) => AppData) => void
type Props = { data: AppData; commit: Commit; onMessage: (text: string, undo?: () => void) => void }
type Tab = 'sesion' | 'biblia' | 'libros' | 'cronica'

/** Lo pone el botón + ("Unos versículos"): Lectura abre directo el lector de la Biblia. */
export const OPEN_BIBLE_KEY = 'bambu.abrirBiblia'
function lastPlace(): { book: number; chapter: number } | null { try { const v = JSON.parse(localStorage.getItem('bambu.biblia.pos') ?? 'null') as { book: number; chapter: number } | null; return v?.book && v.chapter ? v : null } catch { return null } }
function takeOpenBible(): boolean { try { const v = sessionStorage.getItem(OPEN_BIBLE_KEY) === '1'; sessionStorage.removeItem(OPEN_BIBLE_KEY); return v } catch { return false } }

export function ReadingPage(props: Props) {
  const [direct] = useState(takeOpenBible)
  const [tab, setTab] = useState<Tab>(direct && modulesOf(props.data.settings).bible ? 'biblia' : 'sesion')
  const s = useMemo(() => streak(props.data.reading.filter(realReading).map(r => r.day)), [props.data.reading])
  return <>
    <Heading eyebrow="LECTURA" title="Tu rincón de lectura." text="Cinco minutos cuentan. El tiempo real va aparte." aside={<div className="completion"><strong>{s.current}</strong><span>días seguidos · mejor {s.best}</span></div>} />
    <Tabs label="Lectura" value={tab} onChange={setTab} options={[['sesion', props.data.activeReading ? 'Leyendo' : 'Leer'], ...(modulesOf(props.data.settings).bible ? [['biblia', 'Biblia'] as [Tab, string]] : []), ['libros', 'Libros'], ['cronica', 'Crónica']]} />
    {tab === 'sesion' && modulesOf(props.data.settings).bible && !props.data.activeReading && <button type="button" className="verses-quick" onClick={() => { try { sessionStorage.setItem(OPEN_BIBLE_KEY, '1') } catch { /* abre la pestaña igual */ } setTab('biblia') }}>
      <span><strong>¿Leíste solo unos versículos?</strong><small>Ábrelos, tócalos y guarda cuánto tiempo les diste. Con tu nota si quieres.</small></span><i aria-hidden="true">→</i></button>}
    {tab === 'sesion' && <Session {...props} />}
    {tab === 'biblia' && <BibleView {...props} direct={direct} />}
    {tab === 'libros' && <Works {...props} />}
    {tab === 'cronica' && <Chronicle data={props.data} />}
  </>
}


function Session({ data, commit, onMessage }: Props) {
  const bibleOn = modulesOf(data.settings).bible
  const session = data.activeReading
  const now = useNow(!!session && !session.endedAt)
  useWakeLock(!!session && !session.endedAt && !session.pausedAt)
  const [manual, setManual] = useState<string | null>(null)
  const [chapters, setChapters] = useState<string[]>([])
  const [workId, setWorkId] = useState('')
  const [pageTo, setPageTo] = useState(0)
  const order = data.settings.bibleOrder
  const suggestions = nextChapters(data, order, 4)
  const reading = data.works.filter(w => w.status === 'reading')
  function patch(value: Partial<ActiveReading>) { commit(d => ({ ...d, activeReading: d.activeReading ? { ...d.activeReading, ...value } : null })) }
  function save() {
    if (!session?.endedAt) return
    const seconds = readingSeconds(session)
    const marks = chapters.map(id => { const [b, c] = id.split(':').map(Number); return { book: b, chapter: c } })
    const work = data.works.find(w => w.id === workId)
    const title = session.title.trim() || (marks.length ? 'La Biblia' : work?.title ?? '')
    if (!title) { onMessage('Escribe qué leíste.'); return }
    if (!session.takeaway?.trim()) { onMessage('Escribe una idea que te llevas.'); return }
    const ranges = toRanges(marks)
    const row: Reading = { id: session.id, day: session.day, minutes: Math.floor(seconds / 60), seconds, title, note: session.note?.trim() ?? '',
      location: session.location || (ranges.length ? describeRanges(ranges) : ''), takeaway: session.takeaway.trim(), application: session.application, captureMode: 'timer', source: 'bambu',
      ...(ranges.length ? { bible: ranges } : {}), ...(work ? { workId: work.id, ...(pageTo ? { pageTo } : {}) } : {}) }
    commit(d => ({ ...d, activeReading: null, reading: d.reading.some(r => r.id === row.id) ? d.reading.map(r => r.id === row.id ? row : r) : [...d.reading, row],
      bible: addChapterMarks(d.bible, marks, session.day),
      works: work && pageTo ? d.works.map(w => w.id === work.id ? { ...w, currentPage: pageTo, ...(w.totalPages && pageTo >= w.totalPages ? { status: 'done' as const, finishedOn: session.day } : {}) } : w) : d.works }))
    setChapters([])
    onMessage(`Lectura guardada${marks.length ? `: ${describeRanges(ranges)}` : ''}.`)
  }
  if (!session) return <div className="focus-grid">
    <Card tone="accent">
      <span className="eyebrow">ABRE TU LIBRO</span>
      <h2>Un rato para ti.</h2>
      <p>Empieza aquí o acerca el teléfono a tu etiqueta. Al terminar, vuelve a acercarlo.</p>
      {suggestions[0] && <p className="note note-logro">Lo que sigue en tu ruta: <strong>{book(suggestions[0].book).name} {suggestions[0].chapter}</strong> ({etapaDe(suggestions[0].book)?.nombre})</p>}
      <button className="primary-button wide" onClick={() => commit(d => d.activeReading ? d : ({ ...d, activeReading: freshReading() }))}>Empezar lectura <span>↗</span></button>
      <button className="quiet-button" onClick={() => setManual(manual ? null : dateKey())}>Ya leí, registrar a mano</button>
    </Card>
    <DayBand data={data} selected={manual} onPick={day => setManual(manual === day ? null : day)} />
    {manual && <ManualReading key={manual} data={data} commit={commit} day={manual} onSaved={msg => { setManual(null); onMessage(msg) }} />}
    <RecentReadings data={data} />
  </div>
  const seconds = readingSeconds(session, now)
  return <Card tone="accent" className="reading-session">
    <span className="eyebrow">{session.endedAt ? 'CIERRA TU LECTURA' : session.pausedAt ? 'EN PAUSA' : 'LEYENDO'}</span>
    <output className="big-clock">{mmss(seconds)}</output>
    {!session.endedAt ? <>
      <div className="row-actions"><button className="secondary-button" onClick={() => commit(d => ({ ...d, activeReading: d.activeReading ? pauseReading(d.activeReading) : null }))}>{session.pausedAt ? 'Reanudar' : 'Pausar'}</button>
        <button className="primary-button" onClick={() => commit(d => ({ ...d, activeReading: d.activeReading ? finishReading(d.activeReading) : null }))}>Terminar lectura</button></div>
      <BinauralAudio enabled={!session.pausedAt} />
    </> : <>
      {bibleOn && <>
      <label className="field-label">¿Leíste Biblia? Toca los capítulos</label>
      <Chips multiple label="Capítulos" value={chapters} onChange={id => setChapters(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id])} options={suggestions.map(s => [`${s.book}:${s.chapter}`, `${book(s.book).name} ${s.chapter}`] as [string, string])} />
      <ChapterPicker onAdd={id => setChapters(c => c.includes(id) ? c : [...c, id])} />
      </>}
      {chapters.length > 0 && <p className="hint">Vas a marcar: {describeRanges(toRanges(chapters.map(id => { const [b, c] = id.split(':').map(Number); return { book: b, chapter: c } })))}</p>}
      {reading.length > 0 && <><label className="field-label">¿O un libro?</label><Chips label="Libro" value={workId} onChange={v => setWorkId(workId === v ? '' : v)} options={reading.map(w => [w.id, w.title] as [string, string])} />
        {workId && <><label className="field-label">¿En qué página quedaste?</label><Stepper label="página" value={pageTo || (data.works.find(w => w.id === workId)?.currentPage ?? 1)} onChange={setPageTo} min={1} max={20000} /></>}</>}
      <label className="field-label">Título <span>opcional si marcaste capítulos o libro</span><input className="text-input" value={session.title} maxLength={300} onChange={e => patch({ title: e.target.value })} /></label>
      <label className="field-label">Una idea que te llevas<textarea className="text-input" value={session.takeaway ?? ''} maxLength={2000} onChange={e => patch({ takeaway: e.target.value })} /></label>
      <label className="field-label">¿Cómo la aplicas? <span>opcional</span><textarea className="text-input" value={session.application ?? ''} maxLength={1000} onChange={e => patch({ application: e.target.value })} /></label>
      <button className="primary-button wide" onClick={save}>Guardar lectura</button>
      <button className="quiet-button" onClick={() => commit(d => ({ ...d, activeReading: d.activeReading ? { ...d.activeReading, endedAt: undefined } : null }))}>Seguir leyendo</button>
    </>}
    <button className="quiet-button" onClick={() => { if (window.confirm('¿Descartar esta lectura sin guardarla?')) commit(d => ({ ...d, activeReading: null })) }}>Descartar</button>
  </Card>
}

function ChapterPicker({ onAdd }: { onAdd: (id: string) => void }) {
  const [bookId, setBookId] = useState(43)
  const [chapter, setChapter] = useState(1)
  return <div className="chapter-picker"><select className="text-input" value={bookId} onChange={e => { setBookId(Number(e.target.value)); setChapter(1) }} aria-label="Libro">{CANON.map(id => book(id)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
    <select className="text-input narrow" value={chapter} onChange={e => setChapter(Number(e.target.value))} aria-label="Capítulo">{Array.from({ length: book(bookId).chapters }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
    <button type="button" className="secondary-button" onClick={() => onAdd(`${bookId}:${chapter}`)}>Añadir</button></div>
}

/**
 * Los últimos 14 días, como la banda de Códice: lleno si leíste, vacío si no. Tocar un día abre
 * el registro con ESA fecha, para que la racha diga cuándo leíste y no cuándo te acordaste.
 */
function DayBand({ data, selected, onPick }: { data: AppData; selected: string | null; onPick: (day: string) => void }) {
  const days = useMemo(() => backfillDays(data), [data])
  const missing = days.filter(d => !d.read && !d.isToday).length
  return <Card className="day-band-card">
    <div className="section-heading"><div><span className="eyebrow">TUS ÚLTIMOS 14 DÍAS</span><h2>{missing ? `${missing} ${missing === 1 ? 'día' : 'días'} en blanco` : 'Sin huecos'}</h2></div></div>
    <p className="hint">¿Leíste y se te olvidó anotarlo? Toca el día y regístralo con su fecha.</p>
    <div className="day-band" role="group" aria-label="Últimos 14 días de lectura">{days.map(d => {
      const n = new Date(`${d.day}T12:00:00`)
      return <button key={d.day} type="button" className={`band-day ${d.read ? 'read' : ''} ${d.isToday ? 'today' : ''} ${selected === d.day ? 'on' : ''}`} aria-pressed={selected === d.day}
        aria-label={`${fmtDay(d.day)}: ${d.read ? `leíste ${d.minutes} min` : 'sin lectura'}`} onClick={() => onPick(d.day)}>
        <small>{['D', 'L', 'M', 'M', 'J', 'V', 'S'][n.getDay()]}</small><b>{n.getDate()}</b><i aria-hidden="true">{d.read ? '✓' : ''}</i></button>
    })}</div>
  </Card>
}

function ManualReading({ data, commit, day, onSaved }: { data: AppData; commit: Commit; day: string; onSaved: (message: string) => void }) {
  const bibleOn = modulesOf(data.settings).bible
  const already = data.reading.filter(r => r.day === day && realReading(r))
  const [minutes, setMinutes] = useState(15)
  const [chapters, setChapters] = useState<string[]>([])
  const [workId, setWorkId] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [id] = useState(`reading:${makeId()}`)
  const suggestions = nextChapters(data, data.settings.bibleOrder, 4)
  const works = data.works.filter(w => w.status === 'reading')
  const marks = chapters.map(c => { const [b, ch] = c.split(':').map(Number); return { book: b, chapter: ch } })
  const ranges = toRanges(marks)
  const work = data.works.find(w => w.id === workId)
  const finalTitle = title.trim() || (marks.length ? 'La Biblia' : work?.title ?? '')
  function save() {
    if (!finalTitle || day > dateKey()) return
    const row: Reading = { id, day, minutes, title: finalTitle, note: note.trim(), captureMode: 'manual', source: 'bambu',
      ...(ranges.length ? { bible: ranges, location: describeRanges(ranges) } : {}), ...(work ? { workId: work.id } : {}) }
    commit(d => ({ ...d, reading: d.reading.some(r => r.id === id) ? d.reading : [...d.reading, row],
      bible: addChapterMarks(d.bible, marks, day) }))
    onSaved(`Lectura de ${fmtDay(day)} guardada${ranges.length ? `: ${describeRanges(ranges)}` : ''}.`)
  }
  return <Card tone="accent" className="manual">
    <span className="eyebrow">REGISTRAR LECTURA</span>
    <h2>{day === dateKey() ? 'Hoy' : fmtDay(day).replace(/^./, c => c.toUpperCase())}</h2>
    {already.length > 0 && <p className="hint">Ese día ya tiene {already.length === 1 ? 'una lectura' : `${plural(already.length, 'lectura', 'lecturas')}`}. Lo que guardes se suma.</p>}
    <label className="field-label">Minutos, más o menos</label>
    <Chips label="Minutos" value={minutes} onChange={setMinutes} options={[[5, '5'], [10, '10'], [15, '15'], [20, '20'], [30, '30'], [45, '45']]} />
    {bibleOn && <>
    <label className="field-label">¿Leíste Biblia? Toca los capítulos</label>
    <Chips multiple label="Capítulos" value={chapters} onChange={c => setChapters(x => x.includes(c) ? x.filter(y => y !== c) : [...x, c])} options={suggestions.map(sg => [`${sg.book}:${sg.chapter}`, `${book(sg.book).name} ${sg.chapter}`] as [string, string])} />
    <ChapterPicker onAdd={c => setChapters(x => x.includes(c) ? x : [...x, c])} />
    </>}
    {ranges.length > 0 && <p className="hint">Vas a marcar: {describeRanges(ranges)}, con fecha de {fmtDay(day)}.</p>}
    {works.length > 0 && <><label className="field-label">¿O un libro?</label><Chips label="Libro" value={workId} onChange={v => setWorkId(workId === v ? '' : v)} options={works.map(w => [w.id, w.title] as [string, string])} /></>}
    <label className="field-label">Título <span>opcional si marcaste capítulos o libro</span><input className="text-input" value={title} maxLength={300} onChange={e => setTitle(e.target.value)} /></label>
    <label className="field-label">Nota <span>opcional</span><textarea className="text-input" value={note} maxLength={1000} onChange={e => setNote(e.target.value)} /></label>
    <button className="primary-button wide" disabled={!finalTitle || data.reading.some(r => r.id === id)} onClick={save}>Guardar lectura de {fmtDay(day)}</button>
    {!finalTitle && <p className="hint">Marca capítulos, elige un libro o escribe qué leíste.</p>}
  </Card>
}

function RecentReadings({ data }: { data: AppData }) {
  const rows = [...data.reading].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 5)
  return <Card><span className="eyebrow">ÚLTIMAS LECTURAS</span>{rows.length ? rows.map(r => <article key={r.id} className="reading-row"><time dateTime={r.day}>{fmtDay(r.day)}</time><strong>{r.title || 'Lectura'}</strong><small>{[r.bible ? describeRanges(r.bible) : r.location, r.minutes ? `${r.minutes} min${r.estimated ? ' estimados' : ''}` : ''].filter(Boolean).join(' · ')}</small>{(r.takeaway || r.note) && <p>{r.takeaway || r.note}</p>}</article>) : <Empty>Tu primera lectura aparece aquí.</Empty>}</Card>
}

function BibleView({ data, commit, onMessage, direct = false }: Props & { direct?: boolean }) {
  const order = data.settings.bibleOrder
  const p = useMemo(() => bibleProgress(data, order), [data, order])
  const [openBook, setOpenBook] = useState<number | null>(p.next?.book ?? null)
  // Desde "unos versículos": abre en el último lugar donde leíste, o en el siguiente de tu ruta.
  const [reading, setReading] = useState<{ book: number; chapter: number } | null>(() => (direct || takeOpenBible()) ? lastPlace() ?? p.next ?? { book: 43, chapter: 1 } : null)
  const today = dateKey()
  function toggle(bookId: number, chapter: number) {
    const id = `${bookId}:${chapter}`
    const existing = data.bible.find(m => m.id === id)
    if (existing) {
      commit(d => ({ ...d, bible: d.bible.filter(m => m.id !== id) }))
      onMessage(`${book(bookId).name} ${chapter} desmarcado.`, () => commit(d => ({ ...d, bible: [...d.bible, existing] })))
    } else {
      const mark: BibleMark = { id, book: bookId, chapter, day: today, source: 'bambu' }
      commit(d => ({ ...d, bible: [...d.bible, mark] }))
    }
  }
  const groups = order === 'ruta' ? ETAPAS.map(e => ({ name: e.nombre, why: e.porQue, books: e.libros })) : [{ name: 'Antiguo Testamento', why: '', books: CANON.filter(id => book(id).testament === 'AT') }, { name: 'Nuevo Testamento', why: '', books: CANON.filter(id => book(id).testament === 'NT') }]
  if (reading) return <BibleReader data={data} commit={commit} onMessage={onMessage} start={reading} onClose={() => setReading(null)} />
  return <>
    {p.next && <Card className="read-here"><span className="eyebrow">LEER AQUÍ</span><h2>{book(p.next.book).name} {p.next.chapter}</h2>
      <p className="hint">Lees dentro de bambú y al terminar el capítulo se marca solo.</p>
      <button type="button" className="primary-button wide" onClick={() => setReading(p.next)}>Abrir la Biblia <span>↗</span></button></Card>}
    <TravelCard />
    <Card tone="accent"><span className="eyebrow">LA BIBLIA</span><h2>{p.read.toLocaleString('es-MX')} de {TOTAL_CHAPTERS.toLocaleString('es-MX')} capítulos · {p.percent}%</h2>
      <div className="bar"><span style={{ width: `${p.percent}%` }} /></div>
      <p>{p.next ? <>Sigue: <strong>{book(p.next.book).name} {p.next.chapter}</strong>. </> : '¡La terminaste! '}{p.finishOn ? `A tu ritmo de 30 días (${p.perDay30.toFixed(1)} capítulos al día) terminas el ${new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${p.finishOn}T12:00:00`))}.` : 'Lee unos días y te digo cuándo terminas.'}{p.partial ? ` ${plural(p.partial, 'capítulo', 'capítulos')} a medias.` : ''}</p>
      <Chips label="Orden" value={order} onChange={v => commit(d => ({ ...d, settings: { ...d.settings, bibleOrder: v } }))} options={[['ruta', 'Ruta recomendada'], ['canonico', 'Orden de la Biblia']]} /></Card>
    {groups.map(g => <Card key={g.name}><h2>{g.name}</h2>{g.why && <p className="hint">{g.why}</p>}
      <div className="books">{g.books.map(id => {
        const b = book(id), done = p.byBook.get(id)
        const count = done ? [...done.values()].filter(m => !m.verses).length : 0
        return <div key={id} className="book">
          <button className="book-head" onClick={() => setOpenBook(openBook === id ? null : id)} aria-expanded={openBook === id}><strong>{b.name}</strong><small>{count}/{b.chapters}</small><span className="trazo" style={{ ['--pct' as string]: `${count / b.chapters * 100}%` }} /></button>
          {openBook === id && <button type="button" className="quiet-button read-book" onClick={() => setReading({ book: id, chapter: Array.from({ length: b.chapters }, (_, i) => i + 1).find(c => !done?.get(c) || done.get(c)!.verses) ?? 1 })}>Leer {b.name} aquí ↗</button>}
          {openBook === id && <div className="chapters">{Array.from({ length: b.chapters }, (_, i) => { const m = done?.get(i + 1); return <button key={i} className={m ? m.verses ? 'ch partial' : 'ch read' : 'ch'} aria-pressed={!!m} title={m ? `Leído ${fmtDay(m.day)}${m.verses ? ` (versículos ${m.verses})` : ''}` : 'Sin leer'} onClick={() => toggle(id, i + 1)}>{i + 1}</button> })}</div>}
        </div>
      })}</div></Card>)}
    <p className="hint">Tocar un capítulo lo marca como leído hoy. Tocarlo otra vez lo desmarca.</p>
  </>
}

function Works({ data, commit, onMessage }: Props) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [pages, setPages] = useState(200)
  const works = data.works.filter(w => w.title !== 'La Biblia')
  return <>
    <Card><span className="eyebrow">NUEVO LIBRO</span><form onSubmit={e => { e.preventDefault(); if (!title.trim()) return; const w: Work = { id: `work:${makeId()}`, title: title.trim(), ...(author.trim() ? { author: author.trim() } : {}), totalPages: pages, currentPage: 0, status: 'reading', startedOn: dateKey() }; commit(d => ({ ...d, works: [...d.works, w] })); setTitle(''); setAuthor(''); onMessage('Libro agregado. Elígelo al cerrar tu próxima lectura.') }}>
      <label className="field-label">Título<input className="text-input" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} required /></label>
      <label className="field-label">Autor <span>opcional</span><input className="text-input" value={author} maxLength={120} onChange={e => setAuthor(e.target.value)} /></label>
      <label className="field-label">Páginas</label><Stepper label="páginas" value={pages} onChange={setPages} min={1} max={5000} step={10} />
      <button className="primary-button wide">Agregar libro</button></form></Card>
    {works.length ? works.map(w => { const pct = w.totalPages ? Math.round((w.currentPage ?? 0) / w.totalPages * 100) : 0; const minutes = data.reading.filter(r => r.workId === w.id).reduce((s, r) => s + r.minutes, 0); return <Card key={w.id}><div className="section-heading"><div><h2>{w.title}</h2><small>{w.author ?? ''}</small></div><span className="subtle-count">{w.status === 'done' ? 'Terminado' : `${pct}%`}</span></div><div className="bar"><span style={{ width: `${pct}%` }} /></div><p className="hint">Página {w.currentPage ?? 0}{w.totalPages ? ` de ${w.totalPages}` : ''} · {minutes} min leídos</p>
      <div className="row-actions"><button className="quiet-button" onClick={() => commit(d => ({ ...d, works: d.works.map(x => x.id === w.id ? { ...x, status: x.status === 'paused' ? 'reading' : 'paused' } : x) }))}>{w.status === 'paused' ? 'Retomar' : 'Pausar'}</button><button className="quiet-button" onClick={() => commit(d => ({ ...d, works: d.works.map(x => x.id === w.id ? { ...x, status: 'done', finishedOn: dateKey() } : x) }))}>Lo terminé</button></div></Card> }) : <Empty>Agrega el libro que lees ahora.</Empty>}
  </>
}

function Chronicle({ data }: { data: AppData }) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(60)
  const days = useMemo(() => {
    const map = new Map<string, { readings: Reading[]; marks: BibleMark[] }>()
    data.reading.forEach(r => { const e = map.get(r.day) ?? { readings: [], marks: [] }; e.readings.push(r); map.set(r.day, e) })
    data.bible.forEach(m => { const e = map.get(m.day) ?? { readings: [], marks: [] }; e.marks.push(m); map.set(m.day, e) })
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [data.reading, data.bible])
  const q = query.trim().toLowerCase()
  const visible = q ? days.filter(([, e]) => e.readings.some(r => [r.title, r.note, r.takeaway, r.location].join(' ').toLowerCase().includes(q)) || e.marks.some(m => book(m.book).name.toLowerCase().includes(q))) : days
  let month = ''
  return <Card>
    <span className="eyebrow">LA CRÓNICA</span><h2>Cada día que leíste</h2>
    <input className="text-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar libro, nota o idea" aria-label="Buscar en la crónica" />
    {visible.length === 0 && <p className="empty-copy" role="status">{q ? 'No hay lecturas que coincidan. Prueba otro libro o borra la búsqueda.' : 'Tu primera lectura aparecerá aquí cuando la guardes. Empieza en la pestaña Leer.'}</p>}
    <div className="chronicle">{visible.slice(0, limit).map(([day, e]) => {
      const m = day.slice(0, 7)
      const header = m !== month ? (month = m, <h3 key={`m${m}`}>{new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date(`${m}-15T12:00:00`))}</h3>) : null
      const minutes = e.readings.filter(r => !r.estimated).reduce((s, r) => s + r.minutes, 0)
      return [header, <article key={day}><time>{Number(day.slice(8))}</time><div>
        {e.marks.length > 0 && <strong>{describeRanges(toRanges(e.marks))}{e.marks.some(x => x.verses) ? ' (a medias)' : ''}</strong>}
        {e.readings.filter(r => !r.bible || !e.marks.length).map(r => <p key={r.id}>{r.title}{r.location && !r.bible ? `, ${r.location}` : ''}{r.estimated ? ' (estimado)' : ''}</p>)}
        {e.readings.map(r => r.takeaway || r.note).filter(Boolean).map((t, i) => <blockquote key={i}>{t}</blockquote>)}
        {minutes > 0 && <small>{minutes} min</small>}</div></article>]
    })}</div>
    {visible.length > limit && <button className="secondary-button" onClick={() => setLimit(limit + 60)}>Seguir hacia atrás</button>}
  </Card>
}

