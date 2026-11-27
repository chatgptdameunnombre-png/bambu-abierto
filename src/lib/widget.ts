import type { AppData } from './model'
import { gardenStats, shiftDay } from './jardin'
import { DAILY_GOAL, levelOf, totalXp, xpOn } from './xp'
import { routineFor, routineProgress } from './rutina'
import { saldo } from './minutos'
import type { EstadoAvisos, EstadoWidget } from './firebase'
import { esCompetir } from './modo'

export function estadoWidget(data: AppData, today: string): EstadoWidget {
  const rt = routineFor(data, today)
  const p = rt ? routineProgress(data, today, rt) : null
  return {
    dia: today,
    racha: gardenStats(data, today).current,
    nivel: levelOf(totalXp(data, today)).level,
    xpHoy: xpOn(data, today),
    meta: DAILY_GOAL,
    minutos: saldo(data, today),
    rutina: p ? (p.done >= p.total ? 'Rutina lista' : `Rutina ${p.done}/${p.total}`) : 'Descanso',
  }
}

export function ultimoActivo(data: AppData, today: string, dias = 45): string {
  for (let i = 0; i <= dias; i++) {
    const d = shiftDay(today, -i)
    if (data.sets.some(s => s.day === d) || xpOn(data, d) > 0) return d
  }
  return ''
}

export function estadoParaAvisos(data: AppData, today: string): EstadoAvisos {
  return { ultimo: ultimoActivo(data, today), hecho: xpOn(data, today) >= DAILY_GOAL, racha: esCompetir(data.settings) ? 0 : gardenStats(data, today).current }
}

export function scriptWidget(url: string): string {
  return `const URL = "${url}"
const VERDE = new Color("#37cb69"), ORO = new Color("#ffc800"), AZUL = new Color("#1cb0f6"), GRIS = new Color("#aab5ae"), FONDO = new Color("#0d1013"), PISTA = new Color("#262e35"), BLANCO = Color.white()
const fam = config.widgetFamily || "small"
const w = new ListWidget()
w.backgroundColor = FONDO
w.url = "https://tuagentedeia.com/bambu/"
let f = {}, ok = true
try { f = (await new Request(URL).loadJSON()).fields || {} } catch (e) { ok = false }
const n = k => Number((f[k] || {}).integerValue || 0)
const s = k => (f[k] || {}).stringValue || ""
const hoy = new Date(), d = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + String(hoy.getDate()).padStart(2, "0")
const fresco = s("dia") === d
const racha = n("racha"), nivel = n("nivel"), meta = n("meta") || 50
const xp = fresco ? n("xpHoy") : 0, minutos = fresco ? n("minutos") : 0
const rutina = !ok ? "Sin señal" : fresco ? s("rutina") : "Abre bambú para empezar"
const texto = (st, t, tam, color, peso) => { const x = st.addText(t); x.font = peso === "n" ? Font.semiboldRoundedSystemFont(tam) : Font.heavyRoundedSystemFont(tam); x.textColor = color; x.lineLimit = 1; x.minimumScaleFactor = 0.6; return x }
const barra = (st, ancho, alto, pct, color) => {
  const c = new DrawContext(); c.size = new Size(ancho, alto); c.opaque = false; c.respectScreenScale = true
  const a = new Path(); a.addRoundedRect(new Rect(0, 0, ancho, alto), alto / 2, alto / 2); c.addPath(a); c.setFillColor(PISTA); c.fillPath()
  if (pct > 0) { const b = new Path(); b.addRoundedRect(new Rect(0, 0, Math.max(alto, ancho * Math.min(1, pct)), alto), alto / 2, alto / 2); c.addPath(b); c.setFillColor(color); c.fillPath() }
  const i = st.addImage(c.getImage()); i.imageSize = new Size(ancho, alto); return i
}
const fila = st => { const r = st.addStack(); r.layoutHorizontally(); r.centerAlignContent(); return r }
const linea = (st, t, tam, color, peso, derecha) => { const r = fila(st); if (derecha) r.addSpacer(); const x = texto(r, t, tam, color, peso); if (!derecha) r.addSpacer(); return x }
const columna = st => { const c = st.addStack(); c.layoutVertically(); return c }
const dias = racha === 1 ? "día de racha" : "días de racha"

if (fam === "accessoryInline") {
  texto(w, "🔥 " + racha + "  ⏱ " + minutos + " min", 14, BLANCO)
} else if (fam === "accessoryCircular") {
  w.backgroundColor = Color.clear()
  const c = columna(w); c.centerAlignContent()
  texto(c, "🔥", 14, BLANCO).centerAlignText(); texto(c, String(racha), 20, BLANCO).centerAlignText()
} else if (fam === "accessoryRectangular") {
  w.backgroundColor = Color.clear()
  linea(w, "🔥 " + racha + " · ⚡ " + xp + "/" + meta, 15, BLANCO)
  linea(w, "⏱ " + minutos + " min de redes", 13, BLANCO, "n")
  linea(w, rutina, 13, BLANCO, "n")
} else if (fam === "small") {
  w.setPadding(14, 14, 14, 14)
  const top = fila(w); texto(top, "bambú", 13, VERDE); top.addSpacer(); texto(top, "Nv " + nivel, 12, ORO)
  w.addSpacer(4)
  linea(w, "🔥 " + racha, 36, BLANCO)
  linea(w, dias, 11, GRIS, "n")
  w.addSpacer()
  const bf = fila(w); barra(bf, 130, 8, xp / meta, xp >= meta ? VERDE : ORO); bf.addSpacer()
  w.addSpacer(3)
  const xpF = fila(w); texto(xpF, "⚡ " + xp + "/" + meta + " XP", 12, ORO); xpF.addSpacer()
  w.addSpacer(2)
  const r = fila(w); texto(r, "⏱ " + minutos + " min", 12, AZUL); r.addSpacer()
} else {
  w.setPadding(16, 16, 16, 16)
  const top = fila(w); texto(top, "bambú", 15, VERDE); top.addSpacer(); texto(top, "Nivel " + nivel, 13, ORO)
  w.addSpacer(6)
  const cuerpo = fila(w); cuerpo.topAlignContent()
  const izq = columna(cuerpo)
  linea(izq, "🔥 " + racha, fam === "medium" ? 38 : 46, BLANCO)
  linea(izq, dias, 12, GRIS, "n")
  cuerpo.addSpacer()
  const der = columna(cuerpo)
  linea(der, String(minutos), fam === "medium" ? 38 : 46, AZUL, "", true)
  linea(der, "min de redes", 12, GRIS, "n", true)
  w.addSpacer()
  const bf = fila(w); barra(bf, 300, 10, xp / meta, xp >= meta ? VERDE : ORO); bf.addSpacer()
  w.addSpacer(5)
  const pie = fila(w); texto(pie, "⚡ " + xp + " / " + meta + " XP hoy", 13, ORO); pie.addSpacer(); texto(pie, rutina, 13, GRIS, "n")
}
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)
Script.setWidget(w)
if (config.runsInApp) await (fam === "medium" ? w.presentMedium() : w.presentSmall())
Script.complete()
`
}
