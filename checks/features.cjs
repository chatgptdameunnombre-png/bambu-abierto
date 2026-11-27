// Pruebas de la lógica pura de Bambú. Sin navegador: transpila src/lib y verifica reglas.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const cache = new Map()
const NUBE_PORT = 5699
function moduleOf(name) {
  if (name === 'supabase') return { supabase: null, cloudConfigured: false }
  if (cache.has(name)) return cache.get(name)
  const exports = {}; cache.set(name, exports)
  const source = fs.readFileSync(path.join(__dirname, '../src/lib', name + '.ts'), 'utf8').replace(/import\.meta\.env\.VITE_NUBE_PRUEBA/g, `'http://localhost:${NUBE_PORT}'`)
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'exports', code)(ref => ref.startsWith('.') ? moduleOf(ref.replace('./', '')) : require(ref), exports)
  return exports
}
const { normalizeData, EMPTY_DATA } = moduleOf('model')
const { streak, progress, backfillDays } = moduleOf('progress')
const { readingSeconds, pauseReading, finishReading } = moduleOf('readingSession')
const { diffRecords, applyRecords, toRecords } = moduleOf('records')
const { bibleProgress, describeRanges, toRanges, nextChapters, TOTAL_CHAPTERS, BOOKS } = moduleOf('bible')
const { progression, todayPlan, muscleStates, massPlan, weekSessions, weightTrend, weekPlan } = moduleOf('coach')
const { exercise, EXERCISES, ladder } = moduleOf('exercises')
const { verdict, summarize } = moduleOf('focusStats')
const { parseNfc, nfcUrl } = moduleOf('nfc')
const { game, levelFor, questsFor } = moduleOf('gamification')
const { dueNotes, dueKinds, schedule, bedtime, noteKey } = moduleOf('reminders')
const { cleanReminders } = moduleOf('model')
const { nfcServerAction } = moduleOf('nfcActions')
const { nextStep } = moduleOf('nextStep')
const { broteSays } = moduleOf('brote')
const { talloSays } = moduleOf('tallo')
const { photoSummary } = moduleOf('photoSummary')
const { resolveTheme } = moduleOf('theme')
const { localGuess, buildBlock, snapBlock, sizeToMinutes, askJev, suggestPick } = moduleOf('assist')
const { verdict: dayVerdict, measures, measureStats, compareDay, bandOf } = moduleOf('measure')
const { votesOn, neverTwice, isRescue, rescueRow, dayTime, voteLine } = moduleOf('identity')
const { parseVerses, formatVerses, addVerseMark } = moduleOf('verses')
const { currentForSlot } = moduleOf('coach')
const { stepsOf, totalSeconds, stretchRow, isStretch, stretchStreak, stretchedOn, stretchSlot } = moduleOf('stretch')
const passed = []
const ok = (name) => passed.push(name)

// Rachas y lectura
const today = '2026-11-04'
assert.equal(streak(['2026-11-01', '2026-11-02', '2026-11-03'], today).current, 3)
assert.equal(streak(['2026-11-01', '2026-11-02'], today).current, 0)
assert.equal(streak(['2028-02-28', '2028-02-29', '2028-03-01'], '2028-03-01').current, 3)
const session = { id: 'test', day: today, startedAt: 1000, title: 'Libro', location: '1 a 3' }
const paused = pauseReading(session, 61000)
assert.equal(readingSeconds(paused, 90000), 60)
assert.equal(readingSeconds(finishReading(pauseReading(paused, 121000), 181000), 999000), 120)
const estimates = normalizeData({ ...EMPTY_DATA, reading: [{ id: 'e', day: today, minutes: 20, note: '', estimated: true }] })
assert.equal(progress(estimates, today).reading.current, 0)
const confirmed = normalizeData({ ...EMPTY_DATA, reading: [{ id: 'c1', day: '2026-11-03', minutes: 20, note: '', estimated: true, dayConfirmed: true }, { id: 'c2', day: today, minutes: 20, note: '', estimated: true, dayConfirmed: true }] })
assert.equal(progress(confirmed, today).reading.current, 2)
ok('rachas, pausa de lectura y estimaciones fuera')

// Modelo: un respaldo v2 viejo abre sin perder nada y llena lo nuevo con valores por omisión
const v2 = { version: 2, profile: { name: 'Gael', onboardingComplete: true }, habits: { [today]: ['bible'] }, reading: [{ id: 'r', day: today, minutes: 0, seconds: 30, note: 'Nota', title: 'Libro' }], training: [], focus: [{ id: 'cauce:1', day: today, task: 'Grabar', minutes: 45, result: 'listo', source: 'cauce', status: 'completed' }], activeFocus: null, tasks: [{ id: 't', text: 'Tarea', status: 'pending', minutes: 25, level: 2.3, updatedAt: 1 }] }
const opened = normalizeData(v2)
assert.equal(opened.reading[0].seconds, 30)
assert.equal(opened.focus[0].task, 'Grabar')
assert.equal(opened.settings.footballDays.length, 3)
assert.deepEqual(opened.sets, [])
assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(opened))), opened)
ok('respaldo v2 abre en v3 y el viaje de ida y vuelta no cambia nada')

// Compartir: perfiles nuevos genéricos, respaldo histórico intacto y texto local sin identidad fija.
{
  const generic = normalizeData({})
  assert.equal(generic.settings.weeklyFocusGoal, 0)
  assert.deepEqual(generic.settings.footballDays, [])
  assert.ok(!generic.settings.habits.some(h => h.id === 'prospect'))
  const custom = normalizeData({ ...EMPTY_DATA, settings: { ...EMPTY_DATA.settings, weeklyFocusGoal: 540, footballDays: [1, 2, 4], age: 13 } })
  assert.equal(custom.settings.weeklyFocusGoal, 540)
  assert.deepEqual(custom.settings.footballDays, [1, 2, 4])
  assert.equal(custom.settings.age, 13)
  assert.equal(opened.settings.weeklyFocusGoal, 540)
  assert.ok(opened.settings.habits.some(h => h.id === 'prospect'))
  const time = new Date('2026-11-05T12:00:00').getTime()
  assert.notEqual(todayPlan(generic, time).kind, 'futbol')
  const football = { ...generic, settings: { ...generic.settings, footballDays: [4] } }
  assert.match(todayPlan(football, time).reasons[0].text, /dos sesiones/)
  const localText = JSON.stringify([generic.profile, generic.settings, todayPlan(generic, time), progress(generic), broteSays(generic, time), moduleOf('companion').suggestionsFor('Ajustes', generic, time)])
  assert.doesNotMatch(localText, /Gael|00000000-0000-0000-0000-000000000000|tienes 13|13 años|Prospección|PL21/i)
  // Inspecciona texto y literales de las pantallas, no comentarios ni identificadores.
  for (const file of fs.readdirSync(path.join(__dirname, '../src')).filter(file => file.endsWith('.tsx'))) {
    const source = ts.createSourceFile(file, fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = node => {
      if (ts.isJsxText(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
        assert.doesNotMatch(node.text, /\bGael\b|00000000-0000-0000-0000-000000000000|tienes 13|13 años/i, `Identidad fija en ${file}`)
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  assert.doesNotMatch(moduleOf('reminders').reminderNote('read', generic, time).body, /No la rompas/)
  const disabled = { ...generic, settings: { ...generic.settings, modules: { reading: false, bible: false, training: false, focus: true } } }
  for (const kind of ['read', 'train', 'photos']) assert.equal(moduleOf('reminders').reminderNote(kind, disabled, time), null)
  const tired = { ...generic, settings: { ...generic.settings, sleepTarget: 8 }, activities: [1, 2, 3, 4, 5].map(n => ({ id: String(n), day: moduleOf('coach').shift('2026-11-05', -n), kind: 'football' })) }
  assert.match(todayPlan(tired, time).summary, /8 horas/)
  const { weekPace } = moduleOf('focusStats')
  assert.doesNotMatch(weekPace(0, 0), /atrás|adelante|9 h|de 0/)
  assert.match(weekPace(0, 540, new Date('2026-11-05T12:00:00')), /9 h.*atrás/)
  ok('compartir: defaults genéricos, ajustes históricos intactos y texto local sin identidad fija')
}

// Registros: diff mínimo, borrado como lápida, aplicar reconstruye igual
const base = normalizeData(v2)
const withSet = { ...base, sets: [{ id: 's1', day: today, at: 5, exercise: 'pushup', reps: 12, rir: 1 }] }
let rows = diffRecords(base, withSet, 100)
assert.equal(rows.length, 1)
assert.equal(rows[0].collection, 'set')
const removed = { ...withSet, reading: [] }
rows = diffRecords(withSet, removed, 200)
assert.equal(rows.length, 1)
assert.equal(rows[0].deleted, true)
const habitChange = { ...withSet, habits: { ...withSet.habits, '2026-11-05': ['bible'] } }
rows = diffRecords(withSet, habitChange)
assert.equal(rows.length, 1)
assert.equal(rows[0].collection, 'habit')
const all = toRecords(habitChange)
const rebuilt = applyRecords({ ...EMPTY_DATA }, all)
assert.deepEqual(normalizeData(rebuilt), normalizeData(habitChange))
assert.equal(applyRecords(rebuilt, []), rebuilt)
const tomb = applyRecords(rebuilt, [{ collection: 'set', id: 's1', payload: {}, deleted: true, clientUpdatedAt: 9 }])
assert.equal(tomb.sets.length, 0)
assert.equal(applyRecords(rebuilt, [{ collection: 'set', id: 'x', payload: { day: 'mal' }, deleted: false, clientUpdatedAt: 9 }]).sets.length, 1)
ok('diff por registro, lápidas, reconstrucción exacta y rechazo de basura')

// Biblia
assert.equal(BOOKS.reduce((s, b) => s + b.chapters, 0), TOTAL_CHAPTERS)
const bibleData = { ...EMPTY_DATA, bible: [{ id: '43:1', book: 43, chapter: 1, day: today }, { id: '43:2', book: 43, chapter: 2, day: today }, { id: '43:4', book: 43, chapter: 4, day: today }] }
assert.equal(describeRanges(toRanges(bibleData.bible)), 'Juan 1-2, 4')
assert.deepEqual(nextChapters(bibleData, 'ruta', 2), [{ book: 43, chapter: 3 }, { book: 43, chapter: 5 }])
const bp = bibleProgress(bibleData, 'ruta', today)
assert.equal(bp.read, 3)
assert.ok(bp.finishOn && bp.finishOn > today)
ok('Biblia: 1,189 capítulos, rangos, lo que sigue y proyección')

// Coach: doble progresión
const pushup = exercise('pushup')
const at = (d, h) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime()
const mk = (id, day, reps, h = 17, ex = 'pushup', rir = 1) => ({ id, day, at: at(day, h), exercise: ex, reps, rir })
const fresh = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, footballDays: [1, 2, 4], equipment: ['nada', 'pared', 'silla', 'paralelas', 'mochila', 'libros', 'toalla', 'puerta'] } })
assert.equal(progression(fresh, pushup).verdict, 'nuevo')
const growing = { ...fresh, sets: [mk('a', '2026-11-01', 10), mk('b', '2026-11-01', 9)] }
assert.deepEqual(progression(growing, pushup).target, [11, 10])
const top = { ...fresh, sets: [mk('a', '2026-11-01', 15), mk('b', '2026-11-01', 15)] }
const up = progression(top, pushup)
assert.equal(up.verdict, 'subir')
assert.equal(up.next.id, 'pushup-parallettes')
const drop = { ...fresh, sets: [mk('a', '2026-10-30', 14), mk('b', '2026-10-30', 13), mk('c', '2026-11-01', 8), mk('d', '2026-11-01', 7)] }
assert.equal(progression(drop, pushup).verdict, 'fatiga')
const midSession = { ...growing, sets: [...growing.sets, mk('c', today, 11)] }
assert.deepEqual(progression(midSession, pushup, 2, today).target, [11, 10])
ok('doble progresión: nuevo, +1 por serie, subir de escalón y fatiga')

// Coach: plan del día
const wed = '2026-11-04' // miércoles, sin fútbol por omisión (lun, mar, jue)
const planWed = todayPlan(fresh, at(wed, 16))
assert.equal(planWed.kind, 'torso')
assert.equal(planWed.items.length, 8)
assert.ok(planWed.items.some(i => i.slot === 'cuello_flex'))
assert.equal(todayPlan(fresh, at('2026-11-05', 16)).kind, 'futbol')
const pain = { ...fresh, checkins: [{ id: wed, day: wed, pain: 'pecho' }] }
const painPlan = todayPlan(pain, at(wed, 9))
assert.equal(painPlan.kind, 'dolor')
assert.equal(painPlan.items.length, 0)
const torsoYesterday = { ...fresh, sets: ['pushup', 'row-backpack-1arm', 'pike', 'curl-backpack'].flatMap((e, i) => [mk(`t${i}a`, '2026-11-03', 10, 18, e), mk(`t${i}b`, '2026-11-03', 9, 18, e)]) }
const states = muscleStates(torsoYesterday, at(wed, 9))
assert.equal(states.find(s => s.id === 'pecho').status, 'recuperando')
assert.equal(states.find(s => s.id === 'cuadriceps').status, 'pendiente')
assert.notEqual(todayPlan(torsoYesterday, at(wed, 9)).kind, 'torso')
const football = { ...fresh, activities: [{ id: 'f', day: '2026-11-03', kind: 'football', minutes: 90 }] }
assert.equal(muscleStates(football, at(wed, 9)).find(s => s.id === 'cuadriceps').status, 'recuperando')
assert.equal(weekSessions(torsoYesterday, wed).torso, 1)
ok('plan: torso en día libre, fútbol en día de partido, dolor de pecho para todo, recuperación de 48 h y fútbol carga pierna')

// Coach: masa
const body = { ...fresh, body: [...Array.from({ length: 5 }, (_, i) => ({ id: `w${i}`, day: `2026-10-0${i + 1}`, weightKg: 45 })), ...Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, day: `2026-11-0${i}`.replace('-0', '-0'), weightKg: 45.1 })).filter(b => /^\d{4}-\d{2}-\d{2}$/.test(b.day))] }
const mass = massPlan(normalizeData(body), today)
assert.equal(mass.proteinGrams, 72)
assert.equal(mass.status, 'lento')
ok('masa: proteína 1.6 g/kg y promedio estancado pide comer más')

// Catálogo
assert.ok(EXERCISES.every(e => e.range[0] < e.range[1] && e.cues.length > 0))
assert.ok(ladder('empuje').map(e => e.id).includes('pushup-parallettes'))
assert.equal(new Set(EXERCISES.map(e => e.id)).size, EXERCISES.length)
ok('catálogo: rangos válidos, técnica escrita, ids únicos')

// Enfoque
const week = summarize([{ id: '1', day: '2026-11-02', task: 'x', minutes: 300, result: '', level: 4 }, { id: '2', day: '2026-11-03', task: 'y', minutes: 240, result: '', level: 2 }], '2026-11-02')
assert.equal(week.minutes, 540)
assert.equal(week.highLeverage, 56)
assert.equal(verdict(week, 540, null, 7).signals[0].light, 'verde')
assert.equal(verdict(summarize([], '2026-11-02'), 540, null).title, 'Semana sin bloques')
ok('enfoque: semana, aguja N3-N4 y veredicto')

// NFC
assert.deepEqual(parseNfc('?nfc=reading'), { tag: 'reading' })
assert.deepEqual(parseNfc('?quick=read'), { tag: 'reading' })
assert.deepEqual(parseNfc('?nfc=habit&h=bed'), { tag: 'habit', habit: 'bed' })
assert.equal(parseNfc('?nfc=borrar-todo'), null)
assert.equal(nfcUrl('https://x.app', { tag: 'habit', habit: 'bed' }), 'https://x.app/?nfc=habit&h=bed')
ok('NFC: etiquetas válidas, enlace viejo y rechazo de desconocidas')


// Gamificación
assert.deepEqual(levelFor(0), { level: 1, start: 0, end: 100 })
assert.equal(levelFor(99).level, 1)
assert.equal(levelFor(100).level, 2)
assert.equal(levelFor(219).level, 2)
assert.equal(levelFor(220).level, 3)
assert.equal(levelFor(359).level, 3)
const gd = '2026-11-04'
const full = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true },
  reading: [{ id: 'r', day: gd, minutes: 10, note: '', source: 'bambu' }],
  focus: [{ id: 'f', day: gd, task: 'x', minutes: 30, result: 'ok' }],
  activities: [{ id: 'a', day: gd, kind: 'football', minutes: 60 }],
  checkins: [{ id: gd, day: gd, sleepHours: 9 }], habits: { [gd]: ['bible', 'food', 'speech'] } })
assert.equal(questsFor(full, gd).every(q => q.done), true)
const g1 = game(full, gd)
assert.equal(g1.dayComplete, true)
assert.equal(g1.todayXp, 25 + 10 + 15 + 5 + 15 + 25)
const missing = { ...full, checkins: [] }
assert.equal(game(missing, gd).dayComplete, false)
assert.equal(game(missing, gd).todayXp, 25 + 10 + 15 + 15)
const unconfirmed = normalizeData({ ...EMPTY_DATA, reading: Array.from({ length: 8 }, (_, i) => ({ id: `u${i}`, day: `2026-10-2${i}`, minutes: 20, note: '', estimated: true })) })
assert.equal(game(unconfirmed, '2026-10-29').achievements.find(a => a.id === 'read-7').unlocked, false)
const confirmedWeek = { ...unconfirmed, reading: unconfirmed.reading.map(r => ({ ...r, dayConfirmed: true })) }
assert.equal(game(confirmedWeek, '2026-10-29').achievements.find(a => a.id === 'read-7').unlocked, true)
ok('gamificación: niveles crecientes, 5 misiones, bono de día completo y días estimados solo con confirmación')

// Recordatorios: suenan a su hora, solo dentro de la gracia y nunca si ya lo hiciste
const rem = { on: true, checkin: '07:00', read: '20:00', train: '17:30', wake: '06:30', photos: true }
const rdata = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, footballDays: [1, 2, 4], reminders: rem } })
assert.equal(bedtime(cleanReminders(rem), 9), '21:30')
assert.deepEqual(schedule(cleanReminders(rem), 9).map(x => x.kind), ['photos', 'checkin', 'train', 'read', 'sleep'])
assert.deepEqual(dueKinds(cleanReminders({ ...rem, on: false }), 9, at(wed, 20)), [])
assert.deepEqual(dueNotes(rdata, at(wed, 19)).map(n => n.kind), ['trainLate'])
const at2 = (d, h, m) => new Date(`${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime()
assert.deepEqual(dueNotes(rdata, at2(wed, 20, 5)).map(n => n.kind), ['read', 'trainLate'])
assert.deepEqual(dueNotes(rdata, at2(wed, 21, 31)).map(n => n.kind), ['sleep'])
const readToday = { ...rdata, reading: [{ id: 'x', day: wed, minutes: 6, note: '' }] }
assert.deepEqual(dueNotes(readToday, at2(wed, 20, 5)).map(n => n.kind), ['trainLate'])
assert.equal(dueNotes(rdata, at2(wed, 17, 35))[0].title, 'Hoy toca Espalda, bíceps y antebrazo')
assert.deepEqual(dueNotes(rdata, at2('2026-11-05', 17, 35)).map(n => n.kind), ['train'])
assert.deepEqual(dueNotes({ ...rdata, sets: [mk('s', wed, 10)] }, at2(wed, 17, 35)).map(n => n.kind), [])
assert.deepEqual(dueNotes({ ...rdata, sets: [mk('s', wed, 10)] }, at(wed, 19)).map(n => n.kind), [])
assert.deepEqual(dueNotes(rdata, at2(wed, 21, 0)).map(n => n.kind), ['read', 'sleep'])
assert.deepEqual(dueNotes(rdata, at2(wed, 6, 31)).map(n => n.kind), ['photos'])
assert.deepEqual(dueNotes({ ...rdata, body: [{ id: wed, day: wed, photos: true }] }, at2(wed, 6, 31)).map(n => n.kind), [])
assert.equal(noteKey('photos', at(wed, 7)), 'photos:2026-11')
assert.equal(noteKey('read', at(wed, 20)), 'read:2026-11-04')
assert.equal(cleanReminders({ read: '25:00', checkin: '' }).read, '20:00')
assert.equal(cleanReminders({ read: '25:00', checkin: '' }).checkin, '')
ok('recordatorios: a su hora, gracia de 90 min, nada si ya leíste o entrenaste, sin entreno en fútbol o dolor, fotos una vez al mes')

// Peso: promedio por semana y franja de volumen limpio
const wt = weightTrend(normalizeData({ ...EMPTY_DATA, body: [
  { id: '2026-10-06', day: '2026-10-06', weightKg: 44 }, { id: '2026-10-07', day: '2026-10-07', weightKg: 46 },
  { id: '2026-11-03', day: '2026-11-03', weightKg: 45.5 }] }), '2026-11-04', 6)
assert.equal(wt.length, 6)
assert.equal(wt[5].end, '2026-11-04')
assert.equal(wt[1].avg, 45)
assert.equal(wt[0].low, null)
assert.equal(wt[1].low, 45)
assert.ok(Math.abs(wt[5].high - 45 * (1 + 0.02 * 28 / 30.4)) < 1e-9)
assert.ok(wt[5].avg > wt[5].low && wt[5].avg < wt[5].high)
assert.equal(wt[2].avg, null)
ok('peso: promedio semanal y franja de +0.5% a +2% al mes')

// Semana: lo pasado es lo que pasó, hoy es el coach, lo que viene respeta fútbol y descansos
const wp = weekPlan({ ...torsoYesterday, activities: [{ id: 'fm', day: '2026-11-02', kind: 'football', minutes: 90 }] }, at(wed, 9))
assert.deepEqual(wp.map(d => d.day), ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'])
assert.deepEqual(wp[0].done, ['futbol'])
assert.deepEqual(wp[1].done, ['torso'])
assert.equal(wp[1].plan, null)
assert.equal(wp[2].isToday, true)
assert.equal(wp[2].plan, todayPlan(torsoYesterday, at(wed, 9)).kind)
assert.equal(wp[3].plan, 'futbol')
for (let i = 1; i < 7; i++) if (wp[i].plan === 'torso') assert.ok(wp[i - 1].plan !== 'torso' && !wp[i - 1].done.includes('torso'), 'torso dos días seguidos')
for (let i = 0; i < 6; i++) if (wp[i].plan === 'pierna') assert.notEqual(wp[i + 1].plan, 'futbol', 'pierna la víspera del fútbol')
const torsos = wp.filter(d => d.plan === 'torso' || d.done.includes('torso')).length
assert.ok(torsos <= 3)
assert.ok(wp.slice(4).some(d => d.plan === 'torso'))
ok('semana: pasado real, hoy del coach, fútbol fijo, sin torso seguido ni pierna antes del partido')

// NFC sin sesión: la etiqueta hace la acción en el servidor con la misma regla de la app
const nd = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true } })
const t0 = at(wed, 20)
let r1 = nfcServerAction(nd, { tag: 'reading' }, t0, wed)
assert.equal(r1.title, 'Lectura iniciada')
assert.equal(r1.next.activeReading.day, wed)
assert.equal(r1.next.activeReading.startedAt, t0)
assert.equal(nfcServerAction(r1.next, { tag: 'reading' }, t0 + 3000, wed).next, r1.next)
const r2 = nfcServerAction(r1.next, { tag: 'reading' }, t0 + 20 * 60000, wed)
assert.equal(r2.title, 'Lectura guardada: 20 min')
assert.equal(r2.next.activeReading.endedAt, t0 + 20 * 60000)
assert.equal(nfcServerAction(r2.next, { tag: 'reading' }, t0 + 30 * 60000, wed).open, true)
const rowsR = diffRecords(nd, r1.next)
assert.deepEqual(rowsR.map(x => `${x.collection}/${x.id}`), ['meta/activeReading'])
const h1 = nfcServerAction(nd, { tag: 'habit', habit: 'food' }, t0, wed)
assert.deepEqual(h1.next.habits[wed], ['food'])
assert.equal(nfcServerAction(h1.next, { tag: 'habit', habit: 'food' }, t0, wed).next, h1.next)
assert.equal(nfcServerAction(nd, { tag: 'habit', habit: 'no-existe' }, t0, wed).next, nd)
const w1 = nfcServerAction(nd, { tag: 'training' }, t0, wed)
assert.equal(w1.next.activeWorkout.startedAt, t0)
const w2 = nfcServerAction({ ...w1.next, sets: [mk('z', wed, 10)] }, { tag: 'training' }, t0 + 40 * 60000, wed)
assert.equal(w2.next.activeWorkout, null)
assert.equal(w2.title, 'Rutina cerrada: 1 serie')
const w3 = nfcServerAction(w1.next, { tag: 'training' }, t0 + 40 * 60000, wed)
assert.equal(w3.title, 'Cerrada sin series')
assert.equal(w3.next.activeWorkout, null)
assert.equal(nfcServerAction(nd, { tag: 'focus' }, t0, wed).next, nd)
ok('NFC sin sesión: lectura empieza y para, doble toque ignorado, hábito una vez, entreno abre y cierra, enfoque manda a la app')

// Lo que sigue: la siguiente vuelta según la hora y lo hecho
const ns = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, footballDays: [1, 2, 4], reminders: { on: true, checkin: '07:00', read: '20:00', train: '17:30', wake: '06:30', photos: true } } })
assert.equal(nextStep(ns, at2(wed, 7, 0)).id, 'checkin')
assert.equal(nextStep({ ...ns, checkins: [{ id: wed, day: wed, sleepHours: 9 }] }, at2(wed, 7, 0)).id, 'read')
assert.equal(nextStep(ns, at2(wed, 5, 0)).id, 'read')
assert.equal(nextStep(ns, at2(wed, 16, 0)).id, 'train')
assert.equal(nextStep(ns, at2('2026-11-05', 16, 0)).id, 'read')
const readW = { ...ns, checkins: [{ id: wed, day: wed, sleepHours: 9 }], reading: [{ id: 'x', day: wed, minutes: 6, note: '' }] }
assert.equal(nextStep(readW, at2(wed, 10, 0)).id, 'focus')
assert.equal(nextStep(readW, at2(wed, 20, 45)).id, 'reflect')
const doneW = { ...readW, checkins: [{ id: wed, day: wed, sleepHours: 9, capacity: 40, given: 40 }] }
assert.equal(nextStep(doneW, at2(wed, 20, 45)).id, 'sleep')
assert.equal(nextStep(ns, at2(wed, 20, 45)).id, 'read')
assert.equal(nextStep(doneW, at2(wed, 23, 10)).title, 'Ya es hora de dormir')
assert.equal(nextStep(doneW, at2(wed, 20, 45)).title, 'A la cama a las 21:30')
const ended = { ...ns, activeReading: { id: 'r', day: wed, startedAt: at(wed, 6), endedAt: at(wed, 7), title: '', location: '' } }
assert.equal(nextStep(ended, at2(wed, 7, 0)).id, 'save-reading')
ok('lo que sigue: lectura sin guardar primero, check-in en la mañana, entreno en la tarde si toca, leer antes de dormir, dormir al final')

// Banda de 14 días para registrar lo olvidado
const bf = backfillDays(normalizeData({ ...EMPTY_DATA, reading: [{ id: 'a', day: '2026-11-04', minutes: 14, seconds: 846, note: '' }, { id: 'b', day: '2026-11-03', minutes: 20, note: '', estimated: true }] }), '2026-11-07')
assert.equal(bf.length, 14)
assert.equal(bf[0].day, '2026-10-25')
assert.equal(bf[13].day, '2026-11-07')
assert.equal(bf[13].isToday, true)
assert.deepEqual([bf[10].read, bf[10].minutes], [true, 14])
assert.equal(bf[9].read, false)
ok('banda de 14 días: hoy al final, minutos reales y estimados sin confirmar no cuentan')

// Navegación de pestañas: flechas, extremos y teclas ajenas.
const { tabDestination } = moduleOf('navigation')
assert.equal(tabDestination('ArrowRight', 2, 3), 0)
assert.equal(tabDestination('ArrowLeft', 0, 3), 2)
assert.equal(tabDestination('ArrowRight', 0, 3), 1)
assert.equal(tabDestination('ArrowLeft', 2, 3), 1)
assert.equal(tabDestination('Home', 2, 3), 0)
assert.equal(tabDestination('End', 0, 3), 2)
assert.equal(tabDestination('Enter', 1, 3), null)
assert.equal(tabDestination('ArrowRight', 0, 0), null)
ok('pestañas: flechas circulares, Home, End y teclas ajenas')
const { elapsedSeconds, timerCues } = moduleOf('exerciseTimer')
assert.equal(elapsedSeconds(1000, 21499), 20)
assert.equal(elapsedSeconds(1000, 21500), 21)
assert.equal(elapsedSeconds(4000, 1000), 0)
assert.deepEqual(timerCues(9, 21, 10, 20), ['minimum', 'target'])
assert.deepEqual(timerCues(21, 22, 10, 20), [])
assert.deepEqual(timerCues(9, 10, 10, 10), ['minimum'])
const timerData = normalizeData({ ...EMPTY_DATA, activeWorkout: { startedAt: 1000, timer: { exercise: 'plank', startedAt: 4000, rir: 1, loadKg: 3 } } })
assert.equal(normalizeData(JSON.parse(JSON.stringify(timerData))).activeWorkout.timer.startedAt, 4000)
assert.equal(timerData.activeWorkout.timer.loadKg, 3)
assert.equal(normalizeData({ ...EMPTY_DATA, activeWorkout: { startedAt: 1000 } }).activeWorkout.timer, undefined)
ok('cronómetro: tiempo real, avisos por cruce y persistencia compatible')

// Auditoría Codex 8-nov: lectura
const { addChapterMarks } = moduleOf('bible')
const { realReading } = moduleOf('progress')
const marked = [{ id: '43:1', book: 43, chapter: 1, day: '2026-11-01', source: 'bambu' }, { id: '43:2', book: 43, chapter: 2, day: '2026-11-01', verses: '1-10' }]
const reread = addChapterMarks(marked, [{ book: 43, chapter: 1 }], '2026-11-05')
assert.equal(reread, marked) // releer no cambia nada ni genera registro
assert.equal(addChapterMarks(marked, [{ book: 43, chapter: 1 }], '2026-10-30').find(m => m.id === '43:1').day, '2026-10-30') // la primera vez gana
const completed = addChapterMarks(marked, [{ book: 43, chapter: 2 }, { book: 43, chapter: 3 }], '2026-11-05')
assert.equal(completed.find(m => m.id === '43:2').verses, undefined)
assert.equal(completed.find(m => m.id === '43:2').day, '2026-11-05')
assert.equal(completed.filter(m => m.id === '43:2').length, 1)
assert.equal(completed.length, 3)
const partials = { ...EMPTY_DATA, bible: Array.from({ length: 10 }, (_, i) => ({ id: `1:${i + 1}`, book: 1, chapter: i + 1, day: gd, verses: '1-3' })) }
assert.equal(bibleProgress(partials, 'ruta', gd).perDay30, 0)
assert.equal(bibleProgress(partials, 'ruta', gd).daysActive30, 1)
assert.equal(game(partials, gd).todayXp, 0)
assert.equal(game({ ...partials, bible: [...partials.bible, { id: '2:1', book: 2, chapter: 1, day: gd }] }, gd).todayXp, 2)
const readSec = (rows) => questsFor(normalizeData({ ...EMPTY_DATA, reading: rows.map((s, i) => ({ id: `q${i}`, day: gd, minutes: Math.floor(s / 60), seconds: s, note: '', source: 'bambu' })) }), gd).find(q => q.id === 'read').done
assert.equal(readSec([299]), false)
assert.equal(readSec([300]), true)
assert.equal(readSec([150, 150]), true)
assert.equal(readSec([30]), false)
assert.equal(streak(normalizeData({ ...EMPTY_DATA, reading: [{ id: 'q', day: gd, minutes: 0, seconds: 30, note: '' }] }).reading.filter(realReading).map(r => r.day), gd).current, 1) // la racha no cambia
ok('lectura: releer conserva la fecha, parciales sin velocidad ni XP de capítulo, misión pide 300 s reales')

// UI/UX 8-nov: etapas del bambú (imagen por etapa, siguiente etapa a la vista)
const { rankOf, rankImage } = moduleOf('gamification')
assert.equal(rankOf(1).name, 'Semilla'); assert.equal(rankOf(3).index, 0); assert.equal(rankOf(4).name, 'Brote')
assert.equal(rankOf(13).name, 'Caña'); assert.equal(rankOf(13).next.name, 'Bambú joven'); assert.equal(rankOf(13).next.level, 16)
assert.equal(rankOf(28).name, 'Bosque antiguo'); assert.equal(rankOf(28).next, null); assert.equal(rankOf(99).index, 9)
assert.equal(rankOf(0).index, 0)
for (let i = 0; i < 10; i++) assert.ok(fs.existsSync(path.join(__dirname, '../public', rankImage(i))), `falta ${rankImage(i)}`)
assert.equal(game(full, gd).rankInfo.name, game(full, gd).rank)
const trainQuest = (acts) => questsFor(normalizeData({ ...EMPTY_DATA, activities: acts }), gd).find(q => q.id === 'train').done
assert.equal(trainQuest([]), false)
assert.equal(trainQuest([{ id: 'w', day: gd, kind: 'walk', minutes: 30 }]), true) // descanso activo cuenta
assert.equal(trainQuest([{ id: 'r', day: gd, kind: 'rest' }]), true)
assert.equal(trainQuest([{ id: 'o', day: gd, kind: 'other' }]), false)
ok('etapas: cada 3 niveles, siguiente etapa con su nivel, las 10 imágenes existen')

// Auditoría Codex 8-nov: sincronización
const { SyncEngine, newerState } = moduleOf('sync')
assert.equal(newerState({ cursor: 1, pending: {}, bootstrapped: true, savedAt: 5 }, { cursor: 2, pending: { a: 1 }, bootstrapped: true, savedAt: 9 }).cursor, 2)
assert.equal(newerState({ cursor: 1, pending: {}, bootstrapped: true, savedAt: 9 }, { cursor: 2, pending: {}, bootstrapped: true, savedAt: 5 }).cursor, 1)
assert.equal(newerState(null, { cursor: 3, pending: {}, bootstrapped: true }).cursor, 3)
assert.equal(newerState({ cursor: 1, pending: {}, bootstrapped: true }, { cursor: 2, pending: {}, bootstrapped: true, savedAt: 1 }).cursor, 2) // la copia sin sello pierde
ok('cola: entre IndexedDB y el espejo gana la copia más nueva')

global.window = { setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, addEventListener: () => {}, removeEventListener: () => {} }
global.document = { hidden: false, addEventListener: () => {}, removeEventListener: () => {} }
const remote = { collection: 'task', id: 't1', payload: { id: 't1' }, deleted: false, client_updated_at: 50, seq: 7 }
function fakeClient({ pushFails = false, rows = [remote] } = {}) {
  // Latencia real (macrotarea): sin ella todo se resuelve en microtareas y las carreras no se ven.
  const net = (value) => new Promise(r => setTimeout(() => r(value), 3))
  return {
    pull: async () => { await net(); return { rows: rows.map(r => ({ collection: r.collection, id: r.id, payload: r.payload, deleted: r.deleted, clientUpdatedAt: r.client_updated_at })), cursor: rows.length ? 7 : 0 } },
    push: async () => { await net(); if (pushFails) throw new Error('red caída') },
  }
}
async function syncChecks() {
  const quiet = console.warn; console.warn = () => {}
  try {
    // 1) Si guardar los datos falla, el cursor NO avanza (si avanzara, esas filas no volverían a bajar).
    const saved = []
    const store = { load: async () => null, save: async s => { saved.push(JSON.parse(JSON.stringify(s))) } }
    const failing = new SyncEngine({ client: fakeClient(), userId: 'u', store, onRemote: async () => { throw new Error('disco lleno') }, onStatus: () => {} })
    assert.equal(await failing.sync(), false)
    assert.equal(saved.every(s => s.cursor === 0), true)
    // 2) Con éxito, el cursor se guarda DESPUÉS de que los datos quedaron guardados.
    const events = []
    const store2 = { load: async () => null, save: async s => { events.push(`cursor:${s.cursor}`) } }
    const good = new SyncEngine({ client: fakeClient(), userId: 'u', store: store2, onRemote: async () => { await new Promise(r => setTimeout(r, 5)); events.push('datos') }, onStatus: () => {} })
    assert.equal(await good.sync(), true)
    assert.deepEqual(events.slice(-2), ['datos', 'cursor:7'])
    // 3) Una subida fallida resuelve false y conserva lo pendiente (el refresco por versión no debe seguir).
    const pend = new SyncEngine({ client: fakeClient({ pushFails: true }), userId: 'u', store: { load: async () => null, save: async () => {} }, onRemote: async () => {}, onStatus: () => {} })
    pend.track([{ collection: 'task', id: 't1', payload: { id: 't1' }, deleted: false, clientUpdatedAt: 99 }])
    assert.equal(await pend.syncNow(), false)
    assert.equal(pend.pendingCount(), 1)
    // 4) Lo que baja y es más viejo que lo pendiente no pisa lo local.
    assert.equal(pend.keepNewer([{ collection: 'task', id: 't1', payload: {}, deleted: false, clientUpdatedAt: 50 }]).length, 0)
    assert.equal(pend.keepNewer([{ collection: 'task', id: 't1', payload: {}, deleted: false, clientUpdatedAt: 120 }]).length, 1)
    // 5) syncNow espera la vuelta en curso y hace una propia (antes sync() devolvía sin subir nada).
    //    La vuelta en curso ya tomó su mochila vacía; el cambio que llega después debe estar subido al resolver.
    const slow = new SyncEngine({ client: fakeClient({ rows: [] }), userId: 'u', store: { load: async () => null, save: async () => {} }, onRemote: async () => {}, onStatus: () => {} })
    const first = slow.sync()
    slow.track([{ collection: 'task', id: 't2', payload: { id: 't2' }, deleted: false, clientUpdatedAt: 99 }])
    assert.equal(await slow.syncNow(), true)
    assert.equal(slow.pendingCount(), 0)
    await first
  } finally { console.warn = quiet }
  ok('sincronización: datos antes que cursor, resultado explícito y refresco sin pisar lo pendiente')
}
const { binauralWav, AUDIO_PRESETS, LOOP_SECONDS } = moduleOf('binaural')
assert.deepEqual(AUDIO_PRESETS.map(p => [p.name, p.beat]), [['Leer', 10], ['Calma', 6], ['Enfoque', 14]])
assert.ok(LOOP_SECONDS >= 30 && LOOP_SECONDS <= 60)
for (const beat of [6, 10, 14]) {
  const wav = binauralWav(beat), v = new DataView(wav)
  assert.equal(Buffer.from(wav).toString('ascii', 0, 4), 'RIFF')
  assert.equal(Buffer.from(wav).toString('ascii', 8, 12), 'WAVE')
  assert.equal(v.getUint16(22, true), 2)
  assert.equal(v.getUint32(24, true), 44100)
  assert.equal(v.getUint32(40, true), wav.byteLength - 44)
  for (let channel = 0; channel < 2; channel++) {
    let crossings = 0
    for (let i = 1; i < 44100 * LOOP_SECONDS; i++) if (v.getInt16(44 + i * 4 + channel * 2, true) > 0 && v.getInt16(44 + (i - 1) * 4 + channel * 2, true) <= 0) crossings++
    assert.equal(crossings, LOOP_SECONDS * (200 + channel * beat))
    assert.equal(v.getInt16(44 + channel * 2, true), 0)
    assert.ok(Math.abs(v.getInt16(wav.byteLength - 4 + channel * 2, true)) < 340)
  }
}
assert.throws(() => binauralWav(99))
ok('WAV: cabecera, estéreo, frecuencias por canal y continuidad del bucle')
// Herencia y semana sólida
{
  const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']
  const week = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true },
    reading: [...days, '2026-10-20'].map((day, i) => ({ id: `w${i}`, day, minutes: 10, note: '', source: 'bambu' })),
    focus: days.map((day, i) => ({ id: `wf${i}`, day, task: 'x', minutes: 30, result: 'ok' })),
    checkins: days.map(day => ({ id: day, day, sleepHours: 9 })) })
  const gw = game(week, '2026-11-13')
  assert.equal(gw.heritageXp, 25)
  assert.equal(gw.bambuXp, 5 * 40 + 40)
  assert.equal(gw.week.good, 5)
  assert.equal(gw.week.bonus, true)
  const four = game(week, '2026-11-12')
  assert.equal(four.week.good, 4)
  assert.equal(four.bambuXp, 4 * 40)
  assert.equal(game(week, '2026-11-13').bambuDay, 12)
  ok('gamificación: la historia anterior a Bambú se cuenta aparte y la semana sólida da bono a la quinta')
}
// Brote, Tallo, fotos y tema
{
  const noon = (day, h) => new Date(`${day}T${String(h).padStart(2, '0')}:00:00`).getTime()
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true } })
  // Dolor de pecho: Brote se calma y Tallo manda a descansar con alerta, sin plan de entreno.
  const pain = { ...base, checkins: [{ id: '2026-11-10', day: '2026-11-10', pain: 'pecho' }] }
  assert.equal(broteSays(pain, noon('2026-11-10', 10)).mood, 'calma')
  const t = talloSays(pain, noon('2026-11-10', 10))
  assert.equal(t.pose, 'rest'); assert.equal(t.lines[0].tone, 'alerta')
  // De noche con la lectura hecha: sueño. Mañana sin check-in: feliz con saludo.
  const read = { ...base, reading: [{ id: 'r', day: '2026-11-10', minutes: 10, note: '', source: 'bambu' }] }
  assert.equal(broteSays(read, noon('2026-11-10', 22)).mood, 'sueno')
  assert.match(broteSays(base, noon('2026-11-10', 9)).lines[0], /Buenos días/)
  // Racha en riesgo por la tarde: nombra los días sin culpa.
  const streakData = { ...base, reading: [1, 2, 3].map(n => ({ id: `s${n}`, day: `2026-11-0${n + 6}`, minutes: 10, note: '', source: 'bambu' })) }
  assert.match(broteSays(streakData, noon('2026-11-10', 18)).lines[0], /Llevas 3 días/)
  // Los consejos son los mismos todo el día (no cambian solos).
  assert.deepEqual(broteSays(base, noon('2026-11-10', 9)).lines.slice(1), broteSays(base, noon('2026-11-10', 15)).lines.slice(1))
  // Fotos: 60 días, entrenos y promedio de peso alrededor de cada foto.
  const withBody = { ...base, sets: [{ id: 's', day: '2026-10-20', at: 1, exercise: 'pushup', reps: 10 }],
    body: [{ id: 'a', day: '2026-09-10', weightKg: 44 }, { id: 'b', day: '2026-11-09', weightKg: 46 }] }
  const ps = photoSummary(withBody, '2026-09-10', '2026-11-09')
  assert.equal(ps.days, 60); assert.equal(ps.trainDays, 1); assert.equal(ps.weightFrom, 44); assert.equal(ps.weightTo, 46)
  assert.match(photoSummary(withBody, '2026-11-09', '2026-11-09').lines[0], /mismo día/)
  assert.equal(resolveTheme('auto', true), 'dark'); assert.equal(resolveTheme('claro', true), 'light'); assert.equal(resolveTheme('oscuro', false), 'dark')
  ok('Brote, Tallo, fotos y tema: ánimo por hora y dolor, consejos estables, resumen de datos entre fotos')
}
// La medida del día: capacidad contra entrega
{
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true } })
  assert.equal(dayVerdict(20, 20).kind, 'todo'); assert.match(dayVerdict(20, 20).text, /vale tanto como un día de cien/)
  assert.equal(dayVerdict(80, 76).kind, 'todo'); assert.equal(dayVerdict(80, 70).kind, 'parte'); assert.equal(dayVerdict(40, 60).kind, 'mas')
  // Dar el 100% de un 20% cuenta igual que dar el 100% de un 100%: día sólido y +25 XP sin ninguna misión.
  const dayX = '2026-11-10'
  const low = normalizeData({ ...base, checkins: [{ id: dayX, day: dayX, capacity: 20, given: 20 }] })
  const gl = game(low, dayX)
  assert.equal(gl.gave.today, true); assert.equal(gl.week.good, 1); assert.equal(gl.gave.streak, 1)
  // 25 por dar lo que traías + 5 por registrar el check-in; ninguna misión de producir hace falta
  assert.equal(gl.todayXp, 25 + 5)
  const high = normalizeData({ ...base, checkins: [{ id: dayX, day: dayX, capacity: 100, given: 40 }] })
  assert.equal(game(high, dayX).gave.today, false); assert.equal(game(high, dayX).week.good, 0)
  assert.equal(game(base, dayX).gave.today, null)
  // Sin reflexión no hay dato; pasarse cinco días seguidos activa el aviso de cuidado, no un premio.
  const over = normalizeData({ ...base, checkins: [1, 2, 3, 4, 5].map(n => ({ id: `2026-11-0${n}`, day: `2026-11-0${n}`, capacity: 40, given: 80 })) })
  const st = measureStats(measures(over, '2026-11-05', 14))
  assert.equal(st.counted, 5); assert.equal(st.overGiving, true); assert.equal(st.gaveDays, 5)
  // Módulos: quien no entrena ni enfoca solo tiene lectura, medida y hábitos como misiones.
  const light = normalizeData({ ...base, settings: { ...base.settings, modules: { reading: true, bible: false, training: false, focus: false } } })
  assert.deepEqual(questsFor(light, dayX).map(q => q.id), ['read', 'checkin', 'habits'])
  assert.equal(questsFor(base, dayX).length, 5)
  // Una lista de hábitos vacía es válida (no se rellena con los de otra persona).
  assert.equal(normalizeData({ ...base, settings: { ...base.settings, habits: [] } }).settings.habits.length, 0)
  // El dolor de pecho de anoche sigue bloqueando el plan de hoy.
  const nightPain = normalizeData({ ...base, checkins: [{ id: '2026-11-09', day: '2026-11-09', pain: 'pecho' }] })
  assert.equal(todayPlan(nightPain, new Date('2026-11-10T10:00:00').getTime()).kind, 'dolor')
  ok('medida del día: capacidad contra entrega, día sólido con poco, aviso de dar de más, módulos y dolor de anoche')
}
// Comparadores de la noche
{
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true } })
  assert.equal(bandOf(40), 'bajo'); assert.equal(bandOf(60), 'medio'); assert.equal(bandOf(80), 'alto')
  const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']
  const data = normalizeData({ ...base,
    checkins: [{ id: days[0], day: days[0], capacity: 100, sleepHours: 8.5 }, { id: days[1], day: days[1], capacity: 90, sleepHours: 8.5 }, { id: days[2], day: days[2], capacity: 20, sleepHours: 6 }, { id: days[3], day: days[3], capacity: 20, sleepHours: 6 }, { id: '2026-11-05', day: '2026-11-05', capacity: 100, sleepHours: 6 }],
    reading: [{ id: 'a', day: days[0], minutes: 30, note: '' }, { id: 'b', day: days[1], minutes: 20, note: '' }, { id: 'c', day: days[2], minutes: 5, note: '' }, { id: 'd', day: days[3], minutes: 5, note: '' }, { id: 'e', day: '2026-11-05', minutes: 6, note: '' }],
    focus: [{ id: 'f1', day: days[0], task: 'x', minutes: 60, result: 'ok' }, { id: 'f2', day: days[1], task: 'x', minutes: 40, result: 'ok' }] })
  const c = compareDay(data, '2026-11-05', 100)
  assert.equal(c.todayBand, 'alto'); assert.equal(c.enough, true)
  assert.equal(c.rows.find(r => r.band === 'alto').avg.readMin, 25)
  assert.equal(c.rows.find(r => r.band === 'bajo').avg.readMin, 5)
  assert.equal(c.today.readMin, 6)
  assert.ok(c.lines.some(l => /Cuando traes 80% o más sueles leer 25 min/.test(l)))
  assert.ok(c.lines.some(l => /dormiste 6 h/.test(l)))   // 100% con 6 h cuando tus 100% duermen 8.5
  // Sin días suficientes no inventa referencias.
  assert.equal(compareDay(base, '2026-11-05', 60).enough, false)
  ok('comparadores de la noche: banda por capacidad, promedios reales y duda cuando el sueño no cuadra con el 100%')
}
// NFC de la noche
{
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true } })
  assert.deepEqual(parseNfc('?nfc=night'), { tag: 'night' })
  const open = nfcServerAction(base, { tag: 'night' }, 1, '2026-11-10')
  assert.equal(open.open, true); assert.equal(open.next, base)
  const morning = { ...base, checkins: [{ id: '2026-11-10', day: '2026-11-10', capacity: 40, sleepHours: 8 }] }
  const r = nfcServerAction(morning, { tag: 'night', night: { capacity: 40, given: 38, reflection: '  Leí y entrené ligero ' } }, 1, '2026-11-10')
  const row = r.next.checkins.find(c => c.day === '2026-11-10')
  assert.equal(row.given, 38); assert.equal(row.capacity, 40); assert.equal(row.sleepHours, 8)   // conserva lo de la mañana
  assert.equal(row.reflection, 'Leí y entrené ligero'); assert.match(r.title, /38% de 40%/)
  assert.equal(nfcServerAction(base, { tag: 'night', night: { capacity: 250, given: -5 } }, 1, '2026-11-10').next.checkins[0].capacity, 100)  // acota
  ok('NFC de la noche: sin datos abre la app, con datos registra y conserva el check-in de la mañana, y acota valores')
}
// Bloque desde tareas: Jev propone, tú revisas
(async () => {
  const T = (id, text, o = {}) => ({ id, text, status: 'pending', minutes: 25, level: null, updatedAt: 1, notes: '', project: '', subtasks: [], ...o })
  assert.equal(localGuess(T('a', 'Pagar internet')).level, 1)
  assert.equal(localGuess(T('b', 'Mandar propuesta a un cliente')).level, 4)
  assert.equal(snapBlock(10), 25); assert.equal(snapBlock(25), 25); assert.equal(snapBlock(70), 90); assert.equal(snapBlock(500), 120)
  assert.equal(sizeToMinutes(2.2), 45); assert.equal(sizeToMinutes(9), 120)
  // Varias tareas: un bloque con nombre unido, minutos sumados y redondeados, nivel más alto y cada tarea como mini entregable.
  const tasks = [T('a', 'Responder correos'), T('b', 'Editar video', { minutes: 60 }), T('c', 'Pagar internet', { level: 1 })]
  const guesses = [{ id: 'a', level: 4, size: 1, source: 'jev' }, { id: 'b', level: 3, size: 2, source: 'jev' }, { id: 'c', level: 1, size: 0, source: 'jev' }]
  const b = buildBlock(tasks, guesses)
  assert.equal(b.task, 'Responder correos + Editar video + Pagar internet')
  assert.equal(b.minutes, 120)                    // 25 + 60 (lo fijado por ti manda) + 25 de Jev para pagar = 110, redondeado arriba
  assert.equal(b.level, 4); assert.equal(b.micro.length, 3); assert.equal(b.source, 'jev')
  assert.equal(b.taskIds.join(), 'a,b,c')
  // Lo que ya fijaste tú manda sobre la sugerencia.
  assert.equal(buildBlock([T('x', 'Algo', { level: 2, minutes: 90 })], [{ id: 'x', level: 4, size: 0, source: 'jev' }]).level, 2)
  // Una sola tarea con subtareas: su primera pendiente es la meta y las demás los mini entregables.
  const one = buildBlock([T('s', 'Lanzar campaña', { subtasks: [{ id: '1', text: 'Escribir E1', done: true }, { id: '2', text: 'Escribir E2', done: false }, { id: '3', text: 'Subir a Smartlead', done: false }] })], [])
  assert.equal(one.goal, 'Escribir E2'); assert.equal(one.micro.length, 2); assert.equal(one.source, 'local')
  // Jev caído, lento o sin nube: devuelve null y la app usa la regla local.
  assert.equal(await askJev(tasks, null), null)
  assert.equal(await askJev(tasks, async () => { throw new Error('red') }), null)
  assert.equal(await askJev(tasks, () => new Promise(() => {}), 30), null)
  const ok = await askJev(tasks, async () => ({ data: { items: [{ id: 'a', level: 4, size: 1 }, { id: 'z', level: 9, size: 1 }] }, error: null }))
  assert.equal(ok.length, 1); assert.equal(ok[0].source, 'jev')   // descarta lo fuera de rango
  assert.equal(suggestPick([T('l', 'Pagar internet'), T('h', 'Mandar propuesta a cliente'), T('d', 'Hecha', { status: 'done' })], 2)[0].id, 'h')
  console.log('ok-assist')
})().catch(e => { console.error(e); process.exit(1) })
ok('bloque desde tareas: nivel y tamaño de Jev, regla local de respaldo, suma de minutos y lo fijado por ti manda')
// Sesión a la medida del tiempo (session.ts): exprés, superseries, prioridad, descanso, dedazos y blindaje
{
  const S = moduleOf('session')
  const settings = { restSeconds: 90 }
  const torso = todayPlan(fresh, at(wed, 16))
  const st = muscleStates(fresh, at(wed, 16))
  // Descanso: 90 s en lo grande, 60 en lo chico, 45 en exprés.
  assert.equal(S.restFor(exercise('pushup'), settings), 90)
  assert.equal(S.restFor(exercise('curl-backpack'), settings), 60)
  assert.equal(S.restFor(exercise('pushup'), settings, true), 45)
  // Sin límite va completa; con 15 min entra en exprés, cabe y nunca queda vacía.
  const full = S.fitToTime(torso.items, null, settings, st)
  assert.equal(full.items.length, 8); assert.equal(full.express, false)
  const fast = S.fitToTime(torso.items, 15, settings, st)
  assert.equal(fast.express, true)
  assert.ok(fast.minutes <= 15, `exprés de ${fast.minutes} min`)
  assert.ok(fast.items.length >= 2 && fast.items.length < 8)
  assert.ok(S.fitToTime(torso.items, 1, settings, st).items.length >= 1)
  // Superseries: empuje con jalón juntos, y la cola alterna A1, B1, A2, B2.
  const g = S.groups(torso.items)
  assert.ok(g.some(x => x.length === 2 && x.map(i => i.slot).sort().join() === 'empuje,jalon'))
  const q = S.sessionQueue([g.find(x => x.some(i => i.slot === 'empuje'))])
  assert.deepEqual(q.map(s => `${s.item.slot}${s.set}`), ['empuje1', 'jalon1', 'empuje2', 'jalon2'])
  // Espalda sin barra (video de Seba Galex): grosor, ancho y desde arriba; sin remo en puerta.
  assert.deepEqual(torso.items.filter(i => ['jalon', 'jalon_ancho', 'aduccion'].includes(i.slot)).map(i => i.exercise.id), ['row-backpack', 'row-backpack-1arm', 'floor-towel-pull'])
  assert.equal(torso.items.find(i => i.slot === 'aduccion').sets, 1)             // la del piso: una sola, al máximo
  assert.equal(torso.items.find(i => i.slot === 'aduccion').progression.target.length, 1)
  assert.equal(exercise('row-towel-door'), undefined)
  assert.ok(S.groups(torso.items).some(x => x.map(i => i.slot).sort().join() === 'hombro,jalon_ancho'))
  const withTable = { ...fresh, settings: { ...fresh.settings, equipment: [...fresh.settings.equipment, 'mesa'] }, sets: [mk('t1', '2026-11-01', 15, 17, 'row-backpack'), mk('t2', '2026-11-01', 15, 17, 'row-backpack')] }
  assert.equal(progression(withTable, exercise('row-backpack')).next.id, 'row-table')   // tope en mochila: sube a la mesa
  assert.equal(todayPlan({ ...withTable, sets: [] }, at(wed, 16)).items.find(i => i.slot === 'jalon').exercise.id, 'row-backpack')
  // Cambiar ejercicio: mismo hueco sí; otro movimiento o id inventado, no.
  const swapped = S.applySwaps(torso.items, { jalon: 'row-table', empuje: 'squat', hombro: 'no-existe' }, fresh, wed)
  assert.equal(swapped.find(i => i.slot === 'jalon').exercise.id, 'row-table')
  assert.equal(swapped.find(i => i.slot === 'jalon').progression.verdict, 'nuevo')
  assert.equal(swapped.find(i => i.slot === 'empuje').exercise.id, torso.items.find(i => i.slot === 'empuje').exercise.id)
  assert.equal(swapped.find(i => i.slot === 'hombro').exercise.id, torso.items.find(i => i.slot === 'hombro').exercise.id)
  // Prioridad: si el pecho ya tiene su volumen de la semana, el par de empuje es lo primero que sale.
  const chestDone = { ...fresh, sets: Array.from({ length: 6 }, (_, k) => mk(`p${k}`, '2026-10-31', 12)) }
  const st2 = muscleStates(chestDone, at(wed, 16))
  const fit2 = S.fitToTime(todayPlan(chestDone, at(wed, 16)).items, 12, settings, st2)
  assert.ok(fit2.dropped.some(i => i.slot === 'empuje'), 'el pecho cubierto se recorta primero')
  // La siguiente serie sale de lo registrado hoy: sobrevive a recargar.
  const half = { ...fresh, sets: [mk('x1', wed, 10, 16, torso.items[0].exercise.id)] }
  const cur = S.currentStep(S.sessionQueue(S.groups(torso.items)), half, wed)
  assert.equal(cur.done, 1)
  assert.notEqual(`${cur.step.item.exercise.id}${cur.step.set}`, `${torso.items[0].exercise.id}1`)
  // Dedazos: 5 s de agarre o 60 lagartijas piden confirmar; lo normal pasa.
  assert.ok(S.checkValue(exercise('backpack-hold'), 5))
  assert.ok(S.checkValue(exercise('pushup'), 60))
  assert.equal(S.checkValue(exercise('pushup'), 12), null)
  assert.equal(S.checkValue(exercise('plank'), 45), null)
  // Día de fútbol: blindaje de una serie (Copenhagen y nórdico), y no bloquea la pierna.
  const fb = todayPlan(fresh, at('2026-11-05', 16))
  assert.deepEqual(fb.items.map(i => i.exercise.id), ['copenhagen', 'nordic'])
  assert.ok(fb.items.every(i => i.sets === 1))
  const shield = { ...fresh, sets: [mk('n1', '2026-11-05', 4, 17, 'nordic')] }
  assert.notEqual(muscleStates(shield, at('2026-11-06', 9)).find(s => s.id === 'isquios').status, 'recuperando')
  // Fútbol sin registrar: pregunta hoy desde las 6 pm o ayer, y no repite si ya respondiste.
  const thu6pm = new Date('2026-11-05T19:00:00'), fri = new Date('2026-11-06T09:00:00')
  const dk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  assert.equal(S.footballToAsk(fresh, thu6pm, () => false, dk), '2026-11-05')
  assert.equal(S.footballToAsk(fresh, fri, () => false, dk), '2026-11-05')
  assert.equal(S.footballToAsk(fresh, fri, () => true, dk), null)
  assert.equal(S.footballToAsk({ ...fresh, activities: [{ id: 'f', day: '2026-11-05', kind: 'football' }] }, fri, () => false, dk), null)
  // Cada dibujo técnico va precargado en el service worker: sin señal la técnica se ve igual.
  const sw = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8')
  for (const id of moduleOf('exercises').DRAWN) assert.ok(sw.includes(`'${id}'`), `sw.js no precarga ${id}`)
  // Todo ejercicio del catálogo tiene imagen (foto o dibujo) y los dibujos existen en disco.
  const { imageOf: img } = moduleOf('exercises')
  for (const e of EXERCISES) {
    const i = img(e.id)
    assert.ok(i, `${e.id} sin imagen`)
    for (const f of [i.start, i.end]) assert.ok(fs.existsSync(path.join(__dirname, '../public', f)), `falta ${f}`)
  }
}
ok('sesión a tu tiempo: exprés cabe, superseries alternan, se recorta lo cubierto, dedazos, blindaje de fútbol e imágenes completas')

// La vara (vara.ts): promesas que se marcan solas, preguntas de conducta y cabeza contra hechos
{
  const V = moduleOf('vara')
  const d = '2026-11-12'
  assert.deepEqual([20, 40, 60, 79, 80, 100].map(V.promiseCount), [1, 1, 2, 2, 3, 3])
  const tasks = [{ id: 'hi', text: 'Mandar propuesta', status: 'pending', minutes: 30, level: 4, updatedAt: 1 }, { id: 'lo', text: 'Ordenar', status: 'pending', minutes: 10, level: 1, updatedAt: 1 }]
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true }, tasks })
  const sug = V.suggestPromises(base, 40)
  assert.equal(sug[0].ref, 'hi')                                   // la tarea de más palanca va primero
  assert.equal(sug.find(p => p.kind === 'reading').target, 5)     // con poca capacidad, la meta es chica
  assert.equal(V.suggestPromises(base, 100).find(p => p.kind === 'reading').target, 25)
  // Se marcan solas con los registros del día (y solo de ese día).
  const done = normalizeData({ ...base,
    reading: [{ id: 'r', day: d, minutes: 0, seconds: 16 * 60, note: '' }, { id: 'r2', day: '2026-11-11', minutes: 60, note: '' }],
    sets: Array.from({ length: 8 }, (_, k) => ({ id: `s${k}`, day: d, at: 1 + k, exercise: 'pushup', reps: 10 })),
    focus: [{ id: 'f', day: d, task: 'x', minutes: 45, result: '' }],
    tasks: [{ ...tasks[0], status: 'done', completedOn: d }, tasks[1]], habits: { [d]: ['speech'] } })
  const P = (kind, extra = {}) => ({ id: kind, kind, label: kind, ...extra })
  assert.equal(V.promiseKept(P('reading', { target: 15 }), done, d), true)
  assert.equal(V.promiseKept(P('reading', { target: 25 }), done, d), false)
  assert.equal(V.promiseKept(P('reading', { target: 15 }), done, '2026-11-13'), false)
  assert.equal(V.promiseKept(P('training', { target: 8 }), done, d), true)
  assert.equal(V.promiseKept(P('focus', { target: 45 }), done, d), true)
  assert.equal(V.promiseKept(P('task', { ref: 'hi' }), done, d), true)
  assert.equal(V.promiseKept(P('task', { ref: 'lo' }), done, d), false)
  assert.equal(V.promiseKept(P('task', { ref: 'hi' }), done, '2026-11-13'), false)   // terminada otro día no cuenta hoy
  assert.equal(V.promiseKept(P('habit', { ref: 'speech' }), done, d), true)
  assert.equal(V.promiseKept(P('free'), done, d), false)
  assert.equal(V.promiseKept(P('free', { done: true }), done, d), true)
  // Puntuación: 70% promesas y 30% conducta; lo que diste = capacidad por puntuación.
  const all = { start: true, escape: true, people: true }
  const two = [P('reading', { target: 15 }), P('task', { ref: 'lo' })]
  assert.equal(V.varaOf({ capacity: 70, promises: two, anchors: all }, done, d).given, Math.round(70 * (0.7 * 0.5 + 0.3)))
  assert.equal(V.varaOf({ capacity: 70, promises: [two[0]], anchors: all }, done, d).given, 70)
  assert.equal(V.varaOf({ capacity: 40, anchors: { start: true, escape: false, people: true } }, done, d).given, Math.round(40 * 2 / 3))
  assert.equal(V.varaOf({ capacity: 70 }, done, d).given, null)                         // sin nada, no inventa
  // Cabeza contra hechos: habla solo con 15 puntos o más de diferencia, y en la dirección correcta.
  assert.equal(V.gutCheck(60, 70, { kept: 1, total: 1 }), null)
  assert.match(V.gutCheck(40, 70, { kept: 2, total: 2 }), /cobrando de más/)
  assert.match(V.gutCheck(90, 50, { kept: 1, total: 2 }), /promete menos/)
  // El modelo guarda la vara y tira la basura; un registro viejo sin vara abre igual.
  const clean = normalizeData({ ...EMPTY_DATA, checkins: [{ id: d, day: d, capacity: 70, felt: 55, anchors: { start: true, escape: 'x', people: false },
    promises: [P('reading', { target: 15 }), { id: 'z', kind: 'hackeo', label: 'x' }, P('free', { done: true }), P('task', { ref: 'a' }), P('focus', { target: 9999 })] }] }).checkins[0]
  assert.deepEqual(clean.anchors, { start: true, people: false })
  assert.equal(clean.felt, 55)
  assert.deepEqual(clean.promises.map(p => p.kind), ['reading', 'free', 'task'])   // máximo 3, tipo válido
  assert.equal(normalizeData({ ...EMPTY_DATA, checkins: [{ id: d, day: d, capacity: 70, given: 60 }] }).checkins[0].given, 60)
  assert.deepEqual(V.keptToday(normalizeData({ ...done, checkins: [{ id: d, day: d, capacity: 70, promises: [P('reading', { target: 15 }), P('task', { ref: 'lo' })] }] }), d), ['reading'])
  const rt = applyRecords({ ...EMPTY_DATA }, toRecords(normalizeData({ ...EMPTY_DATA, checkins: [{ id: d, day: d, capacity: 70, promises: [P('reading', { target: 15 })], anchors: all }] })))
  assert.equal(rt.checkins[0].promises[0].target, 15)
  assert.deepEqual(rt.checkins[0].anchors, all)
}
ok('la vara: promesas por capacidad, se marcan solas con registros del día, 70/30, cabeza contra hechos y el modelo la conserva')

// Reporte de la semana (weekly.ts): tú contra tu semana pasada
{
  const W = moduleOf('weekly')
  const sun = '2026-11-15', mon = '2026-11-16'
  const R = (id, day, min, extra = {}) => ({ id, day, minutes: min, note: '', ...extra })
  const S = (id, day) => ({ id, day, at: 1, exercise: 'pushup', reps: 10 })
  const data = normalizeData({ ...EMPTY_DATA,
    reading: [R('a', '2026-11-10', 20), R('b', '2026-11-12', 30), R('c', '2026-11-13', 60, { estimated: true }), R('d', '2026-11-04', 10)],
    sets: [S('s1', '2026-11-10'), S('s2', '2026-11-10'), S('s3', '2026-11-14'), S('s4', '2026-11-05')],
    checkins: [{ id: '2026-11-11', day: '2026-11-11', capacity: 70, given: 70, promises: [{ id: 'reading', kind: 'reading', label: 'Leer', target: 5 }] },
      { id: '2026-11-12', day: '2026-11-12', capacity: 70, given: 40 }] })
  const r = W.weekReport(data, sun)
  assert.equal(r.now.start, '2026-11-09')                 // domingo: la semana que cierra hoy
  assert.equal(r.now.readMin, 50)                          // lo estimado no suma
  assert.equal(r.now.readDays, 2)
  assert.equal(r.now.sets, 3); assert.equal(r.now.trainDays, 2)
  assert.equal(r.now.measured, 2); assert.equal(r.now.gaveDays, 1)
  assert.equal(r.now.promised, 1); assert.equal(r.now.kept, 0)   // el 11 no leyó: promesa sin cumplir
  assert.equal(r.before.readMin, 10)
  assert.ok(r.wins.some(w => /40 más/.test(w)))            // 50 contra 10
  assert.equal(W.weekReport(data, mon).now.start, '2026-11-09')   // lunes: todavía la semana que acaba de cerrar
  assert.equal(W.weekReport(normalizeData({ ...EMPTY_DATA }), sun).empty, true)
  // Una sola cosa a vigilar: muchas promesas incumplidas pesan más que todo lo demás.
  const broken = normalizeData({ ...data, checkins: ['2026-11-10', '2026-11-11', '2026-11-12'].map(d => ({ id: d, day: d, capacity: 80, promises: [{ id: 'f', kind: 'free', label: 'x' }] })) })
  assert.match(W.weekReport(broken, sun).watch, /promete menos/)
}
ok('reporte semanal: domingo y lunes, lo estimado no suma, promesas cumplidas y una sola cosa a vigilar')

// Conteos con plural: "1 hábitos" no debe volver a salir en pantalla
{
  const { plural } = moduleOf('text')
  assert.equal(plural(1, 'serie', 'series'), '1 serie'); assert.equal(plural(0, 'serie', 'series'), '0 series'); assert.equal(plural(3, 'día', 'días'), '3 días')
  const words = 'series|hábitos|días|sesiones|promesas|registros|tareas|lecturas|repeticiones|niveles|capítulos'
  const raw = new RegExp('\$\{([^{}]{1,40})\} (' + words + ')\b', 'g')
  const bad = []
  for (const dir of ['../src', '../src/lib']) for (const f of fs.readdirSync(path.join(__dirname, dir)).filter(n => /\.tsx?$/.test(n))) {
    const src = fs.readFileSync(path.join(__dirname, dir, f), 'utf8')
    for (const m of src.matchAll(raw)) if (!/toFixed|goal/.test(m[1])) bad.push(`${f}: ${m[0]}`)
  }
  assert.deepEqual(bad, [], 'conteo sin plural()')
}
ok('conteos con plural: 1 serie, 0 series, y ningún conteo crudo en el código')

// Votos por tu norte, rescates y nunca falles dos veces (identity.ts)
{
  const day = '2026-11-21'
  const base = normalizeData({ ...EMPTY_DATA, settings: { ...EMPTY_DATA.settings, habits: [{ id: 'agua', label: 'Agua', mark: 'A' }] } })
  const d = { ...base, habits: { [day]: ['agua', 'borrado'] },
    reading: [{ id: 'r1', day, minutes: 5, seconds: 300, note: '', title: 'Libro' }, { id: 'r2', day, minutes: 0, note: '', title: 'x', estimated: true }],
    sets: [{ id: 's1', day, at: 1, exercise: 'pushup', reps: 8 }, { id: 's2', day, at: 2, exercise: 'pushup', reps: 8 }],
    activities: [rescueRow('Tomar agua', day), { id: 'f', day, kind: 'football', minutes: 60 }] }
  const v = votesOn(d, day)
  assert.equal(v.by.lectura, 1, 'la lectura estimada sin confirmar no vota')
  assert.equal(v.by.entreno, 1, 'el entreno es un voto por día, no por serie')
  assert.equal(v.by.habito, 1, 'un hábito que ya no existe no vota')
  assert.equal(v.by.rescate, 1)
  assert.equal(v.total, 4)
  assert.ok(isRescue(rescueRow('x')) && !isRescue({ id: 'o', day, kind: 'other', note: 'otra cosa' }))
  const t = dayTime(d, day)
  assert.equal(t.lectura, 5); assert.equal(t.entreno, 64); assert.equal(t.rescates, 1)
  assert.equal(neverTwice(new Set(['2026-11-19']), day), 'save', 'ayer faltó y antier sí: hoy se rescata')
  assert.equal(neverTwice(new Set(['2026-11-20']), day), null, 'ayer sí leyó: no hay aviso')
  assert.equal(neverTwice(new Set(['2026-11-10']), day), 'fresh')
  assert.equal(neverTwice(new Set(), day), null, 'alguien nuevo no recibe aviso de racha perdida')
  assert.equal(voteLine('alguien constante', 1), 'Tu primer hecho de hoy. Sigue.')
  assert.equal(votesOn({ ...base, habits: {} }, day).total, 0)
}
ok('votos por tu norte: un voto por acción real, entreno por día, rescates y nunca falles dos veces')

// Versículos sueltos (verses.ts) y nivel de arranque del coach
{
  assert.deepEqual([...parseVerses('16-18,21')], [16, 17, 18, 21])
  assert.equal(formatVerses([21, 16, 17, 18, 3]), '3,16-18,21')
  let b = addVerseMark([], 43, 3, [16, 17, 18], 36, '2026-11-21')
  assert.equal(b[0].verses, '16-18', 'unos versículos dejan el capítulo a medias')
  b = addVerseMark(b, 43, 3, [19, 20], 36, '2026-11-22')
  assert.equal(b[0].verses, '16-20'); assert.equal(b[0].day, '2026-11-21', 'conserva el día en que empezó')
  b = addVerseMark(b, 43, 3, Array.from({ length: 36 }, (_, i) => i + 1), 36, '2026-11-23')
  assert.equal(b[0].verses, undefined, 'al leer todos, el capítulo queda completo'); assert.equal(b.length, 1)
  assert.equal(addVerseMark(b, 43, 3, [1], 36, '2026-11-24'), b, 'un capítulo completo no se toca')
  const base = normalizeData({ ...EMPTY_DATA })
  const nuevo = normalizeData({ ...base, settings: { ...base.settings, trainingLevel: 1, equipment: ['nada', 'pared', 'silla'] } })
  const avanzado = normalizeData({ ...base, settings: { ...base.settings, trainingLevel: 4, equipment: ['nada', 'pared', 'silla'] } })
  assert.equal(nuevo.settings.trainingLevel, 1, 'el nivel sobrevive al limpiar')
  assert.ok(currentForSlot(nuevo, 'empuje').level < currentForSlot(avanzado, 'empuje').level, 'nivel 1 arranca más abajo que nivel 4')
  assert.equal(currentForSlot(base, 'empuje').id, 'pushup', 'sin nivel, arranca como antes')
}
ok('versículos sueltos se suman al capítulo y el coach arranca en el escalón de tu nivel')

// Estiramiento diario (stretch.ts): dura lo prometido, sobrevive al guardarse y suma su voto
{
  for (const w of ['manana', 'noche']) {
    const t = totalSeconds(stepsOf(w))
    assert.ok(t >= 240 && t <= 600, `${w}: la rutina dura entre 4 y 10 minutos (dura ${t} s)`)
    const short = totalSeconds(stepsOf(w, true))
    assert.ok(short >= 120 && short < 180, `${w}: la versión sin ganas ronda los 2 minutos (dura ${short} s)`)
  }
  assert.equal(stepsOf('noche').filter(s => s.name === 'Flexor de cadera').length, 4, 'lo que va por lado se hace de los dos lados')
  const base = normalizeData({ ...EMPTY_DATA })
  const day = '2026-11-22'
  const rows = [stretchRow('manana', 270, day), stretchRow('noche', 480, day), stretchRow('noche', 480, day), stretchRow('noche', 480, '2026-11-21')]
  const d = normalizeData({ ...base, activities: rows })
  assert.equal(d.activities.filter(isStretch).length, 4, 'el estiramiento sobrevive a normalizeData (no se pierde al sincronizar)')
  assert.deepEqual([...stretchedOn(d, day)].sort(), ['manana', 'noche'])
  assert.equal(votesOn(d, day).by.estira, 2, 'mañana y noche suman, repetir no infla')
  assert.equal(votesOn(d, day).by.entreno, 0, 'estirar no cuenta como entrenar')
  assert.equal(votesOn(d, day).by.rescate, 0, 'un estiramiento no es un rescate')
  assert.equal(stretchStreak(d, day), 2)
  assert.equal(stretchStreak(d, '2026-11-23'), 2, 'si hoy todavía no, la racha cuenta hasta ayer')
  assert.equal(stretchStreak(d, '2026-11-24'), 0)
  assert.equal(dayTime(d, day).entreno, 5 + 8 + 8, 'sus minutos entran a tu día medido')
  assert.equal(stretchSlot(7), 'manana'); assert.equal(stretchSlot(22), 'noche'); assert.equal(stretchSlot(15), null)
}
ok('estiramiento: dura lo prometido, sobrevive al guardarse, suma su voto y lleva racha')

// Marca predecible (docs/BRAND.md): tokens.css es el único dueño de los colores
{
  const css = f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const hex = t => (t.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length
  assert.equal(hex(css('v4.css')), 0, 'v4.css: usa var(--token), no colores sueltos')
  assert.equal(hex(css('v5.css')), 0, 'v5.css: usa var(--token), no colores sueltos')
  assert.equal(hex(css('v6.css')), 0, 'v6.css: usa var(--token), no colores sueltos')
  // Trinquete: los archivos viejos solo pueden BAJAR de colores sueltos. Si bajas uno, baja aquí el número.
  const LEGACY = { 'app.css': 157, 'brote.css': 158, 'features.css': 51, 'index.css': 180 }
  for (const [f, max] of Object.entries(LEGACY)) assert.ok(hex(css(f)) <= max, `${f} subió de ${max} colores sueltos: usa tokens`)
  // Todo token usado existe: un var(--mal-escrito) en CSS falla en silencio.
  assert.equal(hex(css('v7.css')), 0)
  const all = ['v7.css', 'tokens.css', 'v4.css', 'v5.css', 'v6.css', 'app.css', 'brote.css', 'features.css', 'index.css'].map(css).join('\n')
  const defined = new Set([...all.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))
  const used = [...css('v7.css').matchAll(/var\((--[\w-]+)/g), ...css('v4.css').matchAll(/var\((--[\w-]+)/g), ...css('v5.css').matchAll(/var\((--[\w-]+)/g), ...css('v6.css').matchAll(/var\((--[\w-]+)/g), ...css('tokens.css').matchAll(/var\((--[\w-]+)/g)].map(m => m[1])
  const missing = [...new Set(used.filter(t => !defined.has(t) && t !== '--p'))]
  assert.deepEqual(missing, [], 'tokens usados que no existen')
  // El nombre se escribe igual en todos lados: bambú, en minúscula y con acento.
  const shell = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8') + fs.readFileSync(path.join(__dirname, '../public/manifest.webmanifest'), 'utf8')
  assert.ok(!/\bbambu\b/.test(shell.replace(/bambu-/g, '')), 'index.html o manifest dicen "bambu" sin acento')
}
ok('marca predecible: v4 sin colores sueltos, trinquete en CSS viejo, tokens existentes y el nombre siempre bambú')

// Biblia católica completa y legible sin señal (bible.ts + public/biblia/bll)
{
  const B = moduleOf('bible')
  assert.equal(B.BOOKS.length, 73); assert.equal(B.TOTAL_CHAPTERS, 1328)
  assert.ok(B.BOOKS.every((b, i) => b.id === i + 1), 'BOOKS[id - 1] debe ser el libro id')
  assert.equal(B.book(27).chapters, 14)                                   // Daniel católico
  assert.equal(new Set(B.CANON).size, 73); assert.equal(new Set(B.ROUTE).size, 73)
  assert.equal(B.CANON[B.CANON.indexOf(16) + 1], 67)                       // Tobías va después de Nehemías
  assert.equal(B.CANON[B.CANON.indexOf(25) + 1], 73)                       // Baruc después de Lamentaciones
  assert.deepEqual(B.nextAfter(67, 14, 'canonico'), { book: 68, chapter: 1 })
  assert.deepEqual(B.nextAfter(43, 3, 'ruta'), { book: 43, chapter: 4 })
  assert.equal(B.nextAfter(66, 22, 'canonico'), null)
  // Un capítulo de Tobías no se pierde al guardarse ni al viajar por la nube.
  const tob = normalizeData({ ...EMPTY_DATA, bible: [{ id: '67:3', book: 67, chapter: 3, day: '2026-11-16' }], reading: [{ id: 'r', day: '2026-11-16', minutes: 10, note: '', bible: [{ book: 70, from: 1, to: 2 }] }] })
  assert.equal(tob.bible.length, 1); assert.equal(tob.reading[0].bible[0].book, 70)
  assert.equal(applyRecords({ ...EMPTY_DATA }, toRecords(tob)).bible[0].book, 67)
  assert.equal(normalizeData({ ...EMPTY_DATA, bible: [{ id: '74:1', book: 74, chapter: 1, day: '2026-11-16' }] }).bible.length, 0)
  // Cada archivo de texto existe y trae exactamente los capítulos que espera el seguimiento.
  const dir = path.join(__dirname, '../public/biblia/bll')
  for (const b of B.BOOKS) {
    const t = JSON.parse(fs.readFileSync(path.join(dir, `${b.id}.json`), 'utf8'))
    assert.equal(t.id, b.id); assert.equal(t.capitulos.length, b.chapters, `${b.name}: capítulos`)
    assert.ok(t.capitulos.every(c => c.length > 0 && c.every(([n, v]) => n > 0 && v.length > 0)), `${b.name}: capítulo vacío`)
  }
  assert.match(JSON.parse(fs.readFileSync(path.join(dir, 'indice.json'), 'utf8')).licencia, /Dominio público/)
}
ok('Biblia católica: 73 libros en su orden, Tobías sobrevive al guardarse y el texto cuadra capítulo por capítulo')

// Comida: registro, motor por edad y apretar tuercas
{
  const N = moduleOf('nutrition'), F = moduleOf('foods'), H = moduleOf('habitCoach'), V = moduleOf('pageVerses')
  const { modulesOf } = moduleOf('model')
  const day = '2026-11-22'
  const egg2 = F.itemOf(F.foodById('huevo'), 2), tort = F.itemOf(F.foodById('tortilla'), 3), apple = F.itemOf(F.foodById('manzana'), 1), chicken = F.itemOf(F.foodById('pollo'), 1)
  assert.equal(egg2.kcal, 144); assert.equal(egg2.protein, 12.6)
  const meals = [
    { id: 'm1', day, at: 1, slot: 'desayuno', items: [egg2, tort] },
    { id: 'm2', day, at: 2, slot: 'comida', items: [chicken, apple, F.itemOf(F.foodById('ensalada'), 1)] },
    { id: 'm3', day, at: 3, slot: 'colacion', items: [F.itemOf(F.foodById('refresco'), 1)] },
  ]
  const base = normalizeData({ ...EMPTY_DATA, meals })
  assert.equal(base.meals.length, 3, 'las comidas sobreviven a la limpieza')
  const t = N.dayTotals(base, day)
  assert.equal(t.proteinMeals, 2, 'huevo con tortilla (17 g) y pollo cuentan; el refresco no')
  assert.equal(t.produce, 2); assert.equal(t.sweets, 1); assert.equal(t.kcal, 144 + 195 + 165 + 95 + 15 + 140)
  assert.equal(N.proteinMealsOn(base, day), 2)
  assert.equal(N.proteinMealsOn(normalizeData({ ...EMPTY_DATA, checkins: [{ id: day, day, proteinMeals: 3 }] }), day), 3, 'sin comidas registradas vale el check-in')
  // Viaja a la nube y regresa igual
  const rows = diffRecords(EMPTY_DATA, base)
  assert.equal(rows.filter(r => r.collection === 'meal').length, 3)
  assert.deepEqual(applyRecords(EMPTY_DATA, rows).meals, base.meals)
  assert.equal(normalizeData({ ...EMPTY_DATA, meals: [{ id: 'x', day, items: [] }] }).meals.length, 0, 'comida vacía no entra')
  // Módulo: perfiles viejos lo ven encendido
  assert.equal(modulesOf(normalizeData({ ...EMPTY_DATA, settings: { modules: { reading: true, bible: true, training: true, focus: true } } }).settings).food, true)
  // Menor de edad: modo crecimiento, sin calorías
  const kid = normalizeData({ ...EMPTY_DATA, meals, settings: { age: 13 }, body: [{ day, weightKg: 50, heightCm: 160 }] })
  const kp = N.planFor(kid, Date.parse(`${day}T20:00:00`))
  assert.equal(kp.mode, 'crecimiento'); assert.equal('kcal' in kp, false, 'un menor no recibe meta de calorías')
  assert.equal(kp.perMealProtein, 15)
  // Comió de menos ayer con fútbol: se le avisa que coma más
  const y = '2026-11-21'
  const hungry = normalizeData({ ...kid, meals: [1, 2, 3].map(i => ({ id: 'h' + i, day: y, at: i, slot: 'comida', items: [F.itemOf(F.foodById('manzana'), 1)] })), activities: [{ id: 'f', day: y, kind: 'football', minutes: 60 }] })
  assert.equal(N.planFor(hungry, Date.parse(`${day}T09:00:00`)).fuel, 'bajo')
  const fed = normalizeData({ ...hungry, meals: [1, 2, 3, 4].map(i => ({ id: 'g' + i, day: y, at: i, slot: 'comida', items: [F.itemOf(F.foodById('torta'), 1), F.itemOf(F.foodById('leche'), 1)] })) })
  assert.equal(N.planFor(fed, Date.parse(`${day}T09:00:00`)).fuel, 'bien')
  // Adulto: fase por cintura y estatura, no por somatotipo
  assert.equal(N.decidePhase('musculo', 0.53, 3).phase, 'definir')
  assert.equal(N.decidePhase('musculo', 0.52, 0).phase, 'recomponer')
  assert.equal(N.decidePhase('musculo', 0.43, 2).phase, 'ganar')
  assert.equal(N.decidePhase('definir', 0.40, 2).phase, 'mantener')
  assert.equal(N.decidePhase('ambos', 0.47, 0.5).phase, 'recomponer')
  const adultBody = [{ day, weightKg: 80, heightCm: 180, waistCm: 95 }]
  const ap = N.planFor(normalizeData({ ...EMPTY_DATA, settings: { age: 30, nutrition: { sex: 'h', goal: 'definir', trainingYears: 3 } }, body: adultBody }), Date.parse(`${day}T12:00:00`))
  assert.equal(ap.mode, 'adulto'); assert.equal(ap.phase, 'definir'); assert.equal(ap.protein, 176)
  assert.ok(ap.kcal < ap.tdee.value && ap.kcal >= 1780, `déficit con piso: ${ap.kcal} vs ${ap.tdee.value}`)
  assert.deepEqual(N.planFor(normalizeData({ ...EMPTY_DATA, settings: { age: 30 } }), Date.now()).missing, ['sexo', 'estatura', 'peso', 'meta'])
  // Calibra con tu cuerpo: 21 días comiendo 2500 y bajando 0.05 kg al día = gasto ~2885
  const cal = { ...EMPTY_DATA, settings: { age: 30, nutrition: { sex: 'h', goal: 'ambos', trainingYears: 3 } }, meals: [], body: [] }
  for (let i = 1; i <= 21; i++) {
    const d = N.shiftDay(day, -i)
    cal.meals.push({ id: 'c' + i, day: d, at: i, slot: 'comida', items: [{ name: 'A', qty: 1, unit: 'x', kcal: 1250, protein: 40, group: 'platillo' }] }, { id: 'd' + i, day: d, at: i + 100, slot: 'cena', items: [{ name: 'B', qty: 1, unit: 'x', kcal: 1250, protein: 40, group: 'platillo' }] })
    cal.body.push({ day: d, weightKg: 80 + 0.05 * i, heightCm: 180 })
  }
  const tdee = N.tdeeOf(normalizeData(cal), day, 2400)
  assert.equal(tdee.source, 'tu-cuerpo'); assert.ok(Math.abs(tdee.value - 2885) < 5, `gasto ${tdee.value}`)
  assert.equal(N.tdeeOf(normalizeData({ ...cal, meals: cal.meals.slice(0, 10) }), day, 2400).source, 'formula', 'con 5 días registrados manda la fórmula')
  // Apretar tuercas
  const habits = [{ id: 'bible', label: 'Biblia', mark: 'B' }, { id: 'english', label: 'Inglés', mark: 'I' }]
  const allDays = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [N.shiftDay(day, -i), ['bible', 'english']]))
  let habData = normalizeData({ ...EMPTY_DATA, settings: { habits }, habits: allDays })
  const done = (h, d) => (habData.habits[d] ?? []).includes(h.id)
  const now = Date.parse(`${day}T12:00:00`)
  const advice = H.habitAdvice(habData, done, now)
  assert.equal(advice.kind, 'add'); assert.equal(advice.idea.id, 'proteina-desayuno', 'con Comida encendida y buen sueño, va lo de comida')
  const accepted = H.acceptIdea(habData, advice.idea, now)
  assert.ok(accepted.settings.habits.some(h => h.id === advice.idea.id))
  assert.equal(H.habitAdvice(normalizeData(accepted), done, now), null, 'recién aceptado: espera dos semanas')
  const skipped = normalizeData(H.skipIdea(habData, advice.idea.id, now))
  assert.equal(H.habitAdvice(skipped, done, now), null)
  const later = normalizeData({ ...habData, settings: { ...habData.settings, habitSuggest: { lastDay: N.shiftDay(day, -15), skipped: [advice.idea.id] } } })
  assert.equal(H.habitAdvice(later, done, now).kind, 'add')
  assert.notEqual(H.habitAdvice(later, done, now).idea.id, advice.idea.id, 'lo que dijiste que no, no vuelve')
  habData = normalizeData({ ...EMPTY_DATA, settings: { habits }, habits: Object.fromEntries(Object.keys(allDays).slice(0, 4).map(d => [d, ['bible']]).concat([[N.shiftDay(day, -19), []]])) })
  assert.equal(H.habitAdvice(habData, done, now).kind, 'tighten', 'si vas flojo no agrega: afianza')
  assert.equal(H.habitAdvice(habData, done, now).weakest.id, 'english')
  // Versículos: 4 por página, texto real, sin puntuación prohibida
  for (const [page, list] of Object.entries(V.PAGE_VERSES)) {
    assert.equal(list.length, 4, page)
    list.forEach(v => { assert.ok(v.text.length > 20 && v.text.length < 400); assert.doesNotMatch(v.text, /—|\.\.\.|…/) })
  }
}
{
  // El héroe pide la comida justo después de comer, solo a quien ya usa Comida
  const day = '2026-11-22', N = moduleOf('nutrition')
  const item = { name: 'Huevo', qty: 2, unit: 'pieza', kcal: 144, protein: 12.6, group: 'proteina' }
  const reader = { settings: { modules: { reading: true, bible: true, training: false, focus: false, food: true } }, reading: [{ id: 'r', day, minutes: 10, seconds: 600, note: '', title: 'Libro' }], checkins: [{ id: day, day, capacity: 60 }] }
  const used = normalizeData({ ...EMPTY_DATA, ...reader, meals: [{ id: 'y', day: N.shiftDay(day, -1), at: 1, slot: 'comida', items: [item] }] })
  assert.equal(nextStep(used, Date.parse(day + 'T15:00:00')).id, 'meal')
  assert.equal(nextStep(normalizeData({ ...used, meals: [...used.meals, { id: 't', day, at: 2, slot: 'comida', items: [item] }] }), Date.parse(day + 'T15:00:00')).id === 'meal', false, 'ya registrada, no insiste')
  assert.notEqual(nextStep(normalizeData({ ...EMPTY_DATA, ...reader }), Date.parse(day + 'T15:00:00')).id, 'meal', 'sin adoptar Comida no estorba')
}
ok('comida: totales, nube, modo crecimiento sin calorías, fase por cintura, gasto calibrado con tu cuerpo, apretar tuercas y versículos')


// Versión de Kiki: rutina propia, subir solo, cama, candado de redes y jardín
{
  const R = moduleOf('rutina'), J = moduleOf('jardin')
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, modules: { reading: false, bible: false, training: true, focus: true, food: false }, habits: [{ id: 'agua', label: 'Tomar agua', mark: 'A' }], train: R.seedWeek() } })
  assert.equal(base.settings.train.week.length, 7)
  assert.equal(base.settings.train.week[2].items[0].when, 'before')
  const rt = R.routineFor(base, wed)
  assert.equal(rt.title, 'Espalda, bíceps y antebrazo')
  const steps = R.stepsOf(rt)
  assert.equal(steps[0].item.name, 'Muscle up')
  assert.equal(steps.at(-1).item.name, 'Chin ups')
  assert.equal(steps.filter(x => x.item.name === 'Dominadas').length, 5)
  assert.equal(steps.filter(x => x.item.name === 'Curl de toalla superior').length, 3)
  const pull = rt.items.find(i => i.name === 'Curl de toalla superior')
  let d = base
  for (let k = 0; k < 3; k++) d = R.logSet(d, '2026-11-02', pull, 15, at('2026-11-02', 18) + k)
  for (let k = 0; k < 3; k++) d = R.logSet(d, '2026-11-03', pull, 15, at('2026-11-03', 18) + k)
  assert.equal(R.bumpFor(d, rt, pull, wed), 16)
  assert.equal(R.bumpFor(R.undoLast(d, '2026-11-03', pull.name), rt, pull, wed), null)
  const short = R.logSet(R.undoLast(d, '2026-11-03', pull.name), '2026-11-03', pull, 12)
  assert.equal(R.bumpFor(short, rt, pull, wed), null)
  const quiet = { ...d, settings: { ...d.settings, train: R.quietBump(d.settings.train, pull.name, '2026-11-03') } }
  { const qr = R.routineFor(quiet, wed); assert.equal(R.bumpFor(quiet, qr, qr.items.find(i => i.name === pull.name), wed), null) }
  const bumped = R.applyBump(d.settings.train, pull.name, 16)
  assert.equal(bumped.week[2].items.find(i => i.name === pull.name).target, 16)
  assert.equal(bumped.week[5].items.find(i => i.name === pull.name).target, 16)
  const hold = rt.items.find(i => i.kind === 'seconds')
  assert.equal(R.logSet(base, wed, hold, 28).sets[0].seconds, 28)
  assert.equal(R.lockActive(base, wed, '18:59'), false)
  assert.equal(R.lockActive(base, wed, '19:00'), true)
  assert.equal(R.lockActive(R.logSet(base, wed, pull, 15), wed, '20:00'), false)
  assert.equal(R.lockActive({ ...base, settings: { ...base.settings, train: { ...base.settings.train, lock: false } } }, wed, '20:00'), false)
  const late = nfcServerAction(base, { tag: 'pause', app: 'instagram', outcome: { kind: 'pase', minutes: 10 } }, at(wed, 20), wed, '20:00')
  assert.equal(late.locked, true)
  assert.equal(late.next, base)
  const early = nfcServerAction(base, { tag: 'pause', app: 'instagram', outcome: { kind: 'pase', minutes: 10 } }, at(wed, 12), wed, '12:00')
  assert.equal(early.locked, undefined)
  assert.equal(parseNfc('?nfc=cama&k=x').tag, 'cama')
  const bed = nfcServerAction(base, { tag: 'cama' }, at(wed, 7), wed, '06:42')
  assert.equal(bed.title, 'Cama tendida a las 06:42')
  assert.ok(bed.next.settings.habits.some(h => h.id === 'cama'))
  assert.deepEqual(bed.next.habits[wed], ['cama'])
  assert.equal(J.wakeOn(bed.next, wed), '06:42')
  assert.equal(nfcServerAction(bed.next, { tag: 'cama' }, at(wed, 8), wed, '07:10').title, 'Tu cama ya estaba')
  assert.equal(J.wakeOn(nfcServerAction(bed.next, { tag: 'cama' }, at(wed, 8), wed, '07:10').next, wed), '06:42')
  const empty = J.dayScore(base, wed)
  assert.equal(empty.total, 2)
  assert.equal(empty.pct, 0)
  const agua = { ...base, habits: { [wed]: ['agua'] } }
  assert.equal(J.dayScore(agua, wed).pct, 0.5)
  assert.equal(J.stage(0), 0); assert.equal(J.stage(0.5), 2); assert.equal(J.stage(0.9), 3); assert.equal(J.stage(1), 4)
  let full = agua
  for (const st of R.stepsOf(rt)) full = R.logSet(full, wed, st.item, st.item.target)
  assert.equal(J.dayScore(full, wed).pct, 1)
  assert.equal(R.nextStep(full, wed, rt), null)
  const streakData = { ...base, habits: { '2026-11-02': ['agua'], '2026-11-03': ['agua'], [wed]: ['agua'] }, settings: { ...base.settings, modules: { reading: false, bible: false, training: false, focus: true, food: false } } }
  const gs = J.gardenStats(streakData, wed)
  assert.equal(gs.current, 3)
  assert.equal(gs.perfect, 3)
  assert.equal(J.gardenWeeks(wed, 2)[1][0], '2026-11-02')
  assert.equal(J.habitFrequency(streakData, { id: 'agua', label: 'Tomar agua', mark: 'A' }, wed, 7).marks.filter(Boolean).length, 3)
  ok('kiki: rutina en circuito, subir solo tras 2 sesiones completas, cama con hora, candado de redes y jardín con racha')
}

{
  const X = moduleOf('xp'), R = moduleOf('rutina')
  assert.deepEqual(X.levelOf(0), { level: 1, into: 0, need: 100, pct: 0 })
  assert.equal(X.levelOf(100).level, 2)
  assert.equal(X.levelOf(249).level, 2)
  assert.equal(X.levelOf(250).level, 3)
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, habits: [{ id: 'agua', label: 'Tomar agua', mark: 'A' }, { id: 'cama', label: 'Tender la cama', mark: 'T' }], train: R.seedWeek() } })
  assert.equal(X.xpOn(base, wed), 0)
  const one = { ...base, habits: { [wed]: ['agua'] } }
  assert.equal(X.xpOn(one, wed), 10)
  const set = R.logSet(one, wed, R.routineFor(one, wed).items[1], 5)
  assert.equal(X.xpOn(set, wed), 12)
  assert.equal(X.totalXp(set, wed), 12)
  assert.equal(X.broteLine(base, at(wed, 8)).text, '¡Buenos días! Tiende tu cama y toca la etiqueta.')
  assert.equal(X.broteLine(base, at(wed, 20)).mood, 'susto')
  assert.equal(X.broteLine(base, at(wed, 14)).text, 'Hoy toca espalda, bíceps y antebrazo. Antes de las 19:00.')
  ok('kiki: XP por objetivo y serie, niveles que crecen y Brote según cómo vas')
}

{
  const L = moduleOf('lectura'), J = moduleOf('jardin'), X = moduleOf('xp')
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, modules: { reading: true, bible: false, training: false, focus: true, food: false }, habits: [] } })
  assert.equal(J.dayScore(base, wed).total, 1)
  assert.equal(L.readOn(base, wed), false)
  const read = L.logReading(base, wed, { minutes: 20, book: 'Hábitos atómicos', pageTo: 40, mode: 'manual' })
  assert.equal(L.readOn(read, wed), true)
  assert.equal(read.works.length, 1)
  assert.equal(read.works[0].currentPage, 40)
  assert.equal(J.dayScore(read, wed).pct, 1)
  assert.equal(X.xpOn(read, wed), 10 + 20)
  const again = L.logReading(read, wed, { minutes: 10, book: 'hábitos atómicos', mode: 'manual' })
  assert.equal(again.works.length, 1)
  assert.equal(L.readingStats(again, wed).todayMinutes, 30)
  assert.equal(L.readingStats(again, wed).perBook[0].minutes, 30)
  const running = L.startReading(base, wed, 'Dune', 20, at(wed, 20))
  assert.equal(L.timerOf(running), 20)
  const stopped = L.stopReading(running, at(wed, 20) + 21 * 60000)
  assert.equal(stopped.activeReading, null)
  assert.equal(stopped.reading[0].minutes, 21)
  assert.equal(stopped.works[0].title, 'Dune')
  assert.equal(L.stopReading(running, at(wed, 20) + 10000).reading.length, 0)
  ok('kiki: leíste con libro, páginas y minutos; cronómetro y timer que guardan solos; cuenta en tu día y da XP')
}

{
  const R = moduleOf('rutina')
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, modules: { reading: false, bible: false, training: true, focus: true, food: false }, habits: [], train: R.seedWeek() } })
  const mon = '2026-11-03'
  const legs = R.routineFor(base, mon)
  assert.equal(legs.title, 'Piernas y abdomen')
  const names = legs.items.map(i => i.name)
  assert.ok(names.indexOf('Pistol squat') === names.indexOf('Wall sit') - 1)
  assert.equal(legs.items.find(i => i.name === 'Sentadillas').target, 15)
  const pistol = legs.items.find(i => i.name === 'Pistol squat')
  assert.equal(pistol.sides, true)
  assert.equal(R.setsNeeded(legs, pistol), 4)
  const ps = R.stepsOf(legs).filter(s => s.item.name === pistol.name)
  assert.deepEqual(ps.map(s => [s.round, s.side]), [[1, 1], [1, 2], [2, 1], [2, 2]])
  assert.equal(R.label(pistol), '5 reps por lado')
  let d = base
  for (const st of R.stepsOf(legs)) { if (st.item.name === pistol.name) break; d = R.logSet(d, mon, st.item, st.item.target) }
  assert.equal(R.nextStep(d, mon, legs).side, 1)
  d = R.logSet(d, mon, pistol, 5)
  const n2 = R.nextStep(d, mon, legs)
  assert.equal(n2.item.name, pistol.name); assert.equal(n2.side, 2)
  d = R.logSet(d, mon, pistol, 5)
  assert.equal(R.nextStep(d, mon, legs).item.name, 'Wall sit')
  assert.equal(normalizeData(d).settings.train.week[1].items.find(i => i.name === pistol.name).sides, true)
  ok('kiki: ejercicios por lado (izquierdo y derecho por ronda), pistol squat antes del wall sit y 15 sentadillas')
}

{
  const M = moduleOf('manana')
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'Kiki', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, habits: [{ id: 'dormir', label: 'Dormir a mi hora', mark: 'D' }, { id: 'pantallas', label: 'Sin pantallas antes de dormir', mark: 'P' }, { id: 'agua', label: 'Tomar agua', mark: 'A' }] } })
  const set = normalizeData(M.setupMorning(base))
  assert.equal(set.settings.morningSetup, true)
  assert.deepEqual(M.morningHabits(set).map(h => h.id), ['dormir', 'pantallas', 'cama', 'tel-hora'])
  assert.deepEqual(M.morningHabits(set).map(M.morningQuestion), ['¿Dormiste a tu hora?', '¿Dejaste las pantallas antes de dormir?', '¿Tendiste tu cama?', '¿Esperaste una hora antes de usar el teléfono?'])
  assert.equal(set.settings.habits.find(h => h.id === 'agua').when, undefined)
  assert.equal(M.setupMorning(set).settings.habits.length, 5)
  ok('kiki: mañana con dormir, pantallas, cama y una hora sin teléfono, en ese orden y sin duplicar')
}

{
  const J = moduleOf('jardin'), Li = moduleOf('libre'), X = moduleOf('xp')
  const off = { reading: false, bible: false, training: false, focus: true, food: false }
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, modules: off, habits: [{ id: 'agua', label: 'Tomar agua', mark: 'A' }] } })
  const withDays = days => ({ ...base, habits: Object.fromEntries(days.map(d => [d, ['agua']])) })
  const one = withDays(['2026-11-02', '2026-11-04'])
  const s1 = J.gardenStats(one, '2026-11-05')
  assert.equal(s1.current, 2)
  assert.deepEqual(s1.frozen, ['2026-11-03'])
  assert.equal(s1.freezeWeek, '2026-11-03')
  const two = withDays(['2026-11-02', '2026-11-05'])
  assert.equal(J.gardenStats(two, '2026-11-06').current, 1)
  const cross = withDays(['2026-11-08', '2026-11-10'])
  assert.equal(J.gardenStats(cross, '2026-11-10').current, 2)
  const mk2 = (id, day, reps, ex = 'Lagartijas', seconds) => ({ id, day, at: Date.parse(`${day}T18:00:00`), exercise: ex, ...(seconds ? { seconds } : { reps }) })
  const sets = [mk2('a', '2026-10-27', 12), mk2('b', '2026-10-28', 15), mk2('c', '2026-10-29', 14), mk2('d', '2026-10-29', 40, 'Plancha', 40), mk2('e', '2026-10-30', 0, 'Caminar')].map(x => x.exercise === 'Caminar' ? { ...x, reps: 1, note: 'hecho' } : x)
  const t = { ...base, sets }
  const rec = Li.records(t)
  assert.equal(rec.get('Lagartijas').best, 15)
  assert.equal(rec.get('Lagartijas').sets, 3)
  assert.equal(rec.get('Plancha').kind, 'seconds')
  assert.equal(rec.has('Caminar'), false)
  const ch = Li.weeklyChallenge(t, '2026-11-04')
  const catLag = moduleOf('rutina').CATALOG.find(c => c[0] === 'Lagartijas')[2]
  assert.equal(ch.name, 'Lagartijas'); assert.equal(ch.target, catLag); assert.equal(ch.doneDay, null)
  const conCam = { ...t, sets: [...sets, { ...mk2('k', '2026-10-28', 20), note: 'camara' }] }
  assert.equal(Li.weeklyChallenge(conCam, '2026-11-04').target, 22)
  assert.equal(Li.weeklyChallenge({ ...t, sets: [...sets, mk2('f', '2026-11-04', 16)] }, '2026-11-05').doneDay, null)
  const done = { ...t, sets: [...sets, { ...mk2('f', '2026-11-04', Math.max(16, catLag)), note: 'camara' }] }
  assert.equal(Li.records(done, undefined, true).get('Lagartijas').best, Math.max(16, catLag)); assert.equal(Li.records(done, undefined, true).get('Lagartijas').sets, 1); assert.equal(Li.records(t, undefined, true).size, 0)
  assert.equal(Li.weeklyChallenge(done, '2026-11-05').doneDay, '2026-11-04')
  assert.equal(Li.challengeXpOn(done, '2026-11-04'), 50)
  assert.equal(X.xpOn(done, '2026-11-04') - X.xpOn({ ...done, sets }, '2026-11-04'), 2 + 50)
  assert.equal(Li.weeklyChallenge(base, '2026-11-04'), null)
  ok('kiki: comodín de racha (1 por semana, no suma), récords por ejercicio y reto semanal con +50 XP que solo se cumple con la cámara')
}

{
  const C = moduleOf('cardio'), J = moduleOf('jardin'), X = moduleOf('xp'), R = moduleOf('rutina')
  const off = { reading: false, bible: false, training: false, focus: true, food: false }
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, modules: off, habits: [], walkDaily: true, train: { ...R.seedWeek(), week: R.seedWeek().week.map(rt => rt && { ...rt, items: [...rt.items, { id: 'w', name: 'Caminar 30 a 60 min', kind: 'free', target: 0, when: 'after' }] }) } } })
  assert.equal(J.dayScore(base, wed).total, 1)
  const w20 = C.logCardio(base, wed, 'caminar', 20, 1.6)
  assert.equal(C.walkDone(w20, wed), false)
  const w35 = normalizeData(C.logCardio(w20, wed, 'caminar', 15))
  assert.equal(C.walkMinutes(w35, wed), 35)
  assert.equal(J.dayScore(w35, wed).pct, 1)
  const bike = normalizeData(C.logCardio(w35, wed, 'bici', 40, 12.345))
  assert.equal(bike.activities.find(a => a.sport === 'bici').km, 12.35)
  assert.equal(C.cardioXpOn(bike, wed), 20)
  const st = C.cardioStats(bike, '2026-11-02', wed)
  assert.equal(st.caminar.minutes, 35); assert.equal(st.caminar.km, 1.6); assert.equal(st.bici.bestKm, 12.35)
  const moved = C.removeWalkFromRoutine(base)
  assert.ok(moved.settings.train.week.every(rt => !rt || rt.items.every(i => !/caminar/i.test(i.name))))
  assert.equal(moved.settings.cardioSetup, true)
  ok('kiki: caminar obligatorio de 30 min, correr y bici con km, XP y sin caminar doble en la rutina')
}

{
  const A = moduleOf('aventura'), Li = moduleOf('libre')
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true } })
  let d = base
  assert.equal(A.adventure(d).current, 0)
  d = A.attack(d, wed, 0, 'Lagartijas', 'reps', 15, at(wed, 18))
  assert.equal(A.adventure(d).battles[0].dealt, 15)
  d = A.attack(d, wed, 0, 'Sentadillas', 'reps', 15, at(wed, 18) + 1)
  assert.equal(A.adventure(d).battles[0].dealt, 45)
  assert.equal(A.adventure(d).battles[0].defeatedDay, wed)
  assert.equal(A.adventure(d).current, 1)
  assert.equal(A.adventureXpOn(d, wed), 20)
  d = A.attack(d, wed, 1, 'Plancha', 'seconds', 40, at(wed, 18) + 2)
  assert.equal(A.adventure(d).battles[1].dealt, 20)
  assert.equal(normalizeData(d).sets.filter(s => s.note?.startsWith('aventura:')).length, 3)
  assert.equal(Li.records(d).get('Sentadillas').best, 15)
  ok('kiki: modo aventura con vida, debilidad x2, holds a mitad, monstruo vencido da XP y abre el siguiente')
}
{
  const av = moduleOf('aventura'); const ru = moduleOf('rutina'); const md = moduleOf('model')
  const base = { ...md.EMPTY_DATA, settings: { ...md.EMPTY_DATA.settings, train: ru.seedWeek() } }
  const rt = base.settings.train.week.find(r => r && r.items.some(i => i.name === 'Wall sit'))
  const wall = rt.items.find(i => i.name === 'Wall sit')
  const d1 = av.attack(base, '2026-11-24', 0, 'Wall sit', 'seconds', 30, 1)
  assert.equal(ru.doneCount(d1, '2026-11-24', wall), 0)
  const d2 = ru.logSet(d1, '2026-11-24', wall, 30, 2)
  assert.equal(ru.doneCount(d2, '2026-11-24', wall), 1)
  ok('aventura no cuenta como serie de la rutina')
}
{
  const A = moduleOf('aventura'), C = moduleOf('cardio'), md = moduleOf('model')
  const base = md.normalizeData({ ...md.EMPTY_DATA, profile: { name: 'K', onboardingComplete: true } })
  assert.equal(A.rollDodge(0, 20, () => 0.99), 0)
  const seq = [0, 0.5]; let k = 0
  const dodged = A.rollDodge(0, 20, () => seq[k++])
  assert.ok(dodged >= 1 && dodged < 20)
  assert.ok(A.dodgeChance(9) > A.dodgeChance(0))
  let d = A.attack(base, '2026-11-24', 0, 'Sentadillas', 'reps', 10, 1, 3)
  d = md.normalizeData(d)
  assert.equal(A.adventure(d).battles[0].dealt, 17)
  assert.equal(A.adventure(d).battles[0].dodged, 3)
  d = A.attack(d, '2026-11-24', 0, 'Sentadillas', 'reps', 12, 2)
  assert.equal(A.adventure(d).battles[0].defeatedDay, '2026-11-24')
  assert.ok(A.MONSTERS.every(m => m.name && m.title && m.scene))
  const walk = md.normalizeData(C.logCardio(base, '2026-11-24', 'caminar', undefined, 2.5))
  assert.equal(walk.activities[0].minutes, undefined)
  assert.equal(C.walkDone(walk, '2026-11-24'), true)
  assert.equal(C.walkLabel(walk, '2026-11-24'), '2.5 km')
  const half = C.logCardio(base, '2026-11-24', 'caminar', 15)
  assert.equal(C.walkProgress(half, '2026-11-24'), 0.5)
  ok('kiki: monstruos que esquivan y caminata por tiempo o distancia')
}
{
  const md = moduleOf('model'), Mz = moduleOf('mazmorra'), T = moduleOf('temporada'), Al = moduleOf('album'), Mu = moduleOf('musculos'), Li = moduleOf('libre'), C = moduleOf('cardio'), X = moduleOf('xp'), R = moduleOf('rutina')
  const day = '2026-11-24'
  const base = md.normalizeData({ ...md.EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...md.EMPTY_DATA.settings, train: R.seedWeek() } })
  const dg = Mz.dungeonOf(base, day)
  assert.equal(dg.rooms.length, 4)
  assert.deepEqual(Mz.dungeonOf(base, day).rooms.map(r => r.name), dg.rooms.map(r => r.name))
  assert.notDeepEqual(Mz.dungeonOf(base, '2026-11-25').rooms.map(r => r.name + r.target), dg.rooms.map(r => r.name + r.target).concat('x'))
  let d = base
  dg.rooms.forEach((r, k) => { d = Mz.clearRoom(d, day, k, r.name, r.kind, r.target, 10 + k) })
  d = md.normalizeData(d)
  assert.equal(Mz.dungeonOf(d, day).cleared, true)
  assert.equal(Mz.dungeonXpOn(d, day), Mz.DUNGEON_XP)
  const sts = d.settings.train.week.find(Boolean)
  assert.ok(sts.items.every(it => R.doneCount(d, day, it) === 0))
  const s0 = T.season(base, day)
  assert.equal(s0.name, 'Día de Muertos'); assert.equal(s0.daysLeft, 7); assert.equal(s0.monsters.length, 4)
  let e = T.seasonAttack(base, day, 0, 'Sentadillas', 'reps', 30, Date.parse('2026-11-24T18:00:00'))
  e = md.normalizeData(e)
  assert.equal(T.season(e, day).battles[0].defeatedDay, day)
  assert.equal(T.seasonXpOn(e, day), 30)
  assert.equal(T.season(e, '2026-12-01').current, 0)
  assert.equal(T.seasonInfo('2026-12').name, 'Posadas sin fin')
  const cards = Al.album(e, day)
  assert.ok(cards.find(c => c.id === 'tmp-2026-11-0').earned)
  assert.ok(cards.find(c => c.id === 'primera').earned)
  assert.ok(!cards.find(c => c.id === 'muscleup').earned)
  assert.ok(cards.filter(c => c.kind === 'Monstruos').length === 10)
  const mu = Mu.muscleStats(e, day, 'semana')
  assert.equal(mu.Piernas.sets, 1); assert.equal(mu.Piernas.reps, 30); assert.equal(mu.Piernas.level, 3)
  assert.equal(mu.Espalda.lastDay, null); assert.equal(mu.Espalda.level, 0)
  assert.ok(!('recovery' in mu.Piernas))
  assert.equal(Mu.muscleOf('Dominadas raras', 'Míos'), 'Espalda')
  assert.match(Mu.bodyAdvice(mu), /Lo que más entrenas: piernas \(1 serie\)/)
  const g = md.normalizeData({ ...base, sets: [{ id: 'g1', day: '2026-11-20', at: 1, exercise: 'Lagartijas', reps: 12 }, { id: 'g2', day: '2026-11-22', at: 2, exercise: 'Lagartijas', reps: 10 }] })
  assert.deepEqual(Li.ghostOf(g, 'Lagartijas', day), { value: 10, day: '2026-11-22', kind: 'reps' })
  assert.match(Li.ghostLine(12, Li.ghostOf(g, 'Lagartijas', day)), /ganaste a tu fantasma por 2/)
  const w = C.logCardio(base, '2026-11-22', 'correr', undefined, 3)
  assert.deepEqual(C.cardioGhost(w, 'correr', 'km', day), { value: 3, day: '2026-11-22' })
  assert.equal(C.cardioGhost(w, 'correr', 'minutes', day), null)
  assert.ok(Li.FAMOUS['Avanzados'].every(n => Li.exerciseList(base).some(x => x.name === n)))
  assert.ok(X.xpOn(d, day) >= Mz.DUNGEON_XP)
  ok('kiki: mazmorra, temporadas, álbum, músculos, fantasma y famosos')
}
{
  const md = moduleOf('model'), J = moduleOf('jefe'), A = moduleOf('aventura'), C = moduleOf('cardio'), X = moduleOf('xp'), Al = moduleOf('album')
  const mon = '2026-11-23', tue = '2026-11-24'
  const base = md.normalizeData({ ...md.EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...md.EMPTY_DATA.settings, walkDaily: true, habits: [] } })
  const sets = n => Array.from({ length: n }, (_, k) => ({ id: `s${k}`, day: mon, at: Date.parse(`${mon}T10:00:00`) + k, exercise: 'Lagartijas', reps: 10 }))
  let d = md.normalizeData({ ...base, sets: sets(10) })
  assert.equal(J.dayHit(d, mon).training, 15)
  assert.equal(J.dayHit(d, mon).armor, true)
  d = md.normalizeData(C.logCardio(d, mon, 'caminar', 30))
  assert.equal(J.dayHit(d, mon).total, 10 * J.HIT.set + J.HIT.walk)
  const wb = J.weeklyBoss(d, tue)
  assert.equal(wb.monday, mon); assert.equal(wb.monster.hp, 300); assert.equal(wb.dealt, 45); assert.equal(wb.defeatedDay, null)
  const big = md.normalizeData({ ...d, sets: Array.from({ length: 90 }, (_, k) => ({ id: `b${k}`, day: tue, at: Date.parse(`${tue}T10:00:00`) + k, exercise: 'Sentadillas', reps: 10 })) })
  const big2 = md.normalizeData(C.logCardio(big, tue, 'caminar', 30))
  assert.equal(J.weeklyBoss(big2, tue).defeatedDay, tue)
  assert.equal(J.bossXpOn(big2, tue), J.BOSS_XP)
  assert.ok(Al.album(big2, tue).find(c => c.id === 'jefe1').earned)
  let g = A.attack(base, tue, 0, 'Sentadillas', 'reps', 15, 1, 0)
  assert.equal(A.adventure(g).battles[0].defeatedDay, null)
  g = md.normalizeData(A.attack(g, tue, 0, 'Sentadillas', 'reps', 5, 2, 0))
  assert.equal(A.adventure(g).battles[0].dealt, 40)
  assert.equal(A.adventure(g).battles[0].defeatedDay, tue)
  assert.ok(A.rollDodge(9, 20, () => 0.25) > 0)
  assert.equal(A.rollDodge(0, 20, () => 0.12), 0)
  assert.equal(md.normalizeData({ ...base, settings: { ...base.settings, gear: ['botas'] } }).settings.gear, undefined)
  ok('kiki: jefe de la semana con tus hábitos')
}

const fmt = moduleOf('nubeFormato')
for (const t of ['2026-11-24T18:22:31.123456Z', '2026-01-01T00:00:00.000001Z', '1970-01-01T00:00:00.000000Z']) assert.equal(fmt.microsToTs(fmt.tsToMicros(t)), t)
assert.equal(fmt.tsToMicros('2026-11-24T18:22:31Z'), Date.parse('2026-11-24T18:22:31Z') * 1000)
assert.equal(fmt.tsToMicros('2026-11-24T18:22:31.5Z') - fmt.tsToMicros('2026-11-24T18:22:31Z'), 500000)
assert.equal(fmt.docId('set', 'a/b c').includes('/'), false)
const rowIn = { collection: 'set', id: 's1', payload: { id: 's1', reps: 12, exercise: 'Lagartijas' }, deleted: false, clientUpdatedAt: 1764000000123 }
const back = fmt.rowOf({ name: 'x', fields: { ...fmt.recordFields(rowIn), s: { timestampValue: '2026-11-24T18:22:31.000010Z' } } })
assert.deepEqual(back.row, rowIn)
assert.equal(back.s, fmt.tsToMicros('2026-11-24T18:22:31.000010Z'))
assert.equal(fmt.rowOf({ name: 'x', fields: { c: { stringValue: 'set' } } }), null)
assert.deepEqual(fmt.fieldsOf(fmt.encode({ a: 1, b: 1.5, c: 'x', d: { e: [true] }, f: undefined }).mapValue.fields), { a: 1, b: 1.5, c: 'x', d: { e: [true] } })
assert.equal(fmt.authError('400 INVALID_ARGUMENT EMAIL_EXISTS'), 'Ese correo ya tiene cuenta. Entra con tu contraseña.')
assert.equal(fmt.authError('400 INVALID_LOGIN_CREDENTIALS'), 'El correo o la contraseña no son correctos.')
assert.match(fmt.authError('algo raro'), /señal/)
ok('nube: horas al microsegundo, registros ida y vuelta, errores de cuenta en español')

const { buildPerfil, boards, ranking, perfilOf } = moduleOf('perfil')
const pday = '2026-11-25'
const pbase = normalizeData({ ...EMPTY_DATA, profile: { name: 'Kiki', onboardingComplete: true }, sets: [
  { id: 'a', day: pday, exercise: 'Lagartijas', reps: 20, at: Date.parse(`${pday}T10:00:00`), note: 'camara' },
  { id: 'b', day: pday, exercise: 'Lagartijas', reps: 25, at: Date.parse(`${pday}T10:05:00`), note: 'camara' },
  { id: 'b2', day: pday, exercise: 'Lagartijas', reps: 60, at: Date.parse(`${pday}T10:06:00`) },
  { id: 'c', day: pday, exercise: 'Plancha', seconds: 90, at: Date.parse(`${pday}T10:10:00`), note: 'camara' },
  { id: 'd', day: pday, exercise: 'Sentadillas', reps: 40, at: Date.parse(`${pday}T10:15:00`), note: 'aventura:0' },
  { id: 'e', day: pday, exercise: 'Remo raro', reps: 99, at: Date.parse(`${pday}T10:20:00`), note: 'camara' },
] })
assert.equal(buildPerfil(pbase, 'u1', pday), null)
const withT = normalizeData({ ...pbase, settings: { ...pbase.settings, tablas: { apodo: 'Kiki', avatar: 3 } } })
assert.deepEqual(withT.settings.tablas, { apodo: 'Kiki', avatar: 3 })
assert.equal(normalizeData({ ...pbase, settings: { ...pbase.settings, tablas: { apodo: '', avatar: 3 } } }).settings.tablas, undefined)
const mine = buildPerfil(withT, 'u1', pday)
assert.equal(mine.apodo, 'Kiki')
assert.equal(mine.records.Lagartijas, 25)
assert.equal(mine.records.Plancha, 90)
assert.equal(mine.records.Sentadillas, undefined)
assert.equal('Remo raro' in mine.records, false)
assert.equal(mine.repsSemana, 20 + 25 + 99)
assert.equal(mine.seriesSemana, 4)
const bs = boards(pday)
const repsBoard = bs.find(b => b.id === 'reps')
assert.equal(repsBoard.value({ ...mine, semanaDe: '2026-11-17' }), 0)
const lag = bs.find(b => b.id === 'r:Lagartijas')
const ranks = ranking([mine, { ...mine, uid: 'u2', apodo: 'Ana', records: { Lagartijas: 30 } }, { ...mine, uid: 'u3', apodo: 'Beto', records: { Lagartijas: 25 } }, { ...mine, uid: 'u4', apodo: 'Cero', records: {} }], lag)
assert.deepEqual(ranks.map(r => [r.perfil.apodo, r.place]), [['Ana', 1], ['Beto', 2], ['Kiki', 2]])
assert.equal(perfilOf('x', { apodo: '' }), null)
assert.deepEqual(perfilOf('x', { apodo: 'Ana', xp: -5, records: { Lagartijas: 30, Hack: 999 } }).records, { Lagartijas: 30 })
assert.equal(perfilOf('x', { apodo: 'Ana', xp: -5 }).xp, 0)
ok('tablas: perfil con récords fijos, la aventura no infla la semana, empates comparten lugar')
const { relacion, buscar, codigoDe } = moduleOf('perfil')
const amigosData = normalizeData({ ...withT, settings: { ...withT.settings, amigos: ['uAnaXXXX01', 'uAnaXXXX01', 'u1', 'mal/id', 'corto'] } })
assert.deepEqual(amigosData.settings.amigos, ['uAnaXXXX01', 'u1'].filter(x => x.length >= 6))
const yo = buildPerfil(amigosData, 'u1', pday)
assert.deepEqual(yo.siguiendo, ['uAnaXXXX01'])
assert.ok(yo.xpSemana > 0)
assert.equal(normalizeData({ ...withT, settings: { ...withT.settings, amigos: [] } }).settings.amigos, undefined)
const ana = { ...yo, uid: 'uAnaXXXX01', apodo: 'Ána Fit', siguiendo: ['u1'] }
const beto = { ...yo, uid: 'uBetoYYYY2', apodo: 'Beto', siguiendo: [] }
const caro = { ...yo, uid: 'uCaroZZZZ3', apodo: 'Caro', siguiendo: ['u1'] }
assert.equal(relacion(yo, ana), 'amigos')
assert.equal(relacion({ ...yo, siguiendo: ['uBetoYYYY2'] }, beto), 'agregado')
assert.equal(relacion(yo, caro), 'teAgrego')
assert.equal(relacion(yo, beto), 'nada')
assert.deepEqual(buscar([yo, ana, beto], 'ana', 'u1').map(p => p.apodo), ['Ána Fit'])
assert.deepEqual(buscar([yo, ana, beto], codigoDe('uBetoYYYY2').toLowerCase(), 'u1').map(p => p.apodo), ['Beto'])
assert.deepEqual(buscar([yo, ana], 'kiki', 'u1'), [])
assert.equal(codigoDe('uBetoYYYY2'), 'uBetoYYY')
assert.deepEqual(perfilOf('x', { apodo: 'Ana', siguiendo: ['a', 3, 'b'] }).siguiendo, ['a', 'b'])
assert.ok(boards(pday).some(b => b.id === 'xpSemana' && b.value({ ...yo, semanaDe: '2020-01-06' }) === 0))
ok('amigos: lista limpia, relación mutua, buscar por apodo o código y XP de la semana')
const priv = { uid: 'uPrivAAAA9', siguiendo: [], privada: true }
assert.equal(relacion({ uid: 'u1', siguiendo: ['uPrivAAAA9'] }, priv, { visible: false, pendiente: true }), 'pendiente')
assert.equal(relacion({ uid: 'u1', siguiendo: ['uPrivAAAA9'] }, priv, { visible: false, pendiente: false }), 'nada')
assert.equal(relacion({ uid: 'u1', siguiendo: ['uPrivAAAA9'] }, { ...priv, siguiendo: ['u1'] }, { visible: true }), 'amigos')
assert.equal(relacion({ uid: 'u1', siguiendo: [] }, { ...priv, siguiendo: ['u1'] }, { visible: false }), 'teAgrego')
const privData = normalizeData({ ...withT, settings: { ...withT.settings, tablas: { apodo: 'Kiki', avatar: 3, privada: true }, aprobados: ['uAnaXXXX01', 'u1'] } })
assert.equal(privData.settings.tablas.privada, true)
const privP = buildPerfil(privData, 'u1', pday)
assert.equal(privP.publica, false)
assert.deepEqual(privP.aprobados, ['uAnaXXXX01'])
assert.equal(buildPerfil(withT, 'u1', pday).publica, true)
assert.deepEqual(buildPerfil(withT, 'u1', pday).aprobados, [])
const { dirOf } = moduleOf('perfil')
assert.deepEqual(dirOf(privP), { uid: 'u1', apodo: 'Kiki', avatar: 3, nivel: privP.nivel, privada: true, siguiendo: [] })
ok('privacidad: cuenta privada pide solicitud, pendiente o rechazada, y solo los aprobados ven tus números')

const { fusionar, faltantes, resumenLocal } = moduleOf('fusion')
const cuentaNueva = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, tablas: { apodo: 'Kiki', avatar: 1, privada: false }, amigos: ['uAnaXXXX01'] }, sets: [{ id: 'n1', day: pday, exercise: 'Plancha', seconds: 30, at: 1 }], habits: { [pday]: ['cama'] } })
const viejo = normalizeData({ ...EMPTY_DATA, profile: { name: 'Kiki real', onboardingComplete: true, north: 'Fuerte' }, settings: { ...EMPTY_DATA.settings, age: 30 }, sets: [{ id: 'v1', day: '2026-11-01', exercise: 'Lagartijas', reps: 20, at: 1 }, { id: 'n1', day: pday, exercise: 'Plancha', seconds: 99, at: 1 }], habits: { [pday]: ['tel-hora'], '2026-11-01': ['cama'] } })
assert.equal(faltantes(cuentaNueva, viejo), 3)
const juntos = fusionar(cuentaNueva, viejo)
assert.deepEqual(juntos.sets.map(x => x.id).sort(), ['n1', 'v1'])
assert.equal(juntos.sets.find(x => x.id === 'n1').seconds, 30)
assert.deepEqual(juntos.habits[pday].sort(), ['cama', 'tel-hora'])
assert.deepEqual(juntos.habits['2026-11-01'], ['cama'])
assert.equal(juntos.profile.name, 'Kiki real')
assert.equal(juntos.settings.age, 30)
assert.deepEqual(juntos.settings.tablas, { apodo: 'Kiki', avatar: 1, privada: false })
assert.deepEqual(juntos.settings.amigos, ['uAnaXXXX01'])
assert.equal(faltantes(juntos, viejo), 0)
assert.equal(resumenLocal(viejo).series, 2)
ok('datos de antes: se suben sin duplicar ni pisar lo de la cuenta, y conservan tu perfil social')

{
  const { pasoMedida, nuevoConteo, medir, angulo, esCamara, valorDe, patronDe } = moduleOf('conteo')
  const run = (ej, frames) => frames.reduce((c, [m, t]) => pasoMedida(c, m, t), nuevoConteo(ej))
  const M = (ang, extra = {}) => ({ visto: true, postura: true, recto: true, ang, ...extra })
  const ciclo = (t0, angs, paso = 150, extra = {}) => angs.map((a, i) => [M(a, extra), t0 + i * paso])
  const buena = [170, 130, 80, 80, 130, 170, 170]
  const tres = [...ciclo(0, buena), ...ciclo(2000, buena), ...ciclo(4000, buena)]
  assert.equal(run('Lagartijas', tres).reps, 3)
  const media = run('Lagartijas', ciclo(0, [170, 130, 110, 110, 130, 170, 170]))
  assert.equal(media.reps, 0); assert.equal(media.aviso, 'baja'); assert.ok(media.ultimaProf > 0.5 && media.ultimaProf < 1)
  const rapida = run('Lagartijas', ciclo(0, buena, 50))
  assert.equal(rapida.reps, 0); assert.equal(rapida.aviso, 'rapido')
  const chueca = run('Lagartijas', [[M(170), 0], [M(130, { recto: false }), 150], [M(80, { recto: false }), 300], [M(80), 450], [M(130), 600], [M(170), 750], [M(170), 900]])
  assert.equal(chueca.reps, 0); assert.equal(chueca.aviso, 'recto')
  const parado = run('Lagartijas', ciclo(0, buena, 150, { postura: false }))
  assert.equal(parado.reps, 0); assert.equal(parado.aviso, 'posicion')
  const oculto = run('Lagartijas', [[M(170), 0], [null, 150], [{ visto: false, postura: false, recto: false, ang: 80 }, 300], [M(170), 450]])
  assert.equal(oculto.reps, 0)
  assert.equal(run('Sentadillas', [...ciclo(0, [175, 140, 90, 90, 90, 140, 175, 175]), ...ciclo(2000, [175, 140, 90, 90, 90, 140, 175, 175])]).reps, 2)
  const plancha = run('Plancha', Array.from({ length: 126 }, (_, i) => [M(170, { recto: i < 100 }), i * 200]))
  assert.equal(plancha.segundos, 20); assert.equal(valorDe(plancha), 20)
  assert.equal(run('Plancha', [[M(170), 0], [M(170), 10000]]).segundos, 0)
  const sube = [[M(170), 0], [M(160), 200], [M(140), 400], [M(120), 600], [M(100), 800], [M(85, { arriba: true }), 1000], [M(120), 1300], [M(170), 1600], [M(170), 1800]]
  assert.equal(run('Dominadas', sube).reps, 1)
  assert.equal(run('Dominadas', [...sube, ...sube.map(([m, t]) => [m, t + 2000])]).reps, 2)
  const sinBarbilla = run('Dominadas', [[M(170), 0], [M(140), 300], [M(100), 600], [M(85), 900], [M(120), 1200], [M(170), 1500], [M(170), 1700]])
  assert.equal(sinBarbilla.reps, 0); assert.equal(sinBarbilla.aviso, 'sube')
  const P = (x, y, z = 0) => ({ x, y, z, v: 1 })
  const cuerpo = (o) => { const pts = Array.from({ length: 33 }, () => P(0.5, 0.5)); for (const [i, p] of Object.entries(o)) pts[i] = p; return { img: pts, mundo: pts } }
  const lado = (h, co, mu, ca, ro, to) => cuerpo({ 0: P(h.x - 0.1, h.y - 0.05), 11: h, 12: h, 13: co, 14: co, 15: mu, 16: mu, 23: ca, 24: ca, 25: ro, 26: ro, 27: to, 28: to })
  assert.equal(Math.round(angulo(P(0, 0), P(0, 0.25), P(0.25, 0.25))), 90)
  const arriba = medir('empuje', lado(P(0, 0), P(0, 0.25), P(0, 0.5), P(0.5, 0), P(0.9, 0.02), P(1.3, 0.04)))
  assert.ok(arriba.visto && arriba.postura && arriba.recto && arriba.ang > 175)
  const abajo = medir('empuje', lado(P(0, 0), P(0, 0.25), P(0.25, 0.25), P(0.5, 0), P(0.9, 0.02), P(1.3, 0.04)))
  assert.ok(abajo.postura && Math.round(abajo.ang) === 90)
  const dePie = medir('empuje', lado(P(0, 0), P(0, 0.25), P(0.25, 0.25), P(0, 0.5), P(0, 0.9), P(0, 1.3)))
  assert.equal(dePie.postura, false)
  const panza = medir('empuje', lado(P(0, 0), P(0, 0.25), P(0, 0.5), P(0.5, 0.3), P(0.9, 0.02), P(1.3, 0.04)))
  assert.equal(panza.recto, false)
  const borroso = lado(P(0, 0), P(0, 0.25), P(0, 0.5), P(0.5, 0), P(0.9, 0.02), P(1.3, 0.04)); borroso.img = borroso.img.map(p => ({ ...p, v: 0.2 }))
  assert.equal(medir('empuje', borroso).visto, false)
  const sentado = medir('sentadilla', lado(P(0, 0), P(0, 0.25), P(0, 0.5), P(0, 0.5), P(0.4, 0.5), P(0.4, 0.9)))
  assert.ok(sentado.postura && Math.round(sentado.ang) === 90)
  assert.ok(esCamara('Lagartijas') && esCamara('Plancha') && esCamara('Russian twist') && esCamara('Crunches') && !esCamara('Correr 5 km o bici') && !esCamara('Caminar 30 a 60 min') && !esCamara('Lagartijas', 'free'))
  assert.deepEqual(['Lagartijas diamante', 'Fondos en banco', 'Sentadilla búlgara', 'Chin ups', 'Plancha lateral', 'Wall sit', 'Colgarse de la barra', 'L sit', 'Handstand libre'].map(n => patronDe(n)), ['empuje', 'fondo', 'sentadilla', 'dominada', 'lateral', 'wallsit', 'colgado', 'lsit', 'parado'])
  assert.equal(nuevoConteo('Lagartijas explosivas').min, 350)
  assert.deepEqual(['Pike push ups', 'Handstand push up', 'Dominadas australianas', 'Toes to bar', 'Jumping jacks', 'Burpees', 'Hollow hold'].map(n => patronDe(n)), ['pike', 'hspu', 'remo', 'elevacion', 'saltos', 'burpee', 'hollow'])
  assert.equal(nuevoConteo('Toes to bar').abajo, 70)
  assert.deepEqual(['Lagartijas up', 'Lagartijas down', 'Lagartijas con toque de hombro', 'Muscle up', 'Remo con toalla en barra', 'Parado de cabeza'].map(n => patronDe(n)), ['empuje', 'empuje', 'empuje', 'dominada', 'remo', 'parado'])
  const R = (r) => ({ visto: true, postura: true, recto: true, ang: 170, r })
  const frente = (rs, t0 = 0) => rs.map((r, i) => [R(r), t0 + i * 150])
  assert.equal(run('Lagartijas', frente([1.4, 1.4, 1.0, 0.6, 0.6, 0.6, 1.0, 1.4, 1.4])).reps, 1)
  assert.equal(run('Lagartijas', [...frente([1.4, 1.4, 1.0, 0.6, 0.6, 0.6, 1.0, 1.4, 1.4]), ...frente([1.4, 1.0, 0.6, 0.6, 0.6, 1.0, 1.4, 1.4], 2000)]).reps, 2)
  const mediaFrente = run('Lagartijas', frente([1.4, 1.4, 1.0, 1.0, 1.0, 1.4, 1.4]))
  assert.equal(mediaFrente.reps, 0); assert.equal(mediaFrente.aviso, 'baja')
  assert.equal(run('Jumping jacks', ciclo(0, [165, 165, 100, 40, 40, 100, 165, 165], 120)).reps, 1)
  assert.equal(run('Burpees', ciclo(0, [175, 175, 120, 40, 20, 20, 40, 120, 175, 175], 300)).reps, 1)
  assert.equal(run('Burpees', ciclo(0, [175, 175, 120, 40, 20, 20, 40, 120, 175, 175], 100)).aviso, 'rapido')
  const plano = (o) => { const pts = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.9, z: 0, v: 0 })); for (const [i, p] of Object.entries(o)) pts[i] = p; return { img: pts, mundo: pts, aspecto: 1 } }
  const planchaFrente = medir('plancha', plano({ 0: P(0.5, 0.48), 11: P(0.35, 0.5), 12: P(0.65, 0.5), 13: P(0.35, 0.65), 14: P(0.65, 0.65), 15: P(0.4, 0.7), 16: P(0.6, 0.7) }))
  assert.ok(planchaFrente.visto && planchaFrente.postura)
  assert.equal(medir('plancha', plano({ 0: P(0.5, 0.3), 11: P(0.35, 0.5), 12: P(0.65, 0.5), 13: P(0.35, 0.65), 14: P(0.65, 0.65), 15: P(0.4, 0.7), 16: P(0.6, 0.7) })).postura, false)
  const empujeFrente = medir('empuje', plano({ 0: P(0.5, 0.4), 11: P(0.35, 0.5), 12: P(0.65, 0.5), 13: P(0.33, 0.62), 14: P(0.67, 0.62), 15: P(0.32, 0.75), 16: P(0.68, 0.75) }))
  assert.ok(empujeFrente.visto && Math.abs(empujeFrente.r - 0.25 / 0.3) < 0.01)
  const H = (hy) => ({ visto: true, postura: true, recto: true, ang: 180, hy, esc: 0.3 })
  const hombros = (ys, t0 = 0) => ys.map((y, i) => [H(y), t0 + i * 150])
  assert.equal(run('Lagartijas', hombros([0.4, 0.4, 0.5, 0.64, 0.64, 0.64, 0.5, 0.4, 0.4])).reps, 1)
  assert.equal(run('Lagartijas', [...hombros([0.4, 0.4, 0.5, 0.64, 0.64, 0.64, 0.5, 0.4, 0.4]), ...hombros([0.4, 0.5, 0.64, 0.64, 0.64, 0.5, 0.4, 0.4], 2000), ...hombros([0.4, 0.5, 0.64, 0.64, 0.64, 0.5, 0.4, 0.4], 4000)]).reps, 3)
  const mediaH = run('Lagartijas', hombros([0.4, 0.4, 0.48, 0.52, 0.52, 0.48, 0.4, 0.4]))
  assert.equal(mediaH.reps, 0); assert.equal(mediaH.aviso, 'baja')
  assert.equal(run('Lagartijas', hombros([0.4, 0.4, 0.5, 0.64, 0.64, 0.64, 0.5, 0.4, 0.4]).map(([m, t]) => [m, t / 4])).aviso, 'rapido')
  const sinManos = medir('empuje', plano({ 0: P(0.5, 0.42), 11: P(0.35, 0.5), 12: P(0.65, 0.5) }))
  assert.ok(sinManos.visto && sinManos.postura && sinManos.hy === 0.5 && Math.abs(sinManos.esc - 0.3) < 1e-9)
  assert.equal(medir('empuje', plano({ 0: P(0.5, 0.42), 11: P(0.35, 0.5), 12: P(0.65, 0.5), 23: P(0.4, 0.9), 24: P(0.6, 0.9) })).postura, false)
  const pike = medir('pike', lado(P(0, 0.5), P(0.1, 0.65), P(0.2, 0.8), P(0.4, 0.2), P(0.7, 0.5), P(0.9, 0.8)))
  assert.ok(pike.postura)
  assert.equal(medir('pike', lado(P(0, 0), P(0, 0.25), P(0, 0.5), P(0.5, 0), P(0.9, 0.02), P(1.3, 0.04))).postura, false)
  const hspu = medir('hspu', lado(P(0, 0.5), P(0.05, 0.7), P(0, 0.9), P(0, 0), P(0, -0.2), P(0, -0.5)))
  assert.ok(hspu.postura)
  const jack = medir('saltos', lado(P(0, 0), P(0.1, -0.2), P(0.1, -0.45), P(0, 0.5), P(0, 0.9), P(0, 1.3)))
  assert.ok(jack.postura && jack.ang < 60)
  const pared = medir('wallsit', lado(P(0, 0), P(0, 0.25), P(0, 0.5), P(0, 0.5), P(0.45, 0.5), P(0.45, 0.95)))
  assert.ok(pared.postura && Math.round(pared.ang) === 90)
  assert.equal(medir('wallsit', lado(P(0, 0), P(0, 0.25), P(0, 0.5), P(0, 0.5), P(0, 0.95), P(0, 1.4))).postura, false)
  const colgado = medir('colgado', lado(P(0, 0), P(0, -0.25), P(0, -0.5), P(0, 0.5), P(0, 0.9), P(0, 1.3)))
  assert.ok(colgado.postura && colgado.recto)
  const cabeza = medir('parado', lado(P(0, 0.5), P(0, 0.75), P(0, 0.9), P(0, 0), P(0, -0.2), P(0, -0.5)))
  assert.ok(cabeza.postura && cabeza.recto)
  const lateral = medir('lateral', lado(P(0, 0), P(0, 0.25), P(0, 0.5), P(0.5, 0.15), P(0.85, 0.27), P(1.2, 0.4)))
  assert.ok(lateral.postura && lateral.recto)
  const barbilla = medir('dominada', lado(P(0, 0), P(0.25, 0), P(0.25, -0.02), P(0, 0.5), P(0, 0.9), P(0, 1.3)))
  assert.ok(barbilla.postura && barbilla.arriba && Math.round(barbilla.ang) === 90)
  const lateralCuenta = run('Plancha lateral', Array.from({ length: 51 }, (_, i) => [M(170), i * 200]))
  assert.equal(lateralCuenta.segundos, 10)
  assert.equal(run('Lagartijas', ciclo(0, buena).slice(0, 4)).prof, 1); assert.equal(run('Lagartijas', ciclo(0, buena)).prof, 0)
}
{
  const C = moduleOf('conteo')
  const { pasoMedida, nuevoConteo, medir, patronDe, tipoDe, opcionesDe, esGeneral, CAMARA, CAMARA_GRUPOS } = C
  const nombres = ['Lagartijas abiertas', 'Lagartijas arqueras', 'Lagartijas inclinadas', 'Dominadas arqueras', 'Sentadilla sumo', 'Tuck planche', 'Planche', 'Cuervo', 'Front lever tuck', 'Back lever', 'Bandera humana', 'Crunches', 'Russian twist', 'Aguante isométrico de abs', 'Planche lean', 'Elevaciones de talones', 'Pseudo planche push ups', 'Handstand toque de hombros', 'Burpees suaves sin lagartija', 'Dragon flag', 'Elevaciones de piernas colgado', 'Correr 5 km o bici']
  assert.deepEqual(nombres.map(n => patronDe(n)), ['empuje', 'empuje', 'empuje', 'dominada', 'sentadilla', 'planche', 'planche', 'planche', 'lever', 'lever', 'bandera', 'crunch', 'generico', 'barco', 'plancha', 'talones', 'empuje', 'generico', 'burpee', 'generico', 'elevacion', null])
  assert.equal(patronDe('Plancha', 'reps'), 'generico')
  assert.equal(patronDe('Lagartijas', 'seconds'), 'quieto')
  assert.equal(patronDe('Mi ejercicio raro', 'seconds'), 'quieto')
  assert.equal(patronDe('Mi ejercicio raro'), 'generico')
  assert.equal(patronDe('Subidas de talones en wall sit', 'reps'), 'talones')
  assert.equal(tipoDe('Tuck planche'), 'seconds'); assert.equal(tipoDe('Lagartijas diamante'), 'reps')
  assert.ok(esGeneral('Russian twist') && !esGeneral('Lagartijas') && !esGeneral('Crunches'))
  assert.deepEqual(opcionesDe('Lagartijas inclinadas'), { inclinado: true, rodillas: false, doblado: false, estirados: false, tuck: false, salto: false })
  assert.equal(opcionesDe('Cuervo').doblado, true)
  assert.ok(CAMARA.length >= 50 && CAMARA_GRUPOS.length === 7)
  assert.ok(CAMARA.every(e => tipoDe(e.name) === e.kind), 'cada ejercicio de la lista se mide como reps o segundos según su tipo')
  assert.ok(moduleOf('rutina').CATALOG.filter(c => c[1] !== 'free').every(([n, k]) => patronDe(n, k) !== null), 'todo el catálogo se puede medir con cámara')
  const P = (x, y, z = 0) => ({ x, y, z, v: 1 })
  const cuerpo = (o) => { const pts = Array.from({ length: 33 }, () => P(0.5, 0.5)); for (const [i, p] of Object.entries(o)) pts[i] = p; return { img: pts, mundo: pts } }
  const lado = (h, co, mu, ca, ro, to) => cuerpo({ 0: P(h.x - 0.1, h.y - 0.05), 11: h, 12: h, 13: co, 14: co, 15: mu, 16: mu, 23: ca, 24: ca, 25: ro, 26: ro, 27: to, 28: to, 31: P(to.x + 0.05, to.y), 32: P(to.x + 0.05, to.y) })
  const planche = medir('planche', lado(P(0.4, 0.5), P(0.4, 0.6), P(0.4, 0.7), P(0.7, 0.5), P(0.9, 0.5), P(1.1, 0.5)))
  assert.ok(planche.visto && planche.postura && planche.recto)
  assert.equal(medir('planche', lado(P(0.4, 0.5), P(0.4, 0.6), P(0.4, 0.7), P(0.7, 0.5), P(0.9, 0.6), P(1.1, 0.72))).postura, false, 'pies en el piso no cuenta')
  assert.equal(medir('planche', lado(P(0.4, 0.5), P(0.5, 0.6), P(0.4, 0.7), P(0.7, 0.5), P(0.9, 0.5), P(1.1, 0.5))).recto, false, 'brazos doblados no cuenta')
  assert.equal(medir('planche', lado(P(0.4, 0.5), P(0.5, 0.6), P(0.4, 0.7), P(0.7, 0.45), P(0.6, 0.4), P(0.7, 0.45)), opcionesDe('Cuervo')).recto, true)
  const lever = medir('lever', lado(P(0.4, 0.5), P(0.4, 0.4), P(0.4, 0.3), P(0.7, 0.52), P(0.9, 0.52), P(1.1, 0.52)))
  assert.ok(lever.postura && lever.recto)
  assert.equal(medir('lever', lado(P(0.4, 0.5), P(0.4, 0.4), P(0.4, 0.3), P(0.45, 0.8), P(0.45, 1.0), P(0.45, 1.2))).postura, false, 'colgado vertical no es lever')
  const flag = lado(P(0.4, 0.5), P(0.35, 0.4), P(0.3, 0.3), P(0.7, 0.5), P(0.9, 0.5), P(1.1, 0.5)); flag.img[14] = flag.mundo[14] = P(0.38, 0.58); flag.img[16] = flag.mundo[16] = P(0.36, 0.66)
  const bandera = medir('bandera', flag)
  assert.ok(bandera.postura && bandera.recto)
  const g = medir('generico', lado(P(0, 0), P(0, 0.25), P(0.25, 0.25), P(0, 0.5), P(0, 0.9), P(0, 1.3)))
  assert.equal(g.canales.length, 12); assert.equal(Math.round(g.canales[0]), 90)
  assert.ok(medir('quieto', lado(P(0, 0), P(0, 0.25), P(0.25, 0.25), P(0, 0.5), P(0, 0.9), P(0, 1.3))).pts.length === 26)
  const G = a => ({ visto: true, postura: true, recto: true, ang: 180, canales: [a, a, 170, 170, 150, 150, 30, 30, 100, 100, 0, 0] })
  const curl = (t0, angs = [170, 150, 120, 90, 60, 40, 40, 60, 90, 120, 150, 170, 170], dt = 100) => angs.map((a, i) => [G(a), t0 + i * dt])
  const run = (ej, frames, kind) => frames.reduce((c, [m, t]) => pasoMedida(c, m, t), nuevoConteo(ej, kind))
  assert.equal(run('Curl de toalla superior', [...curl(0), ...curl(1500), ...curl(3000)]).reps, 3)
  const mediaG = run('Curl de toalla superior', [...curl(0), ...curl(1500), ...curl(3000, [170, 140, 100, 100, 100, 140, 170, 170])])
  assert.equal(mediaG.reps, 2); assert.equal(mediaG.aviso, 'baja')
  assert.equal(run('Curl de toalla superior', Array.from({ length: 60 }, (_, i) => [G(i % 2 ? 166 : 174), i * 100])).reps, 0, 'temblar no cuenta')
  assert.equal(run('Curl de toalla superior', [...curl(0), ...curl(1500, [170, 40, 40, 170, 170], 60)]).aviso, 'rapido')
  assert.equal(run('Curl de toalla superior', [[null, 0], [{ visto: false, postura: false, recto: false, ang: 0 }, 100]]).aviso, 'acomodate')
  const Q = (dx) => ({ visto: true, postura: true, recto: true, ang: 180, pts: Array.from({ length: 26 }, (_, i) => i % 2 ? 0.5 : 0.3 + dx), esc: 0.3 })
  const quieto = run('Aguante raro', Array.from({ length: 31 }, (_, i) => [Q(0), i * 200]), 'seconds')
  assert.ok(quieto.segundos >= 4 && quieto.segundos <= 5, String(quieto.segundos))
  const moviendo = run('Aguante raro', Array.from({ length: 31 }, (_, i) => [Q(i * 0.02), i * 200]), 'seconds')
  assert.equal(moviendo.segundos, 0)
  assert.equal(moviendo.aviso, 'posicion')
}
{
  const C = moduleOf('conteo')
  const P = (x, y, v = 1) => ({ x, y, z: 0, v })
  const cuerpo = (o) => { const pts = Array.from({ length: 33 }, () => P(0.5, 0.5, 0)); for (const [i, p] of Object.entries(o)) pts[i] = p; return { img: pts, mundo: pts, aspecto: 1 } }
  const ambos = (i, p) => ({ [i]: p, [i + 1]: p })
  const forma = (sh, el, wr, hp, kn, an, extra = {}) => cuerpo({ 0: P(sh.x - 0.06, sh.y - 0.02), ...ambos(11, sh), ...ambos(13, el), ...ambos(15, wr), ...ambos(23, hp), ...ambos(25, kn), ...ambos(27, an), ...ambos(29, P(an.x + 0.02, an.y)), ...ambos(31, P(an.x + 0.04, an.y)), ...extra })
  const codos = forma(P(0.3, 0.6), P(0.3, 0.75), P(0.45, 0.75), P(0.6, 0.62), P(0.75, 0.66), P(0.9, 0.7))
  const m1 = C.medir('plancha', codos, C.opcionesDe('Plancha'))
  assert.ok(m1.postura && m1.recto, 'plancha en codos cuenta')
  const acostado = forma(P(0.3, 0.74), P(0.38, 0.76), P(0.45, 0.76), P(0.6, 0.75), P(0.75, 0.75), P(0.9, 0.76))
  assert.equal(C.medir('plancha', acostado, C.opcionesDe('Plancha')).postura, false, 'acostado en el piso no cuenta')
  const rodillas = forma(P(0.3, 0.6), P(0.3, 0.75), P(0.45, 0.75), P(0.55, 0.65), P(0.68, 0.75), P(0.85, 0.75))
  assert.equal(C.medir('plancha', rodillas, C.opcionesDe('Plancha')).recto, false, 'con las rodillas en el piso no cuenta')
  const alta = forma(P(0.3, 0.5), P(0.3, 0.62), P(0.3, 0.75), P(0.6, 0.58), P(0.75, 0.64), P(0.9, 0.7))
  assert.ok(C.medir('plancha', alta, C.opcionesDe('Plancha con brazos estirados')).postura, 'plancha con brazos estirados cuenta')
  assert.equal(C.medir('plancha', codos, C.opcionesDe('Plancha con brazos estirados')).postura, false, 'en codos no vale como brazos estirados')
  const vale = (m) => m.visto && m.postura && m.recto
  const esfinge = forma(P(0.3, 0.6), P(0.3, 0.75), P(0.45, 0.76), P(0.6, 0.72), P(0.75, 0.74), P(0.9, 0.75))
  assert.equal(vale(C.medir('plancha', esfinge, C.opcionesDe('Plancha'))), false, 'con la cadera en el piso no cuenta')
  const hincado = forma(P(0.3, 0.6), P(0.3, 0.75), P(0.45, 0.75), P(0.6, 0.68), P(0.8, 0.745), P(0.97, 0.73))
  assert.equal(vale(C.medir('plancha', hincado, C.opcionesDe('Plancha'))), false, 'apoyado en las rodillas no cuenta aunque el muslo quede casi recto')
  const altaHincado = forma(P(0.3, 0.5), P(0.3, 0.62), P(0.3, 0.75), P(0.6, 0.62), P(0.78, 0.745), P(0.95, 0.72))
  assert.equal(vale(C.medir('plancha', altaHincado, C.opcionesDe('Plancha con brazos estirados'))), false, 'brazos estirados con las rodillas en el piso no cuenta')
  const caida = forma(P(0.3, 0.5), P(0.3, 0.62), P(0.3, 0.75), P(0.6, 0.71), P(0.75, 0.72), P(0.9, 0.73))
  assert.equal(vale(C.medir('plancha', caida, C.opcionesDe('Plancha con brazos estirados'))), false, 'con la cadera caída no cuenta')
  const frente = (o, hondo = {}) => { const pts = Array.from({ length: 33 }, () => P(0.5, 0.95, 0)); for (const [i, p] of Object.entries(o)) pts[i] = p; const mundo = pts.map((p, i) => i in hondo ? { ...p, z: hondo[i] } : p); return { img: pts, mundo, aspecto: 1 } }
  const cara = { 0: P(0.5, 0.45), 11: P(0.35, 0.4), 12: P(0.65, 0.4), 13: P(0.36, 0.6), 14: P(0.64, 0.6) }
  assert.ok(vale(C.medir('plancha', frente({ ...cara, 15: P(0.42, 0.63), 16: P(0.58, 0.63) }), C.opcionesDe('Plancha'))), 'de frente en codos cuenta')
  assert.ok(vale(C.medir('plancha', frente({ ...cara, 15: P(0.42, 0.63), 16: P(0.58, 0.63), 23: P(0.4, 0.55), 24: P(0.6, 0.55) }, { 23: 0.5, 24: 0.5 }), C.opcionesDe('Plancha'))), 'de frente con la cadera atrás de los hombros cuenta')
  assert.equal(C.medir('plancha', frente({ ...cara, 15: P(0.37, 0.8), 16: P(0.63, 0.8) }), C.opcionesDe('Plancha')).postura, false, 'de pie o sentado con los brazos colgando no cuenta')
  assert.equal(C.medir('plancha', frente({ ...cara, 15: P(0.42, 0.63), 16: P(0.58, 0.63), 23: P(0.4, 0.8), 24: P(0.6, 0.8) }), C.opcionesDe('Plancha')).postura, false, 'sentado de frente con la cadera abajo no cuenta')
  assert.equal(C.medir('plancha', frente({ ...cara, 13: P(0.36, 0.6), 14: P(0.64, 0.6), 15: P(0.37, 0.8), 16: P(0.63, 0.8), 23: P(0.4, 0.8), 24: P(0.6, 0.8) }), C.opcionesDe('Plancha con brazos estirados')).postura, false, 'de pie con los brazos estirados abajo no cuenta')
  assert.equal(C.opcionesDe('Plancha con brazos estirados').estirados, true)
  assert.ok(C.CAMARA.some(e => e.name === 'Plancha con brazos estirados' && e.kind === 'seconds'))
  assert.match(C.comoDe('Plancha con brazos estirados', 'plancha'), /Brazos estirados/)
  const enPiso = forma(P(0.4, 0.55), P(0.4, 0.65), P(0.4, 0.75), P(0.6, 0.5), P(0.55, 0.45), P(0.62, 0.75))
  const base = C.calibrar(C.nuevoConteo('Tuck planche'), enPiso).base
  assert.ok(base && Math.abs(base.pie - 0.75) < 1e-9 && base.largo > 0.1, 'mide el piso al terminar la cuenta')
  assert.equal(C.medir('planche', enPiso, C.opcionesDe('Tuck planche'), base).postura, false, 'pies en el piso con rodillas arriba no cuenta')
  const arriba = forma(P(0.4, 0.55), P(0.4, 0.65), P(0.4, 0.75), P(0.6, 0.52), P(0.55, 0.5), P(0.62, 0.6))
  assert.ok(C.medir('planche', arriba, C.opcionesDe('Tuck planche'), base).postura, 'con los pies despegados sí cuenta')
  const sinPies = cuerpo({ 0: P(0.34, 0.53), ...ambos(11, P(0.4, 0.55)), ...ambos(13, P(0.4, 0.65)), ...ambos(15, P(0.4, 0.75)), ...ambos(23, P(0.6, 0.5)), ...ambos(25, P(0.55, 0.45)) })
  assert.equal(C.medir('planche', sinPies, C.opcionesDe('Tuck planche')).postura, false, 'si no ve los pies no cuenta')
  assert.ok(C.esSkill('planche') && C.esSkill('lever') && !C.esSkill('plancha'))
}
ok('aguantes: plancha en codos y con brazos estirados por separado, acostado, con la cadera o las rodillas en el piso o sentado de frente no cuenta, tuck planche mide el piso y solo cuenta con los pies despegados')

{
  const C = moduleOf('conteo')
  const P = (x, y, v = 1) => ({ x, y, z: 0, v })
  const arma = (o) => { const pts = Array.from({ length: 33 }, () => P(0.5, 0.95, 0)); for (const [i, p] of Object.entries(o)) pts[i] = p; return { img: pts, mundo: pts, aspecto: 1 } }
  const ambos = (i, p) => ({ [i]: p, [i + 1]: p })
  const Y = (m) => 0.8 - m * 0.35
  const lado = (cadera, rodilla, tobillo = 0.09) => arma({ 0: P(0.24, Y(0.32)), ...ambos(11, P(0.3, Y(0.3))), ...ambos(13, P(0.3, Y(0.04))), ...ambos(15, P(0.18, Y(0.03))), ...ambos(23, P(0.475, Y(cadera))), ...ambos(25, P(0.65, Y(rodilla))), ...ambos(27, P(0.8075, Y(tobillo))), ...ambos(29, P(0.82, Y(tobillo))), ...ambos(31, P(0.84, Y(0.02))) })
  const gira = (c, g) => { const r = g * Math.PI / 180, f = (p) => ({ ...p, x: 0.5 + (p.x - 0.5) * Math.cos(r) - (p.y - 0.75) * Math.sin(r), y: 0.75 + (p.x - 0.5) * Math.sin(r) + (p.y - 0.75) * Math.cos(r) }); return { ...c, img: c.img.map(f), mundo: c.mundo.map(f) } }
  const vale = (m) => m.visto && m.postura && m.recto
  const op = C.opcionesDe('Plancha')
  const recta = lado(0.228, 0.155), baja = lado(0.17, 0.13), esfinge = lado(0.11, 0.05, 0.06), hincado = lado(0.175, 0.05, 0.06)
  for (const g of [0, -15, 15]) {
    assert.ok(vale(C.medir('plancha', gira(recta, g), op)), `plancha recta de lado cuenta con el teléfono a ${g} grados`)
    assert.ok(vale(C.medir('plancha', gira(baja, g), op)), `cadera un poco baja pero recta cuenta a ${g} grados`)
    assert.equal(C.medir('plancha', gira(esfinge, g), op).falla, 'cadera', `esfinge no cuenta y pide subir la cadera a ${g} grados`)
    assert.equal(C.medir('plancha', gira(hincado, g), op).falla, 'rodillas', `rodillas en el piso no cuenta y pide despegarlas a ${g} grados`)
  }
  assert.equal(C.medir('plancha', lado(0.45, 0.25), op).falla, 'alta', 'cadera muy alta pide bajarla')
  const corre = (ej, cuadros) => cuadros.reduce((c, f, i) => C.paso(c, f, i * 200), C.nuevoConteo(ej, 'seconds'))
  const orilla = lado(0.1326, 0.155)
  assert.equal(vale(C.medir('plancha', orilla, op)), false, 'cadera en la orilla no arranca el tiempo')
  assert.ok(vale(C.medir('plancha', orilla, op, undefined, true)), 'pero si ya estabas en plancha no la pausa')
  const sigue = corre('Plancha', [...Array(10).fill(recta), ...Array(25).fill(orilla)])
  assert.ok(sigue.segundos >= 6 && sigue.aviso === null, `ya adentro, temblar en la orilla no pausa (${sigue.segundos} s)`)
  assert.equal(corre('Plancha', Array(25).fill(orilla)).segundos, 0)
  const cae = corre('Plancha', [...Array(10).fill(recta), ...Array(10).fill(esfinge)])
  assert.equal(cae.aviso, 'cadera', 'si bajas la cadera al piso se pausa y lo dice')
  assert.match(C.AVISOS_AGUANTE.cadera, /Sube la cadera/); assert.match(C.AVISOS_AGUANTE.rodillas, /rodillas/); assert.match(C.AVISOS_AGUANTE.pies, /pies/); assert.match(C.AVISOS_AGUANTE.extiende, /brazos/)
  const cara = { 0: P(0.5, 0.45), 11: P(0.35, 0.4), 12: P(0.65, 0.4), 13: P(0.36, 0.6), 14: P(0.64, 0.6), 15: P(0.42, 0.63), 16: P(0.58, 0.63) }
  const piernas = (rod, tob) => ({ 23: P(0.42, 0.53), 24: P(0.58, 0.53), 25: P(0.45, rod), 26: P(0.55, rod), 27: P(0.47, tob), 28: P(0.53, tob) })
  const deFrente = arma({ ...cara, ...piernas(0.57, 0.61) })
  assert.ok(vale(C.medir('plancha', deFrente, op)), 'de frente con cadera y piernas a la vista cuenta (antes la medía como si fuera de lado)')
  assert.equal(C.medir('plancha', arma({ ...cara, ...piernas(0.62, 0.61) }), op).falla, 'rodillas', 'de frente con las rodillas abajo de los tobillos no cuenta')
  assert.equal(C.medir('plancha', arma({ 0: P(0.5, 0.6), 11: P(0.35, 0.58), 12: P(0.65, 0.58), 13: P(0.36, 0.62), 14: P(0.64, 0.62), 15: P(0.42, 0.63), 16: P(0.58, 0.63) }), op).falla, 'cadera', 'de frente acostado en el piso no cuenta')
  const parejo = arma({ ...cara, ...piernas(0.61, 0.61) })
  assert.equal(vale(C.medir('plancha', parejo, op)), false)
  const frenteSigue = corre('Plancha', [...Array(10).fill(deFrente), ...Array(15).fill(parejo)])
  assert.ok(frenteSigue.segundos >= 4 && frenteSigue.aviso === null, 'de frente, ya adentro, una rodilla mal vista no pausa')

  const tuck = (o = {}) => arma({ 0: P(0.34, 0.53), ...ambos(11, P(0.4, 0.55)), ...ambos(13, P(0.4, 0.65)), ...ambos(15, P(0.4, 0.75)), ...ambos(23, P(0.6, 0.4)), ...ambos(25, P(0.55, 0.42)), ...ambos(27, P(0.62, 0.55)), ...ambos(29, P(0.64, 0.55)), ...ambos(31, P(0.66, 0.6)), ...o })
  const opT = C.opcionesDe('Tuck planche')
  assert.equal(opT.tuck, true); assert.equal(C.opcionesDe('Planche').tuck, false)
  assert.ok(vale(C.medir('planche', tuck(), opT)), 'tuck planche con la cadera más alta que los hombros cuenta')
  assert.equal(C.medir('planche', tuck(), C.opcionesDe('Planche')).postura, false, 'en planche completa sí se pide el cuerpo horizontal')
  assert.ok(vale(C.medir('planche', tuck({ 14: P(0.48, 0.65, 0.6), 12: P(0.4, 0.55, 0.6), 16: P(0.4, 0.75, 0.6) }), opT)), 'el brazo de atrás mal visto no la tumba')
  assert.equal(C.medir('planche', tuck({ ...ambos(13, P(0.47, 0.65)) }), opT).falla, 'extiende', 'brazos doblados pide estirarlos')
  const plano = arma({ 0: P(0.34, 0.53), ...ambos(11, P(0.4, 0.55)), ...ambos(13, P(0.4, 0.65)), ...ambos(15, P(0.4, 0.75)), ...ambos(23, P(0.6, 0.5)), ...ambos(25, P(0.55, 0.45)), ...ambos(27, P(0.62, 0.75)), ...ambos(29, P(0.64, 0.75)), ...ambos(31, P(0.66, 0.76)) })
  const baseT = C.calibrar(C.nuevoConteo('Tuck planche'), plano).base
  assert.ok(Math.abs(baseT.pie - 0.75) < 1e-9, 'el piso se mide con tobillos y talones, no con la punta')
  const puntas = tuck({ ...ambos(27, P(0.62, 0.62)), ...ambos(29, P(0.64, 0.62)), ...ambos(31, P(0.66, 0.74)) })
  assert.ok(vale(C.medir('planche', puntas, opT, baseT)), 'con las puntas colgando hacia el piso cuenta')
  assert.equal(C.medir('planche', plano, opT, baseT).falla, 'pies', 'con los pies en el piso pide despegarlos')
  const oculto = (f) => ({ ...f, img: f.img.map((p, i) => [27, 28, 29, 30, 31, 32].includes(i) ? { ...p, v: 0.1 } : p) })
  assert.equal(C.medir('planche', oculto(tuck()), opT).postura, false, 'sin ver los pies no arranca')
  const tSigue = [...Array(10).fill(tuck()), ...Array(10).fill(oculto(tuck()))].reduce((c, f, i) => C.paso(c, f, i * 200), C.calibrar(C.nuevoConteo('Tuck planche'), plano))
  assert.ok(tSigue.segundos >= 3 && tSigue.aviso === null, 'si ya estabas arriba y se tapan los pies, sigue contando')
}
ok('plancha y tuck planche: de frente con las piernas a la vista ya no se mide como de lado, de lado se mide contra el piso aunque el teléfono esté chueco, ya adentro tolera la orilla, avisos que dicen qué falla (cadera, rodillas, pies, brazos), tuck con la cadera alta, brazo de atrás mal visto y puntas colgando')

{
  const duolingo = ['58cc02', '46a302', '89e219', '7ac70c', '79e02a']
  const archivos = ['src/tokens.css', 'src/lib/widget.ts', 'src/bambu.css', 'src/duo.css', 'index.html'].map(f => path.join(__dirname, '..', f)).filter(f => fs.existsSync(f))
  for (const f of archivos) { const t = fs.readFileSync(f, 'utf8').toLowerCase(); for (const h of duolingo) assert.ok(!t.includes('#' + h), `${path.basename(f)} todavía trae el verde #${h} de Duolingo`) }
  const tokens = fs.readFileSync(path.join(__dirname, '../src/tokens.css'), 'utf8')
  assert.match(tokens, /--d-green: #37cb69/, 'el verde es el de la paleta de Gael')
}
ok('verde propio: ningún verde de Duolingo en la paleta ni en el widget, verde de la paleta de Gael')

{
  const A = moduleOf('armar')
  const R = moduleOf('rutina')
  const nombres = (w) => w.flatMap(rt => rt ? rt.items.map(i => i.name) : [])
  const puede = (equipo) => (n) => { const o = A.OPCIONES.find(x => x.name === n); return o && o.equipo.every(e => e === 'nada' || equipo.includes(e)) }
  const casa = A.armarSemana({ equipo: ['nada'], dias: 3, minutos: 30, nivel: 'empiezo' })
  assert.deepEqual(casa.map(rt => rt ? rt.title : null), ['Torso', null, 'Pierna y core', null, 'Cuerpo completo', null, null], '3 días: torso, pierna y cuerpo completo con descanso entre medio')
  assert.ok(nombres(casa).every(puede(['nada'])), 'solo con el piso no pone nada que necesite equipo')
  assert.ok(casa.every(rt => !rt || (rt.items.length >= 3 && rt.items.length <= 5 && rt.rounds === 3)), '30 minutos: hasta 5 ejercicios y 3 rondas')
  assert.ok(casa.every(rt => !rt || new Set(rt.items.map(i => i.name)).size === rt.items.length), 'ningún ejercicio se repite el mismo día')
  const barra = A.armarSemana({ equipo: ['nada', 'barra', 'silla'], dias: 4, minutos: 45, nivel: 'entreno' })
  assert.ok(nombres(barra).some(n => /Dominada|Chin ups|australianas/.test(n)), 'con barra entra un jalón de barra')
  assert.ok(nombres(barra).every(puede(['nada', 'barra', 'silla'])))
  assert.deepEqual(barra.map(rt => !!rt), [true, true, false, true, true, false, false])
  assert.ok(barra.every(rt => !rt || rt.items.length <= 7))
  assert.notDeepEqual(barra[0].items.map(i => i.name), barra[3].items.map(i => i.name), 'el segundo día de torso varía los ejercicios')
  const corto = A.armarSemana({ equipo: ['nada'], dias: 2, minutos: 15, nivel: 'empiezo' })
  assert.deepEqual(corto.map(rt => !!rt), [true, false, false, true, false, false, false])
  assert.ok(corto.every(rt => !rt || (rt.items.length <= 3 && rt.rounds === 2)), '15 minutos: 3 ejercicios y 2 rondas')
  assert.equal(A.armarSemana({ equipo: ['nada'], dias: 6, minutos: 30, nivel: 'empiezo' }).filter(Boolean).length, 6)
  const empuje = (nivel) => A.armarSemana({ equipo: ['nada', 'silla', 'pared'], dias: 3, minutos: 30, nivel })[0].items[0]
  const nivelDe = (n) => A.OPCIONES.find(o => o.name === n).level
  assert.ok(nivelDe(empuje('avanzado').name) > nivelDe(empuje('empiezo').name), 'avanzado pone una versión más difícil que principiante')
  const cambios = A.cambiosPara('Lagartija normal', ['nada'], 'reps')
  assert.ok(cambios.some(c => c.opcion.name === 'Lagartija con rodillas' && c.etiqueta === 'Más fácil'))
  assert.ok(cambios.some(c => c.opcion.name === 'Lagartija diamante' && c.etiqueta === 'Más difícil'))
  assert.ok(cambios.every(c => puede(['nada'])(c.opcion.name)), 'solo ofrece cambios que puedes hacer con tu equipo')
  assert.ok(A.cambiosPara('Muscle up', ['nada'], 'reps').length > 0, 'un ejercicio propio también se puede cambiar')
  const plan = { deadline: '19:00', lock: false, restSeconds: 60, week: casa }
  const cambiado = A.cambiarEnSemana(plan, casa[0].items[0].name, A.OPCIONES.find(o => o.name === 'Lagartija normal'))
  assert.ok(nombres(cambiado.week).includes('Lagartija normal') && !nombres(cambiado.week).includes(casa[0].items[0].name), 'se cambia en todos los días')
  assert.equal(cambiado.week[0].items[0].id, casa[0].items[0].id, 'conserva su lugar en la rutina')
  const sinNada = casa[0].items.reduce((p, it) => A.quitarDeSemana(p, it.name), plan)
  assert.equal(sinNada.week[0], null, 'si quitas todos los de un día, queda de descanso')
  assert.deepEqual(A.semanaVacia().week, [null, null, null, null, null, null, null])
  assert.equal(A.semanaVacia().lock, false, 'una cuenta nueva no arranca con las redes bloqueadas')
  assert.ok(nombres(casa).every(n => R.label({ name: n, kind: 'reps', target: 1 })), 'cada ejercicio armado se muestra en la rutina')
}
ok('rutina armada por Bambú: días, tiempo, nivel y equipo, sin repetir ejercicios, cambiar por uno más fácil o más difícil en todos los días, quitar y cuenta nueva sin rutina ni candado')

{
  const A = moduleOf('armar')
  const L = moduleOf('lectura')
  const rt = { title: 'Torso', rounds: 3, items: [{ id: 'w', name: 'Muscle up', kind: 'reps', target: 2, when: 'before' }, ...['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(id => ({ id, name: `Ej ${id}`, kind: 'reps', target: 10 })), { id: 'z', name: 'Colgarse', kind: 'seconds', target: 30, when: 'after' }] }
  const quince = A.recortar(rt, 15), treinta = A.recortar(rt, 30)
  assert.deepEqual(quince.items.map(i => i.id), ['a', 'b', 'c'], '15 min: los 3 primeros del circuito, sin los de antes y al final')
  assert.equal(quince.rounds, 2)
  assert.deepEqual(treinta.items.map(i => i.id), ['a', 'b', 'c', 'd', 'e'])
  assert.equal(treinta.rounds, 3)
  assert.equal(A.recortar(rt, 0), rt, 'completa no cambia nada')
  assert.ok(A.minutosDe(quince, 60) < A.minutosDe(treinta, 60) && A.minutosDe(treinta, 60) < A.minutosDe(rt, 60))
  assert.ok(A.minutosDe(quince, 60) >= 8 && A.minutosDe(quince, 60) <= 16, String(A.minutosDe(quince, 60)))
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true } })
  const dia = '2026-11-26'
  const leida = L.markBible(base, dia, [{ book: 1, chapter: 1 }, { book: 1, chapter: 2 }])
  assert.equal(leida.bible.filter(m => m.day === dia).length, 2, 'marca los capítulos de la Biblia de hoy')
  assert.equal(leida.reading.at(-1).title, L.BIBLIA)
  const parcial = L.markBible(base, dia, [{ book: 43, chapter: 3 }], '1 al 16')
  assert.equal(parcial.bible[0].verses, '1 al 16', 'con versículos queda como lectura parcial')
  assert.equal(L.markBible(base, dia, []), base)
}
ok('sesión de 15 o 30 minutos sobre tu propia rutina y Biblia en el registro rápido (capítulos y versículos)')



ok('cámara para todo: variantes (diamante, arqueras, abiertas, inclinadas…), planche, lever y bandera con postura, cualquier otro ejercicio aprende su recorrido y los aguantes cuentan solo quieto')

ok('cámara: medidor de profundidad, media repetición vale cero, ritmo y cuerpo recto; lagartijas de frente por caída de hombros; plancha de frente y con tolerancia; 17 familias con variantes; dominadas con la barbilla arriba')

{
  const mi = moduleOf('minutos')
  const { logSet } = moduleOf('rutina')
  const day = '2026-11-25'
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'x', onboardingComplete: true }, settings: { minLibres: 0 } })
  const record = mi.conCamara(base, day, 'Lagartijas', 'reps', 40, 500)
  assert.equal(record.sets.at(-1).note, 'camara')
  assert.equal(mi.ganados(record, day), 20, 'cualquier ejercicio con cámara da minutos (rutina, Libre, retos)')
  assert.equal(moduleOf('libre').records(record, undefined, true).get('Lagartijas').best, 40)
  let d = mi.conCamara(base, day, 'Lagartijas', 'reps', 11, 1000, true)
  assert.equal(d.sets.at(-1).note, 'redes'); assert.equal(d.sets.at(-1).reps, 11)
  assert.equal(mi.ganados(d, day), 5)
  assert.equal(moduleOf('libre').records(d, undefined, true).get('Lagartijas').best, 11, 'lo de Redes también cuenta como récord con cámara')
  d = mi.conCamara(d, day, 'Lagartijas', 'reps', 1, 2000, true)
  assert.equal(mi.ganados(d, day), 6)
  d = mi.conCamara(d, day, 'Dominadas', 'reps', 3, 3000, true)
  d = mi.conCamara(d, day, 'Plancha', 'seconds', 45, 4000, true)
  assert.equal(d.sets.at(-1).seconds, 45)
  assert.equal(mi.ganados(d, day), 14)
  d = mi.conCamara(d, day, 'Sentadillas', 'reps', 80, 4500)
  assert.equal(mi.ganados(d, day), 34, 'la cámara fuera de Redes también suma')
  d = logSet(d, day, { id: 'x', name: 'Lagartijas', kind: 'reps', target: 10 }, 50)
  assert.equal(mi.ganados(d, day), 34, 'lo anotado a mano no da minutos')
  d = { ...d, activities: [...d.activities, mi.paseActivity(day, 'instagram', 10)] }
  assert.equal(mi.gastados(d, day), 10); assert.equal(mi.saldo(d, day), 24)
  d = normalizeData(d)
  assert.equal(mi.saldo(d, day), 24)
  assert.equal(mi.saldo(d, '2026-11-26'), 0)
  assert.deepEqual(mi.semanaMinutos(d, '2026-11-26'), { ganados: 34, gastados: 10 })
  d = { ...d, activities: [...d.activities, mi.paseActivity(day, 'tiktok', 30)] }
  assert.equal(mi.saldo(d, day), 0)
  const libre = normalizeData({ ...d, settings: { ...d.settings, minLibres: undefined } })
  assert.equal(mi.libresDe(libre), 60, 'una hora libre al día por defecto')
  assert.equal(mi.saldo(libre, day), 54); assert.equal(mi.saldo(libre, '2026-11-26'), 60, 'la hora libre vuelve cada día')
  assert.equal(mi.saldo(normalizeData({ ...d, settings: { ...d.settings, minLibres: 90 } }), '2026-11-26'), 90)
  assert.equal(normalizeData({ ...d, settings: { ...d.settings, minLibres: 999 } }).settings.minLibres, undefined, 'minutos libres raros se ignoran')
  assert.deepEqual(mi.siguienteMinuto('Lagartijas', 5), { min: 2, faltan: 1 })
  assert.deepEqual(mi.siguienteMinuto('Sentadillas', 5), { min: 1, faltan: 3 })
  assert.deepEqual(mi.siguienteMinuto('Plancha', 25), { min: 1, faltan: 15 })
  assert.deepEqual(['Lagartijas', 'Sentadillas', 'Dominadas', 'Plancha'].map(n => mi.faltan(n, 5)), [10, 20, 3, 100])
  assert.equal(mi.tasaTexto('Dominadas'), '1 dominada = 2 min')
  assert.equal(mi.tasaTexto('Plancha'), '20 s de plancha = 1 min')
  assert.equal(mi.tasaTexto('Sentadillas'), '4 sentadillas = 1 min')
  assert.equal(mi.tasaTexto('Chin ups'), '1 chin up = 2 min')
  assert.equal(mi.minutosDe('Lagartijas diamante', 4), 2)
  assert.equal(mi.minutosDe('Correr 5 km o bici', 10), 0)
  assert.equal(mi.minutosDe('Russian twist', 8), 2)
  assert.equal(mi.minutosDe('Lagartijas arqueras', 2), 2)
  assert.equal(mi.minutosDe('Lagartijas en rodillas', 4), 1)
  assert.equal(mi.minutosDe('Fondos en banco', 4), 1)
  assert.equal(mi.minutosDe('Dominadas arqueras', 1), 4)
  assert.equal(mi.minutosDe('Tuck planche', 10), 2)
  assert.equal(mi.minutosDe('Front lever', 5), 1)
  assert.equal(mi.tasaCorta('Lagartijas arqueras'), '1 rep = 1 min')
  assert.deepEqual(['Lagartijas arqueras', 'Elevaciones de piernas colgado', 'Toes to bar', 'Pseudo planche push ups', 'Lagartijas a una mano'].map(n => mi.tasaTexto(n).split(' = ')[0]), ['1 lagartija arquera', '1 elevación de piernas colgado', '1 toes to bar', '1 pseudo planche push up', '1 lagartija a una mano'])
  assert.equal(mi.minutosDe('L sit', 30), 3)
  assert.equal(mi.minutosDe('Jumping jacks', 12), 2)
  assert.equal(mi.minutosDe('Burpees', 3), 3)
  assert.equal(mi.minutosDe('Handstand push up', 2), 4)
  const ms = Date.UTC(2026, 10, 25, 3, 7, 9)
  const txt = mi.hastaTexto(ms)
  assert.match(txt, /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/)
  assert.equal(new Date(txt.replace(' ', 'T')).getTime(), ms, 'hora local del teléfono, sin zona')
  const llave = mi.nuevaLlave()
  assert.match(llave, /^[A-Za-z0-9]{18}$/)
  assert.equal(normalizeData({ ...base, settings: { ...base.settings, candado: { llave } } }).settings.candado.llave, llave)
  assert.equal(normalizeData({ ...base, settings: { ...base.settings, candado: { llave: 'mala llave' } } }).settings.candado, undefined)
}
{
  const R = moduleOf('rutina')
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, train: { week: [null, { title: 'Espalda', rounds: 3, items: [
    { id: 'a', name: 'Dominadas lentas', kind: 'reps', target: 5, rounds: 5 }, { id: 'b', name: 'Chin ups lentas', kind: 'reps', target: 5 }, { id: 'c', name: 'Curl de toalla inferior', kind: 'reps', target: 15 }, { id: 'd', name: 'Muscle up', kind: 'reps', target: 2 }] }, null, null, null, null, null], deadline: '19:00', lock: true, restSeconds: 60 } } })
  const hecho = normalizeData(R.ajustarRutina2611(base))
  assert.deepEqual(hecho.settings.train.week[1].items.map(i => [i.name, i.target]), [['Dominadas', 7], ['Chin ups', 7], ['Curl de toalla inferior', 20], ['Muscle up', 2]])
  assert.equal(hecho.settings.train.week[1].items[0].rounds, 5)
  assert.equal(hecho.settings.rutina2611, true)
  const nueva = R.seedWeek().week.flatMap(r => r ? r.items : [])
  assert.ok(nueva.some(i => i.name === 'Dominadas' && i.target === 7) && nueva.some(i => i.name === 'Chin ups' && i.target === 7) && nueva.some(i => i.name === 'Curl de toalla inferior' && i.target === 20))
  assert.ok(!nueva.some(i => /lentas$/.test(i.name) && /^(Dominadas|Chin ups)/.test(i.name)))
  const conToques = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, train: { week: [{ title: 'Empuje', rounds: 3, items: [{ id: 't', name: 'Handstand toque de hombros', kind: 'reps', target: 3, quiet: '2026-11-20' }, { id: 'f', name: 'Fondos', kind: 'reps', target: 10 }] }, null, null, { title: 'Empuje B', rounds: 3, items: [{ id: 't2', name: 'Handstand toque de hombros', kind: 'reps', target: 3 }] }, null, null, null] } } })
  const toques = normalizeData(R.toquesA7(conToques))
  assert.deepEqual(toques.settings.train.week.flatMap(r => r ? r.items.map(i => [i.name, i.target]) : []), [['Handstand toque de hombros', 7], ['Fondos', 10], ['Handstand toque de hombros', 7]], 'toque de hombros pasa de 3 a 7 en todos los días')
  assert.equal(toques.settings.train.week[0].rounds, 3, 'las series no cambian')
  assert.equal(toques.settings.toques2611, true)
  assert.equal(R.label(toques.settings.train.week[0].items[0]), '7 reps')
  assert.ok(nueva.filter(i => i.name === 'Handstand toque de hombros').every(i => i.target === 7) && nueva.some(i => i.name === 'Handstand toque de hombros'), 'la rutina nueva ya trae 7')
  const conHspu = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, train: { week: [null, null, null, { title: 'Empuje B', rounds: 3, items: [{ id: 'h', name: 'Handstand push up con pared', kind: 'reps', target: 5 }, { id: 'p', name: 'Pike push ups', kind: 'reps', target: 5 }] }, null, null, null] } } })
  const hspu = normalizeData(R.hspuA3(conHspu))
  assert.deepEqual(hspu.settings.train.week[3].items.map(i => [i.name, i.target]), [['Handstand push up con pared', 3], ['Pike push ups', 5]], 'handstand push up pasa de 5 a 3 y lo demás no cambia')
  assert.equal(hspu.settings.hspu2611, true)
  const empujeB = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, sets: [{ id: 's1', day: '2026-11-24', exercise: 'Parado de cabeza', seconds: 20, at: 1 }], settings: { ...EMPTY_DATA.settings, train: { week: [null, null, null, { title: 'Empuje B', rounds: 3, items: [{ id: 'h', name: 'Handstand push up con pared', kind: 'reps', target: 5 }, { id: 'c', name: 'Parado de cabeza', kind: 'seconds', target: 20 }, { id: 'p', name: 'Pike push ups', kind: 'reps', target: 5 }] }, null, null, null] } } })
  const sinEllos = normalizeData(R.quitar2611(R.hspuA3(empujeB)))
  assert.deepEqual(sinEllos.settings.train.week[3].items.map(i => [i.id, i.name]), [['p', 'Pike push ups']], 'quita parado de cabeza y handstand push up de tu rutina y deja lo demás')
  assert.equal(sinEllos.settings.quitar2611, true)
  assert.equal(sinEllos.sets.length, 1, 'tu historial de esos ejercicios no se borra')
  assert.ok(!nueva.some(i => R.QUITADOS_2611.includes(i.name)), 'la rutina nueva ya no los trae')
  assert.ok(R.CATALOG.some(c => c[0] === 'Parado de cabeza') && R.CATALOG.some(c => c[0] === 'Handstand push up con pared'), 'siguen en la lista por si los quieres agregar después')
}
ok('rutina de Kiki: dominadas y chin ups normales a 7, curl de toalla inferior a 20, una sola vez')

{
  const R = moduleOf('rutina')
  const plan = R.seedWeek()
  assert.equal(plan.week[2].rounds, 3)
  assert.equal(plan.week[2].items.find(i => i.name === 'Dominadas').rounds, 5)
  const cuatro = { ...plan, week: plan.week.map((rt, i) => rt && i === 2 ? { ...rt, rounds: 4, items: rt.items.map(it => /^(Dominadas|Chin ups)$/.test(it.name) ? { ...it, rounds: 4 } : it) } : rt) }
  const d0 = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, train: cuatro, rondas2611: true } })
  const d1 = normalizeData(R.deshacerRondas2611(d0))
  assert.equal(d1.settings.train.week[2].rounds, 3)
  assert.deepEqual(d1.settings.train.week[2].items.filter(i => /^(Dominadas|Chin ups)$/.test(i.name)).map(i => i.rounds), [5, 5])
  assert.equal(d1.settings.rondas2611, undefined)
  assert.deepEqual(d1.settings.train.week[5], plan.week[5])
}
ok('miércoles regresa a 3 rondas con dominadas y chin ups en 5')

ok('minutos de redes: una hora libre al día (se cambia en Ajustes), cualquier ejercicio con cámara suma (2 lagartijas = 1 min, 1 dominada = 2), lo anotado a mano no, los pases restan y se reinicia cada noche')

{
  const D = moduleOf('duelos')
  const R = moduleOf('retos')
  const H = 3600000, ahora = Date.parse('2026-11-25T20:00:00Z')
  const base = { id: 'x', de: 'ana', participantes: ['ana', 'beto', 'caro'], tipo: 'reps', ejercicio: 'Lagartijas', marcas: { ana: 23 }, creado: ahora - H, movido: ahora - H, version: '' }
  assert.equal(R.estadoReto(base, 'beto', ahora), 'te-toca')
  assert.equal(R.estadoReto(base, 'ana', ahora), 'esperando')
  assert.equal(R.estadoReto({ ...base, creado: ahora - 49 * H }, 'beto', ahora), 'vencido')
  assert.equal(R.estadoReto({ ...base, creado: ahora - 49 * H }, 'ana', ahora), 'terminado', 'al vencer, quien ya jugó ve el resultado')
  const listo = { ...base, marcas: { ana: 23, beto: 30, caro: 23 } }
  assert.equal(R.estadoReto(listo, 'caro', ahora), 'terminado')
  assert.deepEqual(R.lugares(listo).map(x => [x.uid, x.lugar]), [['beto', 1], ['ana', 2], ['caro', 2]])
  assert.deepEqual(R.lugarDe(listo, 'ana'), { lugar: 2, de: 3, empate: true })
  assert.deepEqual(R.aVencer(base), { uid: 'ana', valor: 23 })
  assert.equal(R.valorTexto({ tipo: 'aguante', ejercicio: 'Plancha' }, 130), '2:10')
  assert.equal(R.valorTexto({ tipo: 'cindy', ejercicio: 'Cindy' }, 382), '12 rondas + 22')
  const viejo = { ...listo, id: 'v', creado: ahora - 10 * 24 * H, movido: ahora - 9 * 24 * H }
  assert.deepEqual(R.visibles([base, listo, viejo], 'ana', [], ahora).map(d => d.id), ['x', 'x'])
  assert.deepEqual(R.visibles([base, { ...listo, id: 'y' }], 'ana', ['y'], ahora).map(d => d.id), ['x'])
  assert.deepEqual(R.marcador([listo, viejo, base], 'beto', ahora - 7 * 24 * H, ahora), { ganados: 1, perdidos: 0, empates: 0 })
  assert.deepEqual(R.marcador([listo], 'ana', 0, ahora), { ganados: 0, perdidos: 1, empates: 0 })
  assert.deepEqual(R.marcador([{ ...listo, marcas: { ana: 30, beto: 30, caro: 1 } }], 'ana', 0, ahora), { ganados: 0, perdidos: 0, empates: 1 })
  const C = moduleOf('conteo')
  assert.ok(R.TIPOS.find(t => t.tipo === 'reps').ejercicios.every(e => C.esCamara(e) && !C.esAguante(C.patronDe(e))))
  assert.ok(R.TIPOS.find(t => t.tipo === 'aguante').ejercicios.every(e => C.esAguante(C.patronDe(e))))
  assert.equal(R.tipoDeReto('raro'), 'reps')
  let r = { fase: 'espera', t: 0 }
  let p = D.pasoReloj(r, 1000, false, 60)
  assert.deepEqual([p.r.fase, p.mostrar, p.evento], ['espera', null, null])
  p = D.pasoReloj(r, 1000, true, 60); r = p.r
  assert.deepEqual([r.fase, p.mostrar], ['cuenta', -3])
  assert.equal(D.pasoReloj(r, 2100, false, 60).mostrar, -2)
  assert.equal(D.pasoReloj(r, 3500, false, 60).mostrar, -1)
  p = D.pasoReloj(r, 4000, false, 60); r = p.r
  assert.deepEqual([r.fase, p.mostrar, p.evento], ['duelo', 60, 'empieza'])
  assert.equal(D.pasoReloj(r, 4999, false, 60).mostrar, 60)
  assert.equal(D.pasoReloj(r, 34000, false, 60).mostrar, 30)
  assert.equal(D.pasoReloj(r, 63999, true, 60).mostrar, 1)
  p = D.pasoReloj(r, 64000, true, 60)
  assert.deepEqual([p.r.fase, p.evento], ['fin', 'acaba'])
  assert.equal(D.pasoReloj(p.r, 99999, true, 60).evento, null)
}
{
  const S = moduleOf('semana')
  const M = moduleOf('minutos')
  const lunes = '2026-11-23', hoy = '2026-11-25'
  let d = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true } })
  d = M.conCamara(d, '2026-11-18', 'Lagartijas', 'reps', 20, Date.parse('2026-11-18T18:00:00'))
  d = M.conCamara(d, lunes, 'Lagartijas', 'reps', 24, Date.parse('2026-11-23T18:00:00'), true)
  d = M.conCamara(d, hoy, 'Lagartijas', 'reps', 18, Date.parse('2026-11-25T18:00:00'), true)
  d = M.conCamara(d, hoy, 'Plancha', 'seconds', 75, Date.parse('2026-11-25T18:05:00'))
  d = moduleOf('rutina').logSet(d, hoy, { id: 'libre', name: 'Sentadillas', kind: 'reps', target: 10 }, 99, Date.parse('2026-11-25T18:10:00'))
  d = { ...d, activities: [...d.activities, M.paseActivity(hoy, 'instagram', 10)] }
  const s = S.resumenSemana(d, hoy)
  assert.equal(s.desde, lunes)
  assert.equal(s.reps, 42, 'solo cámara y solo esta semana')
  assert.equal(s.segundos, 75)
  assert.equal(s.dias, 2)
  assert.equal(s.series, 3)
  assert.deepEqual(s.top.map(t => [t.name, t.valor]), [['Lagartijas', 42], ['Plancha', 75]])
  assert.deepEqual(s.nuevos.map(r => [r.name, r.best, r.antes]), [['Plancha', 75, 0], ['Lagartijas', 24, 20]].sort((a, b) => (b[1] - b[2]) / Math.max(1, b[2]) - (a[1] - a[2]) / Math.max(1, a[2])))
  assert.equal(s.ganados, 12 + 12, 'la plancha con cámara fuera de Redes también da minutos')
  assert.equal(s.usados, 10)
  assert.equal(S.rangoTexto(lunes, hoy), '23 al 25 nov')
  assert.equal(S.rangoTexto('2026-11-30', '2026-12-02'), '30 nov al 2 dic')
  assert.equal(S.tiempoTexto(75), '1:15')
}
ok('resumen de la semana: solo cámara, desde el lunes, récords nuevos contra lo de antes, minutos ganados y usados')

{
  const W = moduleOf('widget')
  const M = moduleOf('minutos')
  const R = moduleOf('rutina')
  const hoy = '2026-11-25'
  let d = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, train: R.seedWeek() } })
  d = M.conCamara(d, hoy, 'Lagartijas', 'reps', 20, Date.parse('2026-11-25T10:00:00'), true)
  const e = W.estadoWidget(d, hoy)
  assert.equal(e.dia, hoy); assert.equal(e.minutos, 70, '60 libres + 10 ganados'); assert.equal(e.meta, 50); assert.ok(e.xpHoy > 0)
  assert.match(e.rutina, /^(Rutina \d+\/\d+|Rutina lista|Descanso)$/)
  assert.deepEqual(W.estadoParaAvisos(d, hoy), { ultimo: hoy, hecho: e.xpHoy >= 50, racha: e.racha })
  assert.equal(W.estadoParaAvisos(d, '2026-11-26').ultimo, hoy, 'guarda el último día con actividad, no lo borra al día siguiente')
  assert.equal(W.estadoParaAvisos(normalizeData({ ...EMPTY_DATA }), hoy).ultimo, '')
  const js = W.scriptWidget('https://x.test/w?key=1')
  assert.ok(js.includes('const URL = "https://x.test/w?key=1"') && js.includes('Script.setWidget(w)') && !/innerHTML|eval\(/.test(js))
  assert.ok(js.includes('config.widgetFamily') && js.includes('accessoryRectangular') && js.includes('presentMedium'), 'un diseño por tamaño')
  assert.deepEqual(W.ESTILOS_WIDGET.map(e => e.id), ['bosque', 'brote', 'logo'], 'tres diseños para elegir')
  assert.equal(W.estadoWidget(d, hoy, 3).retos, 3, 'el widget sabe cuántos retos tienes pendientes')
  {
    class C { constructor(h) { this.h = h } static white() { return new C('#fff') } static clear() { return new C('') } }
    const font = s => ({ s })
    const Font = { heavyRoundedSystemFont: font, semiboldRoundedSystemFont: font }
    class Nodo { constructor() { this.k = [] } addText(x) { const t = { x, centerAlignText() {}, rightAlignText() {}, leftAlignText() {} }; this.k.push(t); return t } addStack() { const n = new Nodo(); this.k.push(n); return n } addSpacer() {} addImage(i) { const n = { i }; this.k.push(n); return n } layoutHorizontally() {} layoutVertically() {} centerAlignContent() {} topAlignContent() {} bottomAlignContent() {} setPadding() {} }
    class LW extends Nodo { presentSmall() {} presentMedium() {} }
    class DC { addPath() {} setFillColor() {} fillPath() {} getImage() { return {} } }
    class P { addRoundedRect() {} }
    const textos = n => n.k.flatMap(x => x.x !== undefined ? [x.x] : x.k ? textos(x) : [])
    const dia = new Date(), hoyLocal = dia.getFullYear() + '-' + String(dia.getMonth() + 1).padStart(2, '0') + '-' + String(dia.getDate()).padStart(2, '0')
    for (const estilo of ['bosque', 'brote', 'logo']) for (const fam of ['small', 'medium', 'large', 'accessoryRectangular', 'accessoryInline', 'accessoryCircular']) {
      let w
      const datos = { fields: { dia: { stringValue: hoyLocal }, racha: { integerValue: '12' }, nivel: { integerValue: '5' }, minutos: { integerValue: '63' }, retos: { integerValue: '2' }, xpHoy: { integerValue: '20' }, meta: { integerValue: '50' }, rutina: { stringValue: 'Rutina 1/9' } } }
      const fn = new Function('Color', 'Font', 'Size', 'Rect', 'Path', 'DrawContext', 'ListWidget', 'Request', 'Script', 'config', 'LinearGradient', 'Point', `return (async () => {\n${W.scriptWidget('https://x.test/w', estilo)}\n})()`)
      fn(C, Font, class { constructor(a, b) { this.w = a; this.h = b } }, class {}, P, DC, LW, class { loadJSON() { return Promise.resolve(datos) } loadImage() { return Promise.resolve({}) } }, { setWidget(x) { w = x }, complete() {} }, { widgetFamily: fam, runsInApp: false }, class {}, class {})
        .then(() => { assert.ok(w && textos(w).some(t => /63/.test(t)), `el widget ${estilo} ${fam} enseña tus minutos de redes`); if (/^(small|medium|large)$/.test(fam) && estilo !== 'logo') assert.ok(textos(w).some(t => /reto/.test(t) || /⚔️/.test(t)), `el widget ${estilo} ${fam} avisa de retos`) })
    }
  }
  assert.equal(normalizeData({ ...d, settings: { ...d.settings, widget: { llave: 'corta' }, avisos: { hora: '25:00' } } }).settings.widget, undefined)
  assert.deepEqual(normalizeData({ ...d, settings: { ...d.settings, widget: { llave: 'WidgetLlaveSecreta12' }, avisos: { hora: '19:00' } } }).settings.avisos, { hora: '19:00' })
}
ok('widget y avisos: racha, XP de hoy, minutos y rutina; el aviso sabe si ya entrenaste hoy; llaves y horas se validan')

{
  const W = moduleOf('wod')
  const c = W.wodDe(' cindy ')
  assert.equal(c.seg, 1200); assert.equal(W.porRonda(c), 30)
  assert.deepEqual(c.partes.map(p => [p.ej, p.reps, moduleOf('conteo').patronDe(p.ej)]), [['Dominadas', 5, 'dominada'], ['Lagartijas', 10, 'empuje'], ['Sentadillas', 15, 'sentadilla']])
  let v = { i: 0, rondas: 0 }
  const vistas = []
  for (let k = 0; k < 7; k++) { v = W.siguiente(c, v.i, v.rondas); vistas.push(`${v.rondas}:${v.i}`) }
  assert.deepEqual(vistas, ['0:1', '0:2', '1:0', '1:1', '1:2', '2:0', '2:1'])
  assert.equal(W.totalWod(c, 12, 2, 7), 12 * 30 + 15 + 7)
  assert.equal(W.totalWod(c, 0, 0, 99), 5, 'no cuenta de más en un tramo')
  assert.equal(W.wodTexto(c, 382), '12 rondas + 22')
  assert.equal(W.wodTexto(c, 30), '1 ronda')
  assert.equal(W.mmss(1195), '19:55')
  assert.ok(moduleOf('rutina').CATALOG.some(x => x[0] === 'Cindy' && x[3] === 'WOD'))
}

{
  const Mo = moduleOf('modo')
  const W = moduleOf('widget')
  const M = moduleOf('minutos')
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true } })
  assert.equal(base.settings.modo, undefined)
  assert.equal(Mo.modoDe(base.settings), 'habitos')
  assert.equal(normalizeData({ ...base, settings: { ...base.settings, modo: 'raro' } }).settings.modo, undefined)
  const comp = normalizeData({ ...base, settings: { ...base.settings, modo: 'competir' } })
  assert.equal(comp.settings.modo, 'competir'); assert.ok(Mo.esCompetir(comp.settings))
  assert.deepEqual([...Mo.OCULTAS_EN_COMPETIR], ['Hoy', 'Historial'])
  assert.equal(Mo.inicioDe(base.settings, ['Entrenar', 'Amigos']), 'Hoy')
  assert.equal(Mo.inicioDe(comp.settings, ['Tareas', 'Entrenar', 'Amigos']), 'Entrenar')
  assert.equal(Mo.inicioDe(comp.settings, ['Tareas', 'Amigos']), 'Amigos')
  let d = M.conCamara(comp, '2026-11-25', 'Lagartijas', 'reps', 20, Date.parse('2026-11-25T10:00:00'))
  assert.equal(W.estadoParaAvisos(d, '2026-11-25').racha, 0, 'en modo competir no hay avisos de racha')
  assert.equal(W.estadoParaAvisos(d, '2026-11-25').ultimo, '2026-11-25')
}
ok('modo competir: se guarda, esconde Hoy y Jardín, empieza en Entrenar o Amigos y no manda avisos de racha')

{
  const L = moduleOf('legal')
  assert.equal(L.legalListo(), false, 'sin datos del responsable no se publica')
  assert.equal(L.legalListo({ nombre: 'X', domicilio: 'Y', correo: 'z@x.mx' }), true)
  const aviso = L.avisoPrivacidad(), term = L.terminos()
  const todo = JSON.stringify(aviso) + JSON.stringify(term)
  assert.ok(/Secretaría Anticorrupción y Buen Gobierno/.test(todo) && !/INAI/.test(todo), 'autoridad nueva, sin INAI')
  assert.ok(/rectificarlos, cancelarlos u oponerte/.test(todo) && /consentimiento expreso/.test(todo) && /nunca se guarda ni se envía/.test(todo))
  assert.ok(/sustituye a un profesional de la salud/.test(todo) && /Ley Federal de Protección al Consumidor/.test(todo))
  assert.ok(/Por completar/.test(todo))
  assert.match(L.AVISO_CORTO(), /No vendemos tus datos/)
  const d = normalizeData({ ...EMPTY_DATA, settings: { ...EMPTY_DATA.settings, legal: { version: L.VERSION_LEGAL, fecha: '2026-11-26T12:00:00.000Z', salud: true } } })
  assert.deepEqual(d.settings.legal, { version: L.VERSION_LEGAL, fecha: '2026-11-26T12:00:00.000Z', salud: true })
  assert.equal(normalizeData({ ...EMPTY_DATA, settings: { ...EMPTY_DATA.settings, legal: { version: 'x', fecha: 'y' } } }).settings.legal, undefined)
}
ok('legales: aviso de privacidad con autoridad nueva, ARCO y datos de salud con consentimiento expreso; términos con aviso de salud; no se publican sin los datos del responsable')

ok('Cindy: 20 min de 5 dominadas, 10 lagartijas y 15 sentadillas; cambia sola de ejercicio y el puntaje sale en rondas + repeticiones')


{
  const F = moduleOf('felicitar')
  const ahora = Date.parse('2026-11-25T20:00:00Z')
  const r = (id, marcas, ps = ['ana', 'beto', 'caro']) => ({ id, de: 'ana', participantes: ps, tipo: 'aguante', ejercicio: 'Plancha', marcas, creado: ahora - 3600000, movido: ahora, version: '' })
  const gane = r('g', { ana: 130, beto: 100, caro: 90 }), empate = r('e', { ana: 100, beto: 100, caro: 90 }), perdi = r('p', { ana: 50, beto: 100, caro: 90 }), abierto = r('a', { ana: 130 }), solo = r('s', { ana: 130 }, ['ana'])
  assert.deepEqual(F.porFelicitar([gane, empate, perdi, abierto, solo], 'ana', [], ahora).map(x => x.id), ['g'])
  assert.deepEqual(F.porFelicitar([gane], 'ana', ['g'], ahora), [], 'solo una vez por reto')
  assert.equal(F.textoFelicitar(gane, 'ana'), 'Plancha: 2:10. Le ganaste a 2 personas.')
}
ok('felicitación al ganar: solo retos terminados que ganaste sin empate, una vez cada uno')

ok('retos de 2 a 10: te toca, esperando, vence a las 48 h, lugares con empates, aguantar más y Cindy, cuenta 3-2-1 y corta a los 60 s exactos')

async function versionChecks() {
  const V = moduleOf('version')
  assert.ok(V.faltaArchivo(new TypeError('Failed to fetch dynamically imported module: https://x/assets/MiRutina-a.js')))
  assert.ok(V.faltaArchivo(new TypeError('Importing a module script failed.')))
  assert.ok(V.faltaArchivo('error loading dynamically imported module'))
  assert.equal(V.faltaArchivo(new TypeError("Cannot read properties of undefined (reading 'x')")), false)
  const ss = new Map(), idas = []
  const antes = { window: global.window, sessionStorage: global.sessionStorage, navigator: Object.getOwnPropertyDescriptor(global, 'navigator') }
  global.sessionStorage = { getItem: k => ss.has(k) ? ss.get(k) : null, setItem: (k, v) => ss.set(k, String(v)) }
  global.window = { location: { href: 'https://tuagentedeia.com/bambu/?ir=retos', replace: u => idas.push(u) }, history: { state: null, replaceState: (_s, _t, u) => idas.push('limpia ' + u) } }
  Object.defineProperty(global, 'navigator', { value: { onLine: true }, configurable: true })
  assert.equal(V.recargarPorVersion(1_000_000), true)
  assert.match(idas[0], /\?ir=retos&v=/)
  assert.equal(V.recargarPorVersion(1_030_000), false, 'no se recarga dos veces seguidas')
  assert.equal(V.recargarPorVersion(1_030_000, true), true, 'el botón Reintentar sí recarga')
  assert.equal(V.recargarPorVersion(2_000_000), true)
  navigator.onLine = false
  assert.equal(V.recargarPorVersion(9_000_000), false, 'sin señal no recarga')
  navigator.onLine = true
  ss.clear()
  let colgada = false
  V.siFaltaArchivo(new TypeError('Importing a module script failed.')).then(() => { colgada = true }, () => { colgada = true })
  await assert.rejects(V.siFaltaArchivo(new Error('otra cosa')), /otra cosa/)
  await new Promise(r => setTimeout(r, 20))
  assert.equal(colgada, false, 'mientras recarga no enseña la pantalla de error')
  window.location.href = 'https://tuagentedeia.com/bambu/?v=abc'
  V.quitarMarcaVersion()
  assert.equal(idas.at(-1), 'limpia /bambu/')
  global.window = antes.window; global.sessionStorage = antes.sessionStorage
  if (antes.navigator) Object.defineProperty(global, 'navigator', antes.navigator); else delete global.navigator
  ok('versión nueva: si faltan los archivos de una versión vieja recarga sola una vez (no sin señal ni en bucle), Reintentar recarga y la marca ?v= se limpia')
}

async function nubeChecks() {
  process.env.PORT = String(NUBE_PORT)
  const store = new Map()
  global.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }
  const srv = require('./nube-prueba.cjs')
  await new Promise(r => setTimeout(r, 150))
  const fb = moduleOf('firebase')
  const reset = () => fetch(`http://localhost:${NUBE_PORT}/_reset`)
  await reset()
  await fb.cuenta.crear('a@prueba.mx', 'contrasena1', 'Ana')
  const ana = fb.cuenta.guardada()
  assert.equal(ana.email, 'a@prueba.mx')
  assert.equal(ana.nombre, 'Ana')
  const r = fb.remoto(ana.uid)
  const rows = Array.from({ length: 1201 }, (_, i) => ({ collection: 'set', id: `s${i}`, payload: { id: `s${i}`, reps: i }, deleted: false, clientUpdatedAt: 1000 + i }))
  await r.push(rows)
  const all = await r.pull(0)
  assert.equal(all.rows.length, 1201)
  assert.equal(new Set(all.rows.map(x => x.id)).size, 1201)
  assert.equal((await r.pull(all.cursor)).rows.length, 0)
  await r.push([{ ...rows[5], payload: { id: 's5', reps: 500 }, clientUpdatedAt: 9999 }])
  const delta = await r.pull(all.cursor)
  assert.deepEqual(delta.rows.map(x => [x.id, x.payload.reps]), [['s5', 500]])
  assert.ok(delta.cursor > all.cursor)
  await fetch(`http://localhost:${NUBE_PORT}/_expire`)
  assert.equal((await r.pull(delta.cursor)).rows.length, 0)
  await assert.rejects(fb.cuenta.crear('a@prueba.mx', 'otra12345', ''), /ya tiene cuenta/)
  await assert.rejects(fb.cuenta.entrar('a@prueba.mx', 'mala'), /no son correctos/)
  await fb.publicarPerfil({ ...mine, uid: ana.uid, apodo: 'Ana' })
  const llaveAna = 'AnaLlaveSecreta12345'
  await fb.guardarPase(llaveAna, '2026-11-25T21:30:00-06:00')
  const pase = await (await fetch(`http://localhost:${NUBE_PORT}/firestore/v1/projects/tuagentedeia-4f2a1/databases/(default)/documents/bambu_pases/${llaveAna}`)).json()
  assert.equal(pase.fields.hasta.stringValue, '2026-11-25T21:30:00-06:00')
  assert.match(fb.urlPase(llaveAna), /bambu_pases\/AnaLlaveSecreta12345\?key=/)
  const ROOTN = 'projects/tuagentedeia-4f2a1/databases/(default)/documents'
  const docN = async name => (await fetch(`http://localhost:${NUBE_PORT}/_doc?name=${encodeURIComponent(`${ROOTN}/${name}`)}`)).json()
  const widgetAna = 'AnaWidgetLlave123456'
  await fb.guardarWidget(widgetAna, { dia: '2026-11-25', racha: 3, nivel: 4, xpHoy: 20, meta: 50, minutos: 6, rutina: 'Rutina 2/9' })
  const wAna = await (await fetch(`http://localhost:${NUBE_PORT}/firestore/v1/${ROOTN}/bambu_widget/${widgetAna}`)).json()
  assert.deepEqual([wAna.fields.racha.integerValue, wAna.fields.rutina.stringValue, wAna.fields.uid.stringValue], ['3', 'Rutina 2/9', ana.uid])
  assert.match(fb.urlWidget(widgetAna), /bambu_widget\/AnaWidgetLlave123456\?key=/)
  await fb.guardarAvisos(ana.uid, { endpoint: 'https://web.push.apple.com/abc', p256dh: 'BKx', auth: 'y' }, '19:00', 'America/Mexico_City', { ultimo: '', hecho: false, racha: 3 })
  await fb.estadoAvisos(ana.uid, { ultimo: '2026-11-25', hecho: true, racha: 4 })
  const avAna = await docN(`bambu_avisos/${ana.uid}`)
  assert.deepEqual([avAna.fields.hora.stringValue, avAna.fields.ultimo.stringValue, avAna.fields.hecho.booleanValue, avAna.fields.racha.integerValue, avAna.fields.sub.mapValue.fields.endpoint.stringValue], ['19:00', '2026-11-25', true, '4', 'https://web.push.apple.com/abc'])
  fb.cuenta.salir()
  assert.equal(fb.cuenta.guardada(), null)
  await fb.cuenta.crear('b@prueba.mx', 'contrasena2', 'Beto')
  const beto = fb.cuenta.guardada()
  await assert.rejects(fb.guardarPase(llaveAna, '2030-01-01T00:00:00-06:00'), /./)
  await assert.rejects(fb.guardarWidget(widgetAna, { dia: '2026-11-25', racha: 999, nivel: 1, xpHoy: 0, meta: 50, minutos: 0, rutina: '' }), /./)
  await assert.rejects(fb.estadoAvisos(ana.uid, { ultimo: '2026-11-25', hecho: true, racha: 999 }), /./)
  await assert.rejects(fb.estadoAvisos(beto.uid, { ultimo: '2026-11-25', hecho: true, racha: 1 }), /./, 'sin avisos prendidos no se puede actualizar')
  await fb.guardarPase('BetoLlaveSecreta1234', '2026-11-25T22:00:00-06:00')
  await assert.rejects(fb.remoto(ana.uid).pull(0), /./)
  await assert.rejects(fb.remoto(ana.uid).push([rows[0]]), /./)
  await fb.publicarPerfil({ ...mine, uid: beto.uid, apodo: 'Beto', xp: 10, publica: false, aprobados: [], siguiendo: [ana.uid] })
  const people = await fb.perfilesPublicos()
  assert.deepEqual(people.map(p => p.apodo).sort(), ['Ana'])
  assert.equal(people.find(p => p.apodo === 'Ana').records.Lagartijas, 25)
  assert.deepEqual((await fb.directorio()).map(d => [d.apodo, d.privada]).sort(), [['Ana', false], ['Beto', true]])
  await fb.crearReto([ana.uid], 'reps', 'Lagartijas', 23)
  await fb.crearReto([ana.uid], 'aguante', 'Plancha', 95)
  await assert.rejects(fb.crearReto([ana.uid], 'reps', 'Lagartijas', 9999), /./)
  await assert.rejects(fb.crearReto([], 'reps', 'Lagartijas', 10), /./, 'un reto necesita al menos a otra persona')
  assert.deepEqual((await fb.misRetos(beto.uid)).map(r => [r.tipo, r.marcas[beto.uid], r.participantes.length]).sort(), [['aguante', 95, 2], ['reps', 23, 2]])
  await fb.pedirAmistad(beto.uid, ana.uid)
  assert.deepEqual((await fb.solicitudes(beto.uid)).salientes, [ana.uid])
  fb.cuenta.salir()
  await fb.cuenta.entrar('a@prueba.mx', 'contrasena1')
  assert.deepEqual((await fb.solicitudes(ana.uid)).entrantes, [beto.uid])
  const R = moduleOf('retos')
  const deAna = await fb.misRetos(ana.uid)
  const reps = deAna.find(r => r.tipo === 'reps'), plancha = deAna.find(r => r.tipo === 'aguante')
  assert.equal(R.estadoReto(reps, ana.uid), 'te-toca')
  assert.ok(reps.version && reps.creado > 0)
  await fb.marcarReto(reps, ana.uid, 25)
  await assert.rejects(fb.marcarReto(await fb.leerReto(reps.id), ana.uid, 40), /./, 'solo una vez')
  await assert.rejects(fb.marcarReto({ ...reps, marcas: { ...reps.marcas, [beto.uid]: 0 }, version: '' }, ana.uid, 30), /./, 'no puede cambiar la marca de otro')
  const fin = await fb.leerReto(reps.id)
  assert.deepEqual([R.estadoReto(fin, ana.uid), fin.marcas[ana.uid], fin.marcas[beto.uid]], ['terminado', 25, 23])
  assert.deepEqual(R.lugarDe(fin, ana.uid), { lugar: 1, de: 2, empate: false })
  await fb.salirReto(plancha, ana.uid)
  await fb.reportarFallo({ donde: 'Entrenar', error: 'TypeError: ' + 'x'.repeat(900), pila: 'a\nb', version: 'index-prueba.js', navegador: 'Prueba' })
  const conFallo = await (await fetch(`http://localhost:${NUBE_PORT}/_log`)).json()
  assert.equal(conFallo.docs.filter(n => n.includes('/bambu_fallos/' + ana.uid + '__')).length, 1, 'el reporte se guarda con el uid de quien lo manda')
  const sinCuenta = await fetch(`http://localhost:${NUBE_PORT}/firestore/v1/projects/x/databases/(default)/documents:commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes: [{ update: { name: 'projects/x/databases/(default)/documents/bambu_fallos/local__abc12345', fields: { de: { stringValue: 'local' }, donde: { stringValue: 'Hoy' }, error: { stringValue: 'x' }, pila: { stringValue: '' }, version: { stringValue: 'v' }, navegador: { stringValue: 'n' } } } }] }) })
  assert.equal(sinCuenta.status, 200, 'sin cuenta también se puede reportar')
  const ajeno = await fetch(`http://localhost:${NUBE_PORT}/firestore/v1/projects/x/databases/(default)/documents:commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes: [{ update: { name: 'projects/x/databases/(default)/documents/bambu_fallos/' + ana.uid + '__abc12345', fields: { de: { stringValue: ana.uid } } } }] }) })
  assert.notEqual(ajeno.status, 200, 'sin cuenta no se puede reportar a nombre de alguien')
  assert.deepEqual((await fb.misRetos(ana.uid)).map(r => r.tipo), ['reps'])
  await assert.rejects(fb.borrarReto(reps.id), /./, 'solo quien lo creó lo borra')
  assert.equal(await fb.perfilDe(beto.uid), null)
  await assert.rejects(fb.pedirAmistad(beto.uid, ana.uid), /./)
  await fb.cancelarSolicitud(beto.uid, ana.uid)
  assert.deepEqual((await fb.solicitudes(ana.uid)).entrantes, [])
  fb.cuenta.salir()
  await fb.cuenta.entrar('b@prueba.mx', 'contrasena2')
  await fb.publicarPerfil({ ...mine, uid: beto.uid, apodo: 'Beto', xp: 10, publica: false, aprobados: [ana.uid], siguiendo: [ana.uid] })
  fb.cuenta.salir()
  await fb.cuenta.entrar('a@prueba.mx', 'contrasena1')
  assert.equal((await fb.perfilDe(beto.uid)).apodo, 'Beto')
  fb.cuenta.salir()
  await fb.cuenta.entrar('b@prueba.mx', 'contrasena2')
  await fb.cuenta.borrar('contrasena2')
  assert.equal(fb.cuenta.guardada(), null)
  await fb.cuenta.entrar('a@prueba.mx', 'contrasena1')
  assert.deepEqual((await fb.directorio()).map(d => d.apodo), ['Ana'])
  await fb.cuenta.borrar('contrasena1')
  const left = await (await fetch(`http://localhost:${NUBE_PORT}/_log`)).json()
  assert.deepEqual(left.docs.filter(n => !n.includes('/bambu_fallos/local__')), [], 'al borrar la cuenta no queda nada suyo, ni sus reportes')
  assert.equal(left.users.length, 0)
  ok('nube de punta a punta: 1,201 registros, token vencido, cuentas separadas, cuenta privada con solicitud y aceptación, pase del candado, widget y avisos que nadie más puede cambiar, retos donde cada quien marca una sola vez y puede salirse, reporte de fallas y borrado completo (con los reportes)')
  srv.closeAllConnections(); srv.close()
}
require('./share-auth.cjs')().then(() => audioChecks()).then(() => syncChecks()).then(() => nubeChecks()).then(() => versionChecks()).then(() => console.log(`PASS ${passed.length} grupos:\n - ${passed.join('\n - ')}`)).catch(error => { console.error(error); process.exit(1) })

// NFC preserves elapsed time immediately, and a repeated finish cannot duplicate it.
{
  const activeReading = { id: 'reading:nfc-regression', day: today, startedAt: 1000, title: '', location: '' }
  const result = nfcServerAction({ ...EMPTY_DATA, activeReading }, { tag: 'reading' }, 601000, today)
  assert.equal(result.next.reading.length, 1)
  assert.equal(result.next.reading[0].seconds, 600)
  assert.equal(result.next.reading[0].id, activeReading.id)
  const repeated = nfcServerAction(result.next, { tag: 'reading' }, 611000, today)
  assert.equal(repeated.next.reading.length, 1)
  assert.equal(repeated.next.reading[0].seconds, 600)
}

// Paused overnight NFC sessions retain original day and cannot duplicate on repeated scans.
{
  const activeReading = { id: 'reading:overnight', day: '2026-11-09', startedAt: 1000, pausedAt: 301000, title: 'Libro', location: '' }
  let next = nfcServerAction({ ...EMPTY_DATA, activeReading }, { tag: 'reading' }, 601000, '2026-11-10').next
  assert.equal(next.reading[0].seconds, 300)
  assert.equal(next.reading[0].day, '2026-11-09')
  for (let i = 0; i < 20; i++) next = nfcServerAction(next, { tag: 'reading' }, 602000 + i * 1000, '2026-11-10').next
  assert.equal(next.reading.length, 1)
  assert.equal(next.reading[0].seconds, 300)
}

async function audioChecks() {
  const { createAudioEngine } = moduleOf('audioEngine')
  const events = {}, attributes = {}
  let pauses = 0, plays = 0
  const fake = { volume: 1, src: '', loop: false, setAttribute: (k, v) => attributes[k] = v, removeAttribute: k => delete fake[k], addEventListener: (name, fn) => events[name] = fn,
    play: async () => { plays++; events.playing() }, pause: () => { pauses++; events.pause() } }
  const engine = createAudioEngine(() => fake)
  const unsubscribe = engine.subscribe(() => {})
  await engine.play()
  assert.equal(fake.loop, true); assert.ok('playsinline' in attributes)
  assert.ok(fake.src.startsWith('blob:'))
  unsubscribe() // simulate useSyncExternalStore cleanup when a panel unmounts
  assert.equal(engine.getSnapshot().playing, true, 'unmount never stops the module engine')
  assert.equal(pauses, 0, 'unmount must not pause the element')
  events.pause()
  assert.equal(engine.getSnapshot().interrupted, true)
  assert.equal(plays, 1, 'no automatic retry loop during interruptions')
  await engine.play()
  engine.pause()
  assert.equal(engine.getSnapshot().interrupted, false)
  assert.equal(engine.getSnapshot().playing, false)
  engine.setTimer(15)
  assert.ok(engine.getSnapshot().deadline > Date.now())
  engine.stop()
  assert.equal(engine.getSnapshot().started, false)
  assert.equal(engine.getSnapshot().deadline, 0)
  for (const beat of [6, 10, 14]) {
    const wav = binauralWav(beat, 'brown'), v = new DataView(wav)
    for (let c = 0; c < 2; c++) {
      const first = v.getInt16(44 + c * 2, true), last = v.getInt16(wav.byteLength - 4 + c * 2, true)
      assert.ok(Math.abs(first - last) < 250, 'brown noise seam remains continuous')
    }
  }
  // El ruido no se apaga en la costura: nivel junto al corte parecido al de la mitad del bucle.
  {
    const brown = new DataView(binauralWav(10, 'brown')), pure = new DataView(binauralWav(10))
    const frames = 44100 * LOOP_SECONDS, w = 4410
    const rms = (from, to) => { let s = 0; for (let i = from; i < to; i++) { const d = brown.getInt16(44 + i * 4, true) - pure.getInt16(44 + i * 4, true); s += d * d }; return Math.sqrt(s / (to - from)) }
    const edge = 882, seam = Math.min(rms(0, edge), rms(frames - edge, frames)), mid = rms(frames / 2 - w * 10, frames / 2)
    assert.ok(seam > mid * .3, `ruido junto a la costura ${seam.toFixed(0)} contra ${mid.toFixed(0)} a la mitad`)
  }
  // iPhone: audio.volume siempre vale 1. El volumen se hornea en el WAV y el deslizador lo regenera.
  {
    const ev = {}
    const ios = { src: '', loop: false, currentTime: 0, setAttribute: () => {}, removeAttribute: () => {}, addEventListener: (n, fn) => ev[n] = fn,
      play: async () => { ev.playing() }, pause: () => { ev.pause() } }
    Object.defineProperty(ios, 'volume', { get: () => 1, set: () => {} })
    const e2 = createAudioEngine(() => ios)
    await e2.play()
    const before = ios.src
    e2.setVolume(15)
    await new Promise(r => setTimeout(r, 400))
    assert.notEqual(ios.src, before, 'en iPhone el volumen regenera el sonido')
    assert.equal(e2.getSnapshot().playing, true)
    e2.stop()
  }
  ok('audio singleton: unmount, user pause, interruption, timer, brown-noise seam and iPhone volume')
}

// v7: dynamic rest, conservative static dose and photographs with traceable licenses.
{
  const S = moduleOf('stretch'), science = moduleOf('science').EVIDENCE
  const index = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/estiramientos/indice.json'), 'utf8'))
  for (const when of ['manana', 'noche']) {
    for (const move of S.ROUTINES[when].moves) {
      assert.equal(move.kind, when === 'manana' ? 'dynamic' : 'static')
      assert.ok(move.seconds >= 10 && move.seconds <= 30)
      assert.ok(science.some(e => e.id === move.evidence))
      assert.ok(move.muscle && move.why)
      for (const img of index[move.photo].images) {
        assert.equal(img.license, 'Unlicense'); assert.ok(img.source.startsWith('https://'))
        const bytes = fs.readFileSync(path.join(__dirname, '../public/estiramientos', img.file))
        assert.equal(bytes[0], 255); assert.equal(bytes[1], 216)
      }
    }
  }
  for (const loaded of [[], ['pecho'], ['cuadriceps'], ['isquios']]) {
    for (const next of [[], ['hombros'], ['pantorrillas']]) {
      const m = S.restMobility(loaded, next)
      assert.equal(m.kind, 'dynamic', 'rest suggestion must never be static')
      assert.ok(m.seconds >= 20 && m.seconds <= 30)
      assert.ok(index[m.photo])
    }
  }
  assert.equal(S.ROUTINES.noche.rounds, 2)
  ok('v7 stretch: dose, dynamic rest, evidence and real photo files')
}

// v7 food: manufacturer portions, safe habits and adult-only UI gates.
{
  const F = moduleOf('foods'), N = moduleOf('nutrition'), C = moduleOf('foodCheckin')
  assert.equal(new Set(F.FOODS.map(f => f.id)).size, F.FOODS.length)
  assert.equal(F.foodById('wild-mini').protein, 10.3)
  assert.equal(F.foodById('wild-mini').kcal, 115)
  assert.equal(F.foodById('yoplait-natural').protein, 7.3)
  assert.equal(F.foodById('yoplait-fresa').kcal, Math.round(78 * 1.45))
  assert.equal(F.foodById('empanada-elote').estimated, true)
  for (const hunger of ['normal', 'often', 'little']) for (const breakfast of ['yes', 'sometimes', 'no']) for (const energy of ['good', 'low', 'rest']) {
    const advice = C.foodCheckinAdvice({ hunger, breakfast, energy }).join(' ')
    assert.doesNotMatch(advice, /kcal|calor|IMC|percentil|techo|bajar de peso|subir de peso/)
    if (energy === 'low' || hunger === 'little') assert.match(advice, /pediatra/)
  }
  for (const age of [5, 13, 17]) for (const goal of ['definir', 'musculo', 'ambos', 'salud']) {
    const d = normalizeData({ ...EMPTY_DATA, settings: { age, nutrition: { sex: 'h', goal } }, body: [{ day: '2026-11-22', weightKg: 50, heightCm: 160, waistCm: 90 }] })
    const p = N.planFor(d)
    assert.equal(p.mode, 'crecimiento')
    for (const key of ['kcal', 'phase', 'rate', 'tdee']) assert.equal(key in p, false, 'minor must not receive weight or calorie targets')
  }
  const page = fs.readFileSync(path.join(__dirname, '../src/FoodPage.tsx'), 'utf8')
  assert.ok(page.includes('{!growth && <Method />}'), 'adult method must be hidden for minors')
  // Decisión de Gael 23-nov: menores ven un PISO de energía (nunca techo ni déficit).
  assert.ok(Math.abs(N.eerTeen('h', 13, 45, 160, 1.26) - 2643.1) < 0.5, 'EER IOM 2005 contra el cálculo a mano')
  assert.ok(Math.abs(N.eerTeen('m', 13, 45, 160, 1.31) - 2307.1) < 0.5, 'EER IOM 2005 mujer')
  for (const goal of ['definir', 'musculo', 'ambos', 'salud', undefined]) {
    const flat = [0, 7, 14, 21, 27].map(k => ({ day: N.shiftDay('2026-11-22', -k), weightKg: 45, heightCm: 160 }))
    const d = normalizeData({ ...EMPTY_DATA, settings: { age: 13, footballDays: [1, 3, 5], nutrition: { sex: 'h', goal } }, body: flat })
    const f = N.planFor(d, Date.parse('2026-11-22T12:00:00')).floor
    assert.ok(f && f.kcal >= f.eer && f.extra >= 0, 'el piso nunca baja del gasto')
    assert.equal(f.extra, goal === 'musculo' || goal === 'ambos' ? 450 : 0, 'sin subir en 4 semanas, el extra crece; nunca para bajar')
    assert.doesNotMatch(f.why, /bajar|déficit|pasaste|exceso|demasiad/)
  }
  const metas = page.slice(page.indexOf('function Metas'), page.indexOf('export function FoodPage'))
  assert.ok(metas.includes('Peso (kg)') && metas.includes('Estatura (cm)') && !/growth && <label>Peso|growth && <label>Estatura/.test(metas), 'un menor registra peso y estatura')
  assert.ok(page.includes('<Metas data={data} commit={commit} growth={growth} plan={plan} />'))
  const mensajeMenor = page.slice(page.indexOf(': growth ? (t.kcal'), page.indexOf('\n', page.indexOf(': growth ? (t.kcal')))
  assert.ok(mensajeMenor.includes('piso'))
  assert.doesNotMatch(mensajeMenor, /pasaste|Te quedan|exceso/, 'pasar el piso nunca es malo')
  const logger = fs.readFileSync(path.join(__dirname, '../src/FoodLogger.tsx'), 'utf8')
  const item = { name: 'Label protein only', qty: 1, unit: 'portion', kcal: 0, protein: 12, group: 'proteina' }
  const data = normalizeData({ ...EMPTY_DATA, settings: { age: 13 }, body: [{ day: '2026-11-22', weightKg: 50, heightCm: 160 }], meals: [1,2,3].map(i => ({ id: String(i), day: '2026-11-21', at: i, slot: 'comida', items: [item] })) })
  assert.equal(N.planFor(data, Date.parse('2026-11-22T12:00:00')).fuel, 'sin-datos', 'unknown energy is not undereating')
  ok('v7 food: labels, habits, incomplete entries and minor protections')
}

// Pausa antes de las apps (Atajos de iOS): enlace, servidor, nota que sobrevive al limpiador, fricción.
{
  const P = moduleOf('pause'), day = '2026-11-23'
  assert.deepEqual(parseNfc('?nfc=pause&app=Instagram&k=x'), { tag: 'pause', app: 'instagram' })
  assert.deepEqual(parseNfc('?nfc=pause&app=tiktok&o=p10').outcome, { kind: 'pase', minutes: 10 })
  assert.equal(parseNfc('?nfc=pause&app=tiktok&o=p99').outcome, undefined, 'minutos raros no anotan nada')
  assert.equal(parseNfc('?nfc=pause&app=<script>').app, 'script')
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'G', onboardingComplete: true } })
  assert.equal(nfcServerAction(base, parseNfc('?nfc=pause&app=instagram'), 1, day).next, base, 'sin decisión no escribe')
  const r1 = nfcServerAction(base, parseNfc('?nfc=pause&app=instagram&o=r'), 1, day)
  const r2 = nfcServerAction(r1.next, parseNfc('?nfc=pause&app=instagram&o=p5'), 2, day)
  assert.deepEqual(P.pauseStats(r2.next, day), { total: 2, resisted: 1 })
  assert.match(r2.text, /1 de 2 veces/)
  // La nota viaja por registros y vuelve igual (el servidor limpia con el mismo modelo).
  const back = applyRecords(EMPTY_DATA, diffRecords(base, r2.next, 10))
  assert.deepEqual(P.pauseStats(normalizeData(back), day), { total: 2, resisted: 1 }, 'la pausa sobrevive al viaje por la nube')
  assert.deepEqual([0, 1, 2, 5, 9].map(P.breathSeconds), [5, 8, 11, 20, 20], 'la respiración crece y topa en 20 s')
  assert.match(P.passShortcutUrl(P.pauseApp('instagram'), 10), /^shortcuts:\/\/run-shortcut\?name=Bamb%C3%BA%20Pase&input=text&text=10%7Cinstagram%3A%2F%2F$/)
  ok('pausa antes de las apps: enlace, servidor, nube y fricción')
}

{
  const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
  const rutina = leer('src/MiRutina.tsx'), app = leer('src/App.tsx'), ob = leer('src/Onboarding.tsx'), sw = leer('public/avisos-sw.js'), main = leer('src/main.tsx')
  assert.doesNotMatch(rutina, /Recuperaci/, 'Recuperación ya no está en Mi rutina')
  assert.ok(/esKiki && /.test(app) && !/uid === '[A-Za-z0-9]{20,}'/.test(app), 'los ajustes de rutina de Kiki solo corren en su cuenta y sin uid a la vista')
  assert.ok(ob.includes("modules.food") && ob.includes("'edad'"), 'la edad solo se pregunta si eligen Comida')
  assert.ok(ob.includes('Prefiero no decirla') && ob.includes('sinEdad'), 'la edad es opcional')
  assert.equal(normalizeData({ ...EMPTY_DATA, settings: { sinEdad: true } }).settings.sinEdad, true, 'sin edad sobrevive a la limpieza')
  assert.equal(normalizeData({ ...EMPTY_DATA, settings: { sinEdad: 'x' } }).settings.sinEdad, undefined)
  assert.ok(fs.existsSync(path.join(__dirname, '../public/cuerpo/base.webp')) && !fs.existsSync(path.join(__dirname, '../public/cuerpo/base.png')), 'cuerpo en WebP')
  assert.ok(sw.includes("addEventListener('fetch'") && sw.includes('caches.open') && main.includes('serviceWorker'), 'funciona sin internet')
  const T = moduleOf('temporada')
  const nombres = JSON.stringify(T)
  assert.doesNotMatch(nombres, /Flojito|Gordito|Chiquito|ito"/, 'nombres serios en la temporada')
  const foto = leer('src/lib/fotosComida.ts')
  assert.ok(foto.includes('indexedDB') && !/fetch\(|firestore/i.test(foto), 'las fotos de comida no salen del teléfono')
  ok('tanda 26-nov: sin Recuperación, ajustes solo en la cuenta de Kiki, edad con Comida, cuerpo WebP, sin internet, nombres serios y fotos locales')
}

{
  const mi = moduleOf('minutos')
  const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
  const t = mi.hastaTexto(Date.parse('2026-11-26T21:35:07'))
  assert.equal(t, '2026-11-26 21:35:07', 'el pase va sin T ni zona: el lector de fechas de Atajos leía 2026-11-26T21:35:00-06:00 como las 12:00')
  const day = '2026-11-26'
  let d = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { minLibres: 0, candado: { llave: 'abcdefghijkmnpqrstu' } } })
  d = mi.conCamara(d, day, 'Lagartijas', 'reps', 20, 1000, true)
  const pase = mi.paseActivity(day, 'instagram', 5)
  d = { ...d, activities: [...d.activities, pase], settings: { ...d.settings, candado: { llave: 'abcdefghijkmnpqrstu', desde: 1000, hasta: 301000, pase: pase.id } } }
  d = normalizeData(d)
  assert.equal(d.settings.candado.hasta, 301000, 'el pase abierto sobrevive a la limpieza')
  assert.ok(/^pase:/.test(d.settings.candado.pase))
  assert.equal(mi.saldo(d, day), 5)
  assert.deepEqual(mi.paseAbierto(d, 2000), { desde: 1000, hasta: 301000, pase: pase.id })
  assert.equal(mi.paseAbierto(d, 400000), null)
  const devuelto = mi.devolverPase(d)
  assert.equal(mi.saldo(devuelto, day), 10, 'si el atajo te regresó, te devuelve los minutos')
  assert.deepEqual(devuelto.settings.candado, { llave: 'abcdefghijkmnpqrstu' })
  const e = { ...d, activities: [...d.activities, mi.emergenciaActivity(day, 'instagram'), mi.emergenciaActivity(day, 'tiktok')] }
  assert.equal(mi.saldo(e, day), 5, 'la emergencia no gasta tus minutos y no tiene límite')
  const r = mi.devolver2611({ ...d, activities: [...d.activities, mi.paseActivity('2026-11-25', 'instagram', 5)] })
  assert.equal(mi.saldo(r, day), 10, 'se devuelven los pases del 26-nov que el atajo no dejó usar')
  assert.equal(r.activities.filter(a => mi.paseMinutos(a) > 0).length, 1, 'los de otros días se quedan')
  assert.equal(normalizeData(r).settings.devolver2611, true)
  const cand = leer('src/Candado.tsx'), cam = leer('src/CamaraReps.tsx'), sw = leer('public/avisos-sw.js')
  assert.ok(cand.includes('Buscar ejercicio') && cand.includes('sinAcentos'), 'buscador de ejercicios sin acentos')
  assert.ok(cand.includes('Minutos libres cada día') && cand.includes('LIBRES_OPCIONES'), 'los minutos libres se cambian en Ajustes')
  assert.ok(cand.includes('{!data.settings.sinUsoImportante && <button') && cand.includes('role="switch"'), 'el botón de uso importante se prende o apaga en Ajustes')
  assert.equal(normalizeData({ ...EMPTY_DATA, settings: { sinUsoImportante: true } }).settings.sinUsoImportante, true)
  assert.ok(cand.includes('Devolverme los minutos') && cand.includes('{EMERGENCIA_MIN} min para uso importante') && !cand.includes('🚨'), 'el pase rápido no es rojo ni se llama emergencia')
  assert.ok(cand.includes('Probar mi atajo') && /guardarPase\(llave, hastaTexto\(Date\.now\(\) \+ 60000\)\)/.test(cand), 'probar el atajo abre 1 minuto sin gastar minutos')
  assert.ok(cam.includes('d-cam-gana') && cam.includes("'minuto'"), 'la cámara dice cuánto vas ganando')
  assert.ok(sw.includes('Promise.race') && sw.includes('1500'), 'con señal lenta abre lo guardado')
  ok('candado: hora del pase que entiende Atajos, devolver minutos si el atajo te regresa, emergencia de 10 min sin límite, tus minutos del 26-nov de vuelta, buscador y cuánto vas ganando')
}

{
  const D = moduleOf('deportes')
  const R = moduleOf('rutina')
  const day = '2026-11-26'
  const it = (name, kind = 'reps', target = 10) => ({ id: name, name, kind, target })
  const semana = R.seedWeek()
  const idx = R.weekIndex(day)
  semana.week[idx] = { day: idx, title: 'Cuerpo completo', rounds: 3, items: [it('Sentadillas'), it('Lagartijas'), it('Dominadas', 'reps', 5), it('Plancha', 'seconds', 30), it('Desplantes')] }
  let d = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, train: semana } })
  assert.equal(R.routineFor(d, day).items.length, 5)
  assert.equal(D.buscarDeportes('futb').map(x => x.name).join(), 'Fútbol,Fútbol americano', 'buscador sin acentos')
  assert.ok(D.DEPORTES.length >= 25)
  assert.deepEqual([[30, 1], [45, 2], [60, 2], [90, 2], [60, 3], [120, 1]].map(([m, i]) => D.nivelDe(D.carga(m, i))), ['nada', 'rebaja', 'rebaja', 'descanso', 'descanso', 'descanso'])
  const fut = D.deportePorId('futbol')
  const conFut = (min, int, ajusta = true) => normalizeData({ ...d, activities: [...d.activities, D.deporteActivity(day, fut, '', min, int, ajusta)] })
  const rebaja = R.routineFor(conFut(45, 2), day)
  assert.deepEqual(rebaja.items.map(i => i.name), ['Lagartijas', 'Dominadas', 'Plancha'], 'fútbol moderado quita pierna')
  assert.equal(rebaja.rounds, 2, 'y baja a 2 rondas')
  assert.equal(R.routineFor(conFut(90, 2), day), null, 'fútbol fuerte: descanso, cuenta como entreno')
  assert.equal(R.lockActive({ ...conFut(90, 2), settings: { ...conFut(90, 2).settings, train: { ...semana, lock: true, deadline: '08:00' } } }, day, '20:00'), false, 'el deporte fuerte quita el candado de la hora de entrenar')
  assert.equal(R.routineFor(conFut(90, 3, false), day).items.length, 5, 'solo registrarlo no cambia la rutina')
  assert.equal(R.routineFor(conFut(30, 1), day).items.length, 5, 'algo ligero no cambia nada')
  const esc = normalizeData({ ...d, activities: [...d.activities, D.deporteActivity(day, D.deportePorId('escalar'), '', 60, 2, true)] })
  assert.deepEqual(R.routineFor(esc, day).items.map(i => i.name), ['Sentadillas', 'Lagartijas', 'Desplantes'], 'escalar quita jalón y abdomen')
  const otro = normalizeData({ ...d, activities: [...d.activities, D.deporteActivity(day, null, 'Paintball', 60, 2, true)] })
  assert.equal(D.nombreDeporte(otro.activities.at(-1)), 'Paintball')
  assert.equal(otro.activities.at(-1).deporte, 'otro')
  assert.equal(R.routineFor(otro, day).rounds, 2, 'un deporte que no conozco solo baja rondas')
  assert.equal(D.decision(D.ajusteDe(conFut(45, 2), day), semana.week[idx]), 'Te quito pierna y bajo a 2 rondas.')
  assert.equal(D.decision(D.ajusteDe(conFut(90, 2), day), semana.week[idx]), 'Hoy descansas: ya cumpliste tu entreno.')
  assert.equal(moduleOf('xp').xpOn(conFut(90, 2), day) - moduleOf('xp').xpOn(d, day), 30, 'el deporte fuerte da XP como una rutina')
  assert.equal(normalizeData({ ...d, activities: [{ id: 'x1', day, kind: 'other', deporte: 'NO VALE', sinAjuste: 'si' }] }).activities[0].deporte, undefined)
  ok('otros deportes: buscador, duración e intensidad deciden descanso, quitar músculos usados o nada; solo registrarlo no cambia la rutina; da XP y quita el candado de la hora')
}

{
  const mi = moduleOf('minutos')
  const day = '2026-11-26'
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { minLibres: 30, candado: { llave: 'abcdefghijkmnpqrstu' } } })
  const pase = mi.paseActivity(day, 'instagram', 10)
  const t0 = Date.parse('2026-11-26T21:00:00')
  const d = normalizeData({ ...base, activities: [pase], settings: { ...base.settings, candado: { llave: 'abcdefghijkmnpqrstu', desde: t0, hasta: t0 + 600000, pase: pase.id } } })
  assert.equal(mi.saldo(d, day), 20)
  assert.equal(mi.sobranDe(d, t0 + 3 * 60000 + 20000), 6, 'a los 3 min 20 s sobran 6 completos')
  const fin = mi.terminarPase(d, t0 + 3 * 60000 + 20000)
  assert.equal(mi.saldo(fin, day), 26, 'ya terminé: te devuelve lo que sobró')
  assert.match(fin.activities[0].note, /· 4 min$/)
  assert.deepEqual(fin.settings.candado, { llave: 'abcdefghijkmnpqrstu' })
  assert.equal(mi.saldo(mi.terminarPase(d, t0 + 5000), day), 29, 'el minuto empezado cuenta como usado')
  assert.equal(mi.sobranDe(d, t0 + 700000), 0, 'ya vencido no devuelve nada')
  const urg = mi.emergenciaActivity(day, 'instagram')
  const e = normalizeData({ ...base, activities: [urg], settings: { ...base.settings, candado: { llave: 'abcdefghijkmnpqrstu', desde: t0, hasta: t0 + 600000, pase: urg.id } } })
  assert.equal(mi.sobranDe(e, t0 + 60000), 0, 'la emergencia no devuelve minutos')
  assert.equal(mi.terminarPase(e, t0 + 60000).activities.length, 1)
  ok('ya terminé: cierra el pase en la nube y devuelve los minutos completos que sobran')
}

{
  const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
  const top = leer('src/DuoTop.tsx'), cand = leer('src/Candado.tsx')
  assert.ok(top.includes("'?candado=redes'") && top.includes('saldo(data, today)'), 'arriba se ven tus minutos de redes y abren el candado dentro de la app')
  assert.ok(cand.includes('Abrir mis redes') && cand.includes("new URL('?candado=redes', document.baseURI)"), 'en Redes se abre un pase sin pasar por Safari')
  ok('abrir mis redes desde la app de la pantalla de inicio: botón en Redes y minutos arriba')
}

{
  const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
  const fb = leer('src/lib/firebase.ts'), cand = leer('src/Candado.tsx'), pa = leer('src/PaseAbierto.tsx')
  assert.ok(/fieldPaths: \['paseHasta'\]/.test(fb) && fb.includes('currentDocument: { exists: true }'), 'la hora del pase se guarda solo si ya tienes avisos')
  assert.ok(cand.includes('avisarFinPase(fin)') && cand.includes('avisarFinPase(0)') && pa.includes('avisarFinPase(0)'), 'al abrir avisa la hora; al terminar o devolver la borra')
  ok('aviso al teléfono 1 minuto antes y al acabar el pase (y se cancela con Ya terminé)')
}

{
  const av = fs.readFileSync(path.join(__dirname, '../src/lib/avisos.ts'), 'utf8')
  const cuerpo = av.slice(av.indexOf('export async function activar'))
  assert.ok(cuerpo.indexOf('requestPermission') < cuerpo.indexOf('listo()'), 'en iPhone el permiso se pide antes de cualquier paso lento')
  assert.ok(!/for \(let i = 0; i < 20/.test(av), 'ya no espera en bucle al prender avisos')
  assert.ok((cuerpo.match(/tope\(/g) || []).length >= 4, 'prender avisos nunca se queda cargando para siempre')
  ok('prender avisos en iPhone: permiso primero y con tope de tiempo')
}

{
  const mi = moduleOf('minutos'), L = moduleOf('libre')
  const day = '2026-11-27'
  const base = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { minLibres: 0 } })
  const rut = mi.conCamara(base, day, 'Sentadillas', 'reps', 40, 1000, false, true)
  assert.equal(rut.sets.at(-1).note, 'camara-rutina')
  assert.equal(mi.ganados(rut, day), 0, 'los ejercicios de tu rutina no dan minutos de redes')
  assert.equal(L.records(rut, undefined, true).get('Sentadillas').best, 40, 'pero sí cuentan como récord con cámara')
  assert.equal(mi.ganados(mi.conCamara(base, day, 'Sentadillas', 'reps', 40, 1000), day), 10, 'Libre y retos sí dan minutos')
  const src = fs.readFileSync(path.join(__dirname, '../src/MiRutina.tsx'), 'utf8')
  assert.ok(src.includes('Date.now(), false, true)') && src.includes('sinMinutos'), 'la rutina guarda sin minutos y la cámara no enseña "vas ganando"')
  ok('la rutina no da minutos de redes (Libre, retos y Redes sí)')
}

{
  const R = moduleOf('rutina')
  const sem = R.seedWeek()
  const conAsistida = { ...sem, week: sem.week.map(rt => rt ? { ...rt, items: rt.items.map(i => i.name === 'Pistol squat' ? { ...i, name: 'Pistol squat asistida' } : i) } : rt) }
  const d = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, train: conAsistida } })
  const n = R.pistol2711(d)
  const nombres = n.settings.train.week.flatMap(rt => rt ? rt.items.map(i => i.name) : [])
  assert.ok(!nombres.includes('Pistol squat asistida') && nombres.includes('Pistol squat'), 'la pistol squat asistida pasa a pistol squat')
  assert.equal(normalizeData(n).settings.pistol2711, true)
  assert.ok(!R.seedWeek().week.some(rt => rt && rt.items.some(i => i.name === 'Pistol squat asistida')))
  ok('rutina de Kiki: pistol squat sin asistir')
}

{
  const C = moduleOf('conteo')
  const P = (x, y, z = 0, v = 1) => ({ x, y, z, v })
  const ruido = s => (Math.sin(s * 12.9898) * 43758.5453 % 1) * 0.004
  const frente = (o) => { const img = Array.from({ length: 33 }, () => P(0.5, 0.95, 0, 0)); for (const [i, p] of Object.entries(o)) img[i] = p; return { img, mundo: img.map(p => ({ ...p, z: p.z * 0.25 })), aspecto: 1 } }
  const cuerpo = (baja, k, extra = {}) => { const h = 0.55 + baja, sh = h - 0.22, rod = 0.72 + baja * 0.15, z = -baja * 0.9, r = s => ruido(k * 7 + s); return frente({ 0: P(0.5, sh - 0.08 + r(1)), 11: P(0.41, sh + r(2)), 12: P(0.59, sh + r(3)), 13: P(0.39, sh + 0.12), 14: P(0.61, sh + 0.12), 15: P(0.4, sh + 0.24), 16: P(0.6, sh + 0.24), 23: P(0.45, h + r(4)), 24: P(0.55, h + r(5)), 25: P(0.43 - baja * 0.1, rod, z), 26: P(0.57 + baja * 0.1, rod, z), 27: P(0.44, 0.92), 28: P(0.56, 0.92), ...extra }) }
  const talon = (sube, k) => { const d = -sube + ruido(k) * 0.5; return frente({ 0: P(0.5, 0.25 + d), 11: P(0.41, 0.33 + d), 12: P(0.59, 0.33 + d), 13: P(0.39, 0.45 + d), 14: P(0.61, 0.45 + d), 15: P(0.4, 0.56 + d), 16: P(0.6, 0.56 + d), 23: P(0.45, 0.55 + d), 24: P(0.55, 0.55 + d), 25: P(0.44, 0.72 + d), 26: P(0.56, 0.72 + d), 27: P(0.44, 0.92 + d * 0.5), 28: P(0.56, 0.92 + d * 0.5) }) }
  const corre = (ej, reps, hondo, hacer, dur = 2200) => { let c = C.nuevoConteo(ej), t = 0, k = 0; for (let i = 0; i < 1500; i += 33) { c = C.paso(c, hacer(0, k++), t); t += 33 } for (let r = 0; r < reps; r++) { for (let i = 0; i <= dur; i += 33) { c = C.paso(c, hacer(hondo * Math.sin(Math.PI * i / dur), k++), t); t += 33 } for (let i = 0; i < 500; i += 33) { c = C.paso(c, hacer(0, k++), t); t += 33 } } return c.reps }
  assert.equal(corre('Sentadillas', 5, 0.15, cuerpo), 5, 'de frente cuenta por cuánto baja la cadera aunque la rodilla se vea poco doblada')
  assert.equal(corre('Sentadillas', 5, 0.06, cuerpo), 0, 'media sentadilla no cuenta')
  assert.equal(corre('Desplantes', 6, 0.14, cuerpo), 6, 'desplantes de frente alternando')
  assert.equal(corre('Pistol squat', 4, 0.17, (b, k) => cuerpo(b, k, { 26: P(0.6, 0.6, -0.15), 28: P(0.62, 0.66, -0.3) })), 4, 'pistol con la pierna libre doblada')
  assert.equal(corre('Sentadillas', 4, 0, cuerpo), 0, 'parado no cuenta')
  assert.equal(C.patronDe('Elevaciones de talones'), 'talones')
  assert.equal(corre('Elevaciones de talones', 8, 0.035, talon, 1400), 8, 'talones: cuenta cuando subes en puntas y bajas')
  assert.equal(corre('Elevaciones de talones', 8, 0.008, talon, 1400), 0, 'talones a medias no cuentan')
  assert.equal(C.opcionesDe('Sentadilla con salto').salto, true, 'la sentadilla con salto sigue midiendo la rodilla')
  ok('piernas de frente: sentadillas, desplantes y pistol por la caída de la cadera; talones por la subida de los hombros')
}

{
  const C = moduleOf('conteo')
  const P = (x, y, v = 1) => ({ x, y, z: 0, v })
  const ruido = s => (Math.sin(s * 12.9898) * 43758.5453 % 1) * 0.004
  const puente = (sube, k) => { const sh = P(0.25, 0.8 + ruido(k)), hp = P(0.5, 0.8 - sube + ruido(k + 1)), kn = P(0.68, 0.62 + ruido(k + 2)), an = P(0.78, 0.8); const img = Array.from({ length: 33 }, () => P(0.5, 0.95, 0)); Object.assign(img, { 0: P(0.17, 0.78), 11: sh, 12: sh, 13: P(0.3, 0.8), 14: P(0.3, 0.8), 15: P(0.4, 0.8), 16: P(0.4, 0.8), 23: hp, 24: hp, 25: kn, 26: kn, 27: an, 28: an, 31: P(0.84, 0.81), 32: P(0.84, 0.81) }); return { img, mundo: img, aspecto: 1 } }
  const corre = (reps, sube) => { let c = C.nuevoConteo('Puente de glúteo'), t = 0, k = 0, aviso = null; for (let i = 0; i < 1500; i += 33) { c = C.paso(c, puente(0, k++), t); t += 33 } for (let r = 0; r < reps; r++) { for (let i = 0; i <= 2400; i += 33) { c = C.paso(c, puente(sube * Math.sin(Math.PI * i / 2400), k++), t); t += 33; aviso = c.aviso || aviso } for (let i = 0; i < 600; i += 33) { c = C.paso(c, puente(0, k++), t); t += 33 } } return { reps: c.reps, aviso } }
  assert.equal(C.patronDe('Puente de glúteo'), 'puente')
  assert.equal(corre(8, 0.1).reps, 8, 'puente completo cuenta')
  assert.equal(corre(8, 0.072).reps, 8, 'casi en línea también cuenta')
  const media = corre(6, 0.058)
  assert.equal(media.reps, 0, 'a medias no cuenta')
  assert.equal(media.aviso, 'cadera', 'y te dice que subas la cadera')
  ok('puente de glúteo: medida propia de lado (hombro-cadera-rodilla), a medias no cuenta y avisa')
}

{
  const C = moduleOf('conteo'), R = moduleOf('rutina')
  const P = (x, y, v) => ({ x, y, z: 0, v })
  const dePieLado = (lejos) => { const img = Array.from({ length: 33 }, () => P(0.5, 0.95, 0)); for (const [i, [x, y]] of Object.entries({ 0: [0.5, 0.15], 11: [0.5, 0.28], 13: [0.5, 0.42], 15: [0.5, 0.55], 23: [0.5, 0.55], 25: [0.5, 0.73], 27: [0.5, 0.9] })) { img[i] = P(x, y, 0.95); img[+i + 1] = P(x + 0.01, y, lejos) } return { img, mundo: img, aspecto: 1 } }
  assert.ok(C.medir('generico', dePieLado(0.2), C.opcionesDe('Crunches')).visto, 'de lado te ve aunque el lado lejano casi no se vea')
  assert.ok(C.medir('quieto', dePieLado(0.2), C.opcionesDe('Aguante raro')).visto)
  const cam = fs.readFileSync(path.join(__dirname, '../src/CamaraReps.tsx'), 'utf8')
  assert.ok(/minTrackingConfidence: 0\.3/.test(cam), 'el detector no te suelta tan fácil de lado')
  const lsit = (caida, mal) => { const img = Array.from({ length: 33 }, () => P(0.5, 0.95, 0)); const pon = (i, x, y) => { img[i] = P(x, y, 0.9); img[i + 1] = P(x + 0.01, y, 0.25) }; img[0] = P(0.42, 0.27, 0.9); pon(11, 0.45, 0.35); pon(13, 0.47, 0.48); pon(15, 0.48, 0.62); pon(23, 0.47, 0.6); pon(25, 0.65, 0.6 + caida * 0.4); pon(27, 0.82, 0.6 + caida); const mundo = img.map((p, i) => mal && i >= 25 && i <= 28 ? { ...p, y: p.y + 0.15, x: p.x - 0.06 } : p); return { img, mundo, aspecto: 1 } }
  const vale = m => m.visto && m.postura && m.recto
  assert.ok(vale(C.medir('lsit', lsit(0, true), C.opcionesDe('L sit'))), 'L sit de lado cuenta aunque la profundidad de la cámara salga mal')
  assert.equal(vale(C.medir('lsit', lsit(0.25, false), C.opcionesDe('L sit'))), false, 'con las piernas caídas no es L sit')
  const d = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, train: R.seedWeek() } })
  const conL = d.settings.train.week.flatMap(rt => rt ? rt.items.filter(i => i.name === 'L sit') : [])
  assert.ok(conL.length && conL.every(i => i.target === 15), 'L sit a 15 segundos')
  const viejo = { ...d, settings: { ...d.settings, train: { ...d.settings.train, week: d.settings.train.week.map(rt => rt ? { ...rt, items: rt.items.map(i => i.name === 'L sit' ? { ...i, target: 10 } : i) } : rt) } } }
  assert.ok(R.lsit2711(viejo).settings.train.week.flatMap(rt => rt ? rt.items.filter(i => i.name === 'L sit') : []).every(i => i.target === 15))
  ok('de lado: te encuentra aunque no vea el lado lejano; L sit con ángulos de la imagen; L sit a 15 s')
}

{
  const C = moduleOf('conteo'), R = moduleOf('rutina')
  const P = (x, y, v = 0.9) => ({ x, y, z: 0, v })
  const rr = (k, s) => (Math.sin((k * 7 + s) * 12.9898) * 43758.5453 % 1) * 0.006
  const cuadro = (o, k) => { const img = Array.from({ length: 33 }, () => P(0.5, 0.95, 0)); for (const [i, [x, y]] of Object.entries(o)) { img[i] = P(x + rr(k, +i), y + rr(k, +i + 40)); img[+i + 1] = P(x + 0.01, y, 0.25) } return { img, mundo: img, aspecto: 1 } }
  const hollow = (k, a) => cuadro({ 0: [0.16, 0.78 - a], 11: [0.22, 0.79 - a], 13: [0.15, 0.78 - a], 15: [0.08, 0.77 - a], 23: [0.48, 0.79], 25: [0.66, 0.79 - a * 0.5], 27: [0.84, 0.79 - a], 29: [0.86, 0.79 - a], 31: [0.88, 0.78 - a] }, k)
  const lateral = (k, caida) => cuadro({ 0: [0.16, 0.42], 11: [0.22, 0.5], 13: [0.22, 0.62], 15: [0.3, 0.62], 23: [0.5, 0.6 + caida], 25: [0.66, 0.66], 27: [0.82, 0.72], 29: [0.84, 0.73], 31: [0.86, 0.73] }, k)
  const crunch = (k, e) => { const a = e * Math.PI / 180, L = 0.28; return cuadro({ 0: [0.5 - 0.34 * Math.cos(a), 0.78 - 0.34 * Math.sin(a)], 11: [0.5 - L * Math.cos(a), 0.8 - L * Math.sin(a)], 13: [0.5 - L * Math.cos(a) + 0.04, 0.78 - L * Math.sin(a)], 15: [0.5 - L * Math.cos(a) + 0.08, 0.76 - L * Math.sin(a)], 23: [0.5, 0.8], 25: [0.66, 0.66], 27: [0.78, 0.8], 29: [0.8, 0.81], 31: [0.84, 0.81] }, k) }
  const seg = (ej, f) => { let c = C.nuevoConteo(ej), t = 0; for (let k = 0; k < 330; k++) { c = C.paso(c, f(k), t); t += 33 } return c.segundos }
  const reps = (ej, f, n, alto) => { let c = C.nuevoConteo(ej), t = 0, k = 0; for (let i = 0; i < 1200; i += 33) { c = C.paso(c, f(k++, 0), t); t += 33 } for (let r = 0; r < n; r++) { for (let i = 0; i <= 1600; i += 33) { c = C.paso(c, f(k++, alto * Math.sin(Math.PI * i / 1600)), t); t += 33 } for (let i = 0; i < 500; i += 33) { c = C.paso(c, f(k++, 0), t); t += 33 } } return c.reps }
  assert.equal(seg('Hollow hold', k => hollow(k, 0.013)), 10, 'hollow con las piernas casi rectas ya no se pausa')
  assert.equal(seg('Hollow hold', k => hollow(k, 0)), 0, 'acostado plano no cuenta como hollow')
  assert.equal(seg('Plancha lateral', k => lateral(k, 0)), 10)
  assert.equal(seg('Plancha lateral', k => lateral(k, 0.06)), 0, 'plancha lateral con la cadera abajo no cuenta')
  assert.equal(reps('Crunches', crunch, 10, 32), 10, 'crunches con medida propia')
  assert.equal(reps('Crunches', crunch, 10, 12), 0, 'crunch a medias no cuenta')
  assert.equal(C.patronDe('Salto de cuerda'), 'cuerda')
  const d = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, train: R.seedWeek() } })
  const meta = n => d.settings.train.week.flatMap(rt => rt ? rt.items.filter(i => i.name === n).map(i => i.target) : [])
  assert.ok(meta('Crunches').every(t => t === 30) && meta('Plancha lateral').every(t => t === 45), 'crunches a 30 y plancha lateral a 45 s')
  const mr = fs.readFileSync(path.join(__dirname, '../src/MiRutina.tsx'), 'utf8'), cam = fs.readFileSync(path.join(__dirname, '../src/CamaraReps.tsx'), 'utf8')
  assert.ok(mr.includes('paraEnMeta') && cam.includes('if (paraEnMeta) { terminar(); return }'), 'en la rutina la cámara para sola al llegar a la meta')
  ok('ejercicios del día: hollow sin pausas, plancha lateral sin cadera abajo, crunches y cuerda con medida propia, metas 30 y 45 s, la cámara para en la meta')
}

{
  const C = moduleOf('conteo')
  const P = (x, y, v = 0.85) => ({ x, y, z: 0, v })
  const R = Math.PI / 180, pol = (h, L, a) => [h[0] + L * Math.cos(a * R), h[1] - L * Math.sin(a * R)]
  const cuadro = (o, k, tau = 0) => { const h = o[23], c = Math.cos(tau * R), s = Math.sin(tau * R), img = Array.from({ length: 33 }, () => P(0.5, 0.95, 0)); for (const [i, [x, y]] of Object.entries(o)) { const dx = x - h[0], dy = y - h[1], n = (Math.sin((k * 13 + +i) * 12.9898) * 43758.5453 % 1) * 0.005; img[i] = P(h[0] + dx * c - dy * s + n, h[1] + dx * s + dy * c + n); img[+i + 1] = P(img[i].x + 0.01, img[i].y, 0.25) } return { img, mundo: img, aspecto: 1 } }
  const acostado = e => { const h = [0.5, 0.8], sh = pol(h, 0.28, 180 - e), kn = pol(h, 0.22, 80), an = pol(kn, 0.2, 80); return { 0: pol(h, 0.36, 180 - e), 11: sh, 13: [sh[0] + 0.05, sh[1] - 0.02], 15: [sh[0] + 0.1, sh[1] - 0.03], 23: h, 25: kn, 27: an } }
  const crunch = (alto, tau) => { let c = C.nuevoConteo('Abs con piernas arriba'), t = 0, k = 0; const ir = e => { c = C.paso(c, cuadro(acostado(e), k++, tau), t); t += 33 }; for (let i = 0; i < 1500; i += 33) ir(0); for (let r = 0; r < 10; r++) { for (let i = 0; i <= 1600; i += 33) ir(alto * Math.sin(Math.PI * i / 1600)); for (let i = 0; i < 500; i += 33) ir(0) } return c.reps }
  assert.equal(crunch(22, 0), 10, 'crunch con piernas arriba cuenta aunque subas poco los hombros')
  assert.equal(crunch(30, -10), 10, 'cuenta aunque el teléfono quede chueco')
  assert.equal(crunch(10, 0), 0, 'a medias no cuenta')
  assert.equal(C.patronDe('Aguante isométrico de abs'), 'barco')
  assert.ok(C.comoDe('Aguante isométrico de abs', 'barco').includes('forma una V'))
  const V = () => { const h = [0.5, 0.75], sh = pol(h, 0.28, 135), kn = pol(h, 0.22, 45); return { 0: pol(h, 0.36, 135), 11: sh, 13: [sh[0] + 0.06, sh[1] + 0.06], 15: [sh[0] + 0.14, sh[1] + 0.08], 23: h, 25: kn, 27: [kn[0] + 0.2, kn[1]] } }
  const rodillas = () => ({ 0: [0.24, 0.68], 11: [0.3, 0.72], 13: [0.3, 0.85], 15: [0.38, 0.86], 23: [0.55, 0.79], 25: [0.75, 0.85], 27: [0.88, 0.72] })
  const sentado = () => { const h = [0.5, 0.8], sh = pol(h, 0.28, 110); return { 0: pol(h, 0.36, 110), 11: sh, 13: [sh[0] + 0.05, sh[1] + 0.1], 15: [sh[0] + 0.1, sh[1] + 0.18], 23: h, 25: [0.62, 0.62], 27: [0.78, 0.82] } }
  const seg = f => { let c = C.nuevoConteo('Aguante isométrico de abs', 'seconds'), t = 0; for (let k = 0; k < 330; k++) { c = C.paso(c, cuadro(f(), k), t); t += 33 } return c }
  assert.equal(seg(V).segundos, 10, 'aguante en V cuenta')
  assert.equal(seg(rodillas).segundos, 0, 'con las rodillas en el piso no cuenta')
  const pies = seg(sentado); assert.equal(pies.segundos, 0, 'sentado con los pies en el piso no cuenta'); assert.equal(pies.aviso, 'pies')
  assert.equal(seg(() => acostado(0)).segundos, 0, 'acostado no cuenta')
  assert.ok(/GRACIA_P\[c\.patron\]/.test(fs.readFileSync(path.join(__dirname, '../src/lib/conteo.ts'), 'utf8')), 'los aguantes acostados aguantan un parpadeo de la cámara')
  ok('abs: crunch con piernas arriba cuenta por lo que suben los hombros (aunque el teléfono esté chueco), aguante isométrico de abs en V sin rodillas ni pies en el piso')
}

{
  const R = moduleOf('rutina')
  const semana = R.seedWeek()
  const todos = semana.week.flatMap(rt => rt ? rt.items.map(i => [rt, i]) : [])
  assert.ok(!todos.some(([, i]) => i.name === 'Salto de cuerda'), 'sin salto de cuerda en la rutina')
  const pistols = todos.filter(([, i]) => i.name === 'Pistol squat')
  assert.ok(pistols.length && pistols.every(([rt, i]) => R.roundsOf(rt, i) === 2 && R.setsNeeded(rt, i) === 4), 'pistol squat a 2 rondas por pierna')
  const vieja = { ...semana, week: semana.week.map(rt => rt ? { ...rt, items: [...rt.items.map(i => i.name === 'Pistol squat' ? { ...i, rounds: undefined } : i), { id: 'x', name: 'Salto de cuerda', kind: 'reps', target: 20 }] } : rt) }
  const d = R.cuerda2711(normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, train: vieja } }))
  const items = d.settings.train.week.flatMap(rt => rt ? rt.items : [])
  assert.ok(d.settings.cuerda2711 && !items.some(i => i.name === 'Salto de cuerda') && items.filter(i => i.name === 'Pistol squat').every(i => i.rounds === 2), 'tu rutina guardada se ajusta una vez')
  assert.equal(normalizeData(d).settings.cuerda2711, true)
  assert.ok(fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8').includes('cuerda2711(d)'))
  ok('rutina de Kiki: sin salto de cuerda y pistol squat a 2 rondas (también en su rutina guardada, una sola vez)')
}

{
  const R = moduleOf('rutina')
  const semana = R.seedWeek()
  assert.ok(!semana.week.some(rt => rt && rt.items.some(i => i.name === 'Subidas de talones en wall sit')), 'sin subidas de talones en wall sit')
  assert.ok(semana.week.some(rt => rt && rt.items.some(i => i.name === 'Wall sit')) && semana.week.some(rt => rt && rt.items.some(i => i.name === 'Elevaciones de talones')), 'wall sit y elevaciones de talones se quedan')
  const vieja = { ...semana, week: semana.week.map(rt => rt ? { ...rt, items: [...rt.items, { id: 'tw', name: 'Subidas de talones en wall sit', kind: 'reps', target: 15 }] } : rt) }
  const d = R.talones2711(normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, train: vieja } }))
  assert.ok(d.settings.talones2711 && !d.settings.train.week.some(rt => rt && rt.items.some(i => i.name === 'Subidas de talones en wall sit')))
  assert.equal(normalizeData(d).settings.talones2711, true)
  const mr = fs.readFileSync(path.join(__dirname, '../src/MiRutina.tsx'), 'utf8'), cam = fs.readFileSync(path.join(__dirname, '../src/CamaraReps.tsx'), 'utf8'), css = fs.readFileSync(path.join(__dirname, '../src/duo.css'), 'utf8')
  assert.ok(mr.includes('talones2711') === false && fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8').includes('talones2711(d)'))
  assert.ok(cam.includes("if (paraEnMeta) { terminar(); return }"), 'en la rutina la cámara para al llegar a la meta, también en repeticiones')
  assert.ok(mr.includes("(item.kind === 'seconds' || camara) && item.target > 0 && value >= item.target) setHecho("), 'completado al acabar el tiempo o al llegar a la meta con cámara')
  assert.ok(mr.includes('¡Completado!') && /window\.setTimeout\(\(\) => fin\.current\(\), 1900\)/.test(mr), 'la animación se cierra sola y vuelve a la rutina')
  assert.ok(/prefers-reduced-motion: reduce\) \{ \.d-hecho/.test(css))
  ok('rutina: animación ¡Completado! al acabar el tiempo o la meta con cámara (se cierra sola a los 2 s); sin subidas de talones en wall sit')
}

{
  const C = moduleOf('conteo'), R = moduleOf('rutina')
  const P = (x, y, v = 0.9) => ({ x, y, z: 0, v })
  const rr = s => (Math.sin(s * 12.9898) * 43758.5453 % 1) * 0.004
  const frente = (k, { vCadera = 0.6, pose = 'l' } = {}) => {
    const img = Array.from({ length: 33 }, () => P(0.5, 0.95, 0))
    const par = (i, x, y, v = 0.9) => { img[i] = P(0.5 - x + rr(k + i), y + rr(k + i + 40), v); img[i + 1] = P(0.5 + x + rr(k + i + 7), y + rr(k + i + 47), v) }
    img[0] = P(0.5, 0.25, 0.95); par(11, 0.08, 0.33, 0.95); par(13, 0.1, 0.45); par(15, 0.1, 0.58)
    if (pose === 'parado') { par(23, 0.05, 0.6); par(25, 0.05, 0.78); par(27, 0.05, 0.95) }
    else if (pose === 'encogido') { par(23, 0.05, 0.6, vCadera); par(25, 0.06, 0.48); par(27, 0.06, 0.6) }
    else { par(23, 0.05, 0.6, vCadera); par(25, 0.06, 0.63); par(27, 0.07, 0.68) }
    const mundo = img.map(p => ({ ...p, y: p.y + 0.3 }))
    return { img, mundo, aspecto: 1 }
  }
  const seg = f => { let c = C.nuevoConteo('L sit'), t = 0; for (let k = 0; k < 330; k++) { c = C.paso(c, f(k), t); t += 33 } return c.segundos }
  assert.equal(seg(k => frente(k, { vCadera: 0.2 })), 10, 'L sit de frente cuenta aunque las piernas tapen la cadera')
  assert.equal(seg(k => frente(k)), 10)
  assert.equal(seg(k => frente(k, { pose: 'encogido' })), 0, 'rodillas al pecho no es L sit')
  assert.equal(seg(k => frente(k, { pose: 'parado' })), 0, 'parado no cuenta')
  assert.ok(C.comoDe('L sit', 'lsit').includes('enfrente de ti'))
  assert.equal(C.patronDe('Leg raises'), 'piernas'); assert.equal(C.patronDe('Elevaciones de piernas'), 'piernas'); assert.equal(C.patronDe('Elevaciones de piernas colgado'), 'elevacion'); assert.equal(C.patronDe('Hanging leg raises'), 'elevacion')
  const piernas = (k, a) => { const h = [0.5, 0.8], an = [h[0] + 0.42 * Math.cos(a * Math.PI / 180), h[1] - 0.42 * Math.sin(a * Math.PI / 180)]; const img = Array.from({ length: 33 }, () => P(0.5, 0.95, 0)); const pon = (i, [x, y]) => { img[i] = P(x + rr(k + i), y + rr(k + i + 9)); img[i + 1] = P(x + 0.01, y, 0.25) }; img[0] = P(0.16, 0.79); pon(11, [0.22, 0.8]); pon(23, h); pon(25, [(h[0] + an[0]) / 2, (h[1] + an[1]) / 2]); pon(27, an); return { img, mundo: img, aspecto: 1 } }
  const reps = alto => { let c = C.nuevoConteo('Leg raises'), t = 0, k = 0; const ir = a => { c = C.paso(c, piernas(k++, a), t); t += 33 }; for (let i = 0; i < 1500; i += 33) ir(0); for (let r = 0; r < 10; r++) { for (let i = 0; i <= 2000; i += 33) ir(alto * Math.sin(Math.PI * i / 2000)); for (let i = 0; i < 500; i += 33) ir(0) } return c }
  assert.equal(reps(80).reps, 10, 'leg raises cuentan al subir las piernas')
  const medias = reps(35); assert.equal(medias.reps, 0, 'a medias no cuenta'); assert.equal(medias.aviso, 'mas')
  assert.equal(C.AVISOS.mas, 'Sube más. Esa no contó.')
  const semana = R.seedWeek(), todos = semana.week.flatMap(rt => rt ? rt.items : [])
  assert.ok(!todos.some(i => i.name === 'Crunches') && todos.filter(i => i.name === 'Leg raises').length === 2, 'leg raises en lugar de crunches')
  const vieja = { ...semana, week: semana.week.map(rt => rt ? { ...rt, items: rt.items.map(i => i.name === 'Leg raises' ? { ...i, name: 'Crunches', target: 30 } : i) } : rt) }
  const d = R.legs2711(normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, train: vieja } }))
  const items = d.settings.train.week.flatMap(rt => rt ? rt.items : [])
  assert.ok(d.settings.legs2711 && !items.some(i => i.name === 'Crunches') && items.filter(i => i.name === 'Leg raises').every(i => i.target === 15))
  assert.equal(normalizeData(d).settings.legs2711, true)
  assert.ok(fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8').includes('legs2711(d)'))
  ok('L sit de frente (piernas hacia la cámara, cadera tapada) y de lado mezclando los dos lados; leg raises con medida propia en lugar de crunches (tu rutina se ajusta una vez)')
}

{
  const R = moduleOf('rutina')
  const viernes = R.seedWeek().week[4].items.map(i => i.name)
  assert.deepEqual(viernes, ['Sentadillas', 'L sit', 'Desplantes', 'Leg raises', 'Pistol squat', 'Plancha lateral', 'Wall sit', 'Hollow hold', 'Elevaciones de talones', 'Abs con piernas arriba', 'Elevaciones de talón a una pierna', 'Aguante isométrico de abs', 'Puente de glúteo a una pierna'])
  const base = R.seedWeek()
  const vieja = { ...base, week: base.week.map((rt, i) => i === 4 ? { ...rt, items: [...rt.items].sort((a, b) => a.name.localeCompare(b.name)) } : rt) }
  const d = R.orden2711(normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, train: vieja } }))
  const orden = d.settings.train.week[4].items.map(i => i.name), pierna = n => /Sentadillas|Desplantes|Pistol|Wall sit|talón|talones|Puente/.test(n)
  assert.ok(orden.every((n, k) => k >= 12 || pierna(n) === (k % 2 === 0)), orden.join(', '))
  assert.equal(d.settings.train.week[1].items.length, vieja.week[1].items.length)
  assert.equal(normalizeData(d).settings.orden2711, true)
  assert.ok(fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8').includes('orden2711(d)'))
  ok('viernes alternado: pierna, abs, pierna, abs (tu rutina guardada se ajusta una vez)')
}

{
  const R = moduleOf('rutina')
  const rt = R.seedWeek().week[4]
  const hoy = '2026-11-27', t0 = Date.parse('2026-11-27T10:00:00-06:00')
  let d = normalizeData({ ...EMPTY_DATA, profile: { name: 'K', onboardingComplete: true }, settings: { ...EMPTY_DATA.settings, train: R.seedWeek() } })
  d = { ...d, sets: [...d.sets, { id: 'x0', day: hoy, at: t0 - 3 * 3600000, exercise: 'Sentadillas', reps: 20, note: 'camara' }] }
  rt.items.forEach((it, i) => { d = R.logSet(d, hoy, it, it.target || 1, t0 + i * 7 * 60000) })
  const fin = t0 + 92 * 60000, abrioHace = fin - 34 * 60000
  assert.equal(R.minutosRutina(d, hoy, rt, abrioHace, fin), 92, 'el tiempo cuenta desde tu primera serie aunque la app se haya recargado')
  assert.equal(R.minutosRutina(d, hoy, rt, t0 - 60000, fin), 93)
  const mr = fs.readFileSync(path.join(__dirname, '../src/MiRutina.tsx'), 'utf8')
  assert.ok(mr.includes('minutosRutina(data, today, rt, opened)') && mr.includes('prog.done * XP.set + XP.routine'))
  ok('rutina completa: el tiempo y el XP cuentan toda la rutina del día, no solo desde que volviste a abrirla')
}
