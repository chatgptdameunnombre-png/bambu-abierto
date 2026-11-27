import type { AppData } from './model'
import { gardenStats, shiftDay } from './jardin'
import { DAILY_GOAL, levelOf, totalXp, xpOn } from './xp'
import { routineFor, routineProgress } from './rutina'
import { saldo } from './minutos'
import type { EstadoAvisos, EstadoWidget } from './firebase'
import { esCompetir } from './modo'

export function estadoWidget(data: AppData, today: string, retos = 0): EstadoWidget {
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
    retos: Math.max(0, Math.min(99, Math.round(retos))),
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

export type EstiloWidget = 'bosque' | 'brote' | 'logo'
export const ESTILOS_WIDGET: { id: EstiloWidget; nombre: string; texto: string }[] = [
  { id: 'bosque', nombre: 'Bosque', texto: 'Verde, con Brote' },
  { id: 'brote', nombre: 'Brote', texto: 'Brote cambia de cara' },
  { id: 'logo', nombre: 'Logo', texto: 'Limpio, con el logo' },
]

const COMUN = `const VERDE = new Color("#37cb69"), ORO = new Color("#ffc800"), AZUL = new Color("#1cb0f6"), GRIS = new Color("#aab5ae"), FONDO = new Color("#0d1013"), CAJA = new Color("#1b2126"), PISTA = new Color("#262e35"), BLANCO = Color.white()
const fam = config.widgetFamily || "small"
const w = new ListWidget()
w.url = BASE
let f = {}, ok = true
try { f = (await new Request(URL).loadJSON()).fields || {} } catch (e) { ok = false }
const n = k => Number((f[k] || {}).integerValue || 0)
const s = k => (f[k] || {}).stringValue || ""
const hoy = new Date(), d = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + String(hoy.getDate()).padStart(2, "0")
const fresco = s("dia") === d
const racha = n("racha"), nivel = n("nivel"), meta = n("meta") || 50, retos = n("retos")
const xp = fresco ? n("xpHoy") : 0, minutos = fresco ? n("minutos") : 0
const rutina = !ok ? "Sin señal" : fresco ? s("rutina") : "Abre bambú"
const animo = !ok || !fresco || xp === 0 ? "sueno" : xp >= meta ? "orgulloso" : "animo"
const frase = retos > 0 ? "⚔️ " + (retos === 1 ? "Tienes un reto" : "Tienes " + retos + " retos") : animo === "sueno" ? "Brote te espera" : animo === "orgulloso" ? "¡Meta cumplida!" : "Te faltan " + Math.max(0, meta - xp) + " XP"
const imagen = async nombre => { try { return await new Request(BASE + nombre).loadImage() } catch (e) { return null } }
const texto = (st, t, tam, color, peso) => { const x = st.addText(t); x.font = peso === "n" ? Font.semiboldRoundedSystemFont(tam) : Font.heavyRoundedSystemFont(tam); x.textColor = color; x.lineLimit = 1; x.minimumScaleFactor = 0.6; return x }
const fila = st => { const r = st.addStack(); r.layoutHorizontally(); r.centerAlignContent(); return r }
const columna = st => { const c = st.addStack(); c.layoutVertically(); return c }
const linea = (st, t, tam, color, peso, derecha) => { const r = fila(st); if (derecha) r.addSpacer(); const x = texto(r, t, tam, color, peso); if (!derecha) r.addSpacer(); return x }
const barra = (st, ancho, alto, pct, color, pista) => {
  const c = new DrawContext(); c.size = new Size(ancho, alto); c.opaque = false; c.respectScreenScale = true
  const a = new Path(); a.addRoundedRect(new Rect(0, 0, ancho, alto), alto / 2, alto / 2); c.addPath(a); c.setFillColor(pista || PISTA); c.fillPath()
  if (pct > 0) { const b = new Path(); b.addRoundedRect(new Rect(0, 0, Math.max(alto, ancho * Math.min(1, pct)), alto), alto / 2, alto / 2); c.addPath(b); c.setFillColor(color); c.fillPath() }
  const i = st.addImage(c.getImage()); i.imageSize = new Size(ancho, alto); return i
}
const filaBarra = (st, ancho, alto, color, pista) => { const r = fila(st); barra(r, ancho, alto, xp / meta, color, pista); r.addSpacer(); return r }
const foto = (st, img, tam) => { if (!img) return null; const i = st.addImage(img); i.imageSize = new Size(tam, tam); return i }
const dato = (st, valor, etiqueta, color, fondo) => { const c = columna(st); c.backgroundColor = fondo || CAJA; c.cornerRadius = 12; c.setPadding(6, 8, 6, 8); linea(c, valor, 17, color); linea(c, etiqueta, 10, GRIS, "n"); return c }
const bloqueo = () => {
  if (fam.indexOf("accessory") === 0) w.backgroundColor = Color.clear()
  if (fam === "accessoryInline") { texto(w, "⏱ " + minutos + " min · 🔥 " + racha + (retos > 0 ? " · ⚔️ " + retos : ""), 14, BLANCO); return true }
  if (fam === "accessoryCircular") { const c = columna(w); linea(c, "⏱", 13, BLANCO); linea(c, String(minutos), 20, BLANCO); linea(c, "min", 10, BLANCO, "n"); return true }
  if (fam === "accessoryRectangular") { linea(w, "⏱ " + minutos + " min de redes", 15, BLANCO); linea(w, "🔥 " + racha + " · ⚡ " + xp + "/" + meta + " XP", 13, BLANCO, "n"); linea(w, retos > 0 ? "⚔️ " + retos + (retos === 1 ? " reto" : " retos") + " por jugar" : rutina, 13, BLANCO, "n"); return true }
  return false
}`

const ESTILOS: Record<EstiloWidget, string> = {
  bosque: `if (!bloqueo()) {
const g = new LinearGradient(); g.colors = [new Color("#3fd673"), new Color("#178a42")]; g.locations = [0, 1]; g.startPoint = new Point(0, 0); g.endPoint = new Point(1, 1); w.backgroundGradient = g
const brote = await imagen("widget/brote-" + animo + ".png")
const osc = new Color("#0c2e16", 0.35)
const chip = (st, t) => { const c = fila(st); c.backgroundColor = osc; c.cornerRadius = 9; c.setPadding(2, 7, 2, 7); texto(c, t, 12, BLANCO); return c }
if (fam === "small") {
  w.setPadding(12, 12, 8, 8)
  const top = fila(w); texto(top, "bambú", 13, BLANCO); top.addSpacer(); if (retos > 0) chip(top, "⚔️ " + retos)
  const centro = fila(w); centro.bottomAlignContent()
  const iz = columna(centro); linea(iz, String(racha), 40, BLANCO); linea(iz, "días 🔥", 11, BLANCO, "n")
  centro.addSpacer(); foto(centro, brote, 64)
  w.addSpacer()
  linea(w, "⏱ " + minutos + " min de redes", 13, BLANCO)
  w.addSpacer(3)
  filaBarra(w, 136, 7, ORO, osc)
  w.addSpacer(2)
  linea(w, xp + "/" + meta + " XP", 10, BLANCO, "n")
} else {
  w.setPadding(14, 16, 6, 10)
  if (fam === "large") w.addSpacer()
  const todo = fila(w); todo.bottomAlignContent()
  const iz = columna(todo)
  linea(iz, "bambú · Nivel " + nivel, 13, BLANCO)
  iz.addSpacer(6)
  linea(iz, frase, 19, BLANCO)
  iz.addSpacer(8)
  const datos = fila(iz); dato(datos, "🔥 " + racha, "racha", BLANCO, osc); datos.addSpacer(6); dato(datos, "⏱ " + minutos, "min de redes", BLANCO, osc); datos.addSpacer()
  iz.addSpacer(8)
  filaBarra(iz, 180, 8, ORO, osc)
  iz.addSpacer(4)
  linea(iz, xp + "/" + meta + " XP · " + rutina, 11, BLANCO, "n")
  iz.addSpacer(8)
  todo.addSpacer()
  foto(todo, brote, fam === "medium" ? 120 : 140)
  if (fam === "large") { w.addSpacer(); linea(w, "⏱ " + minutos + " min de redes hoy", 22, BLANCO); w.addSpacer(4); linea(w, retos > 0 ? "⚔️ " + retos + (retos === 1 ? " reto por jugar" : " retos por jugar") : rutina, 14, BLANCO, "n"); w.addSpacer() }
}
}`,
  brote: `if (!bloqueo()) {
w.backgroundColor = FONDO
const brote = await imagen("widget/brote-" + animo + ".png")
if (fam === "small") {
  w.setPadding(12, 12, 10, 12)
  const arriba = fila(w); arriba.topAlignContent()
  const iz = columna(arriba); linea(iz, "🔥 " + racha, 30, BLANCO); linea(iz, racha === 1 ? "día" : "días", 11, GRIS, "n")
  arriba.addSpacer(); foto(arriba, brote, 62)
  w.addSpacer()
  linea(w, frase, 12, retos > 0 ? ORO : animo === "orgulloso" ? VERDE : ORO)
  w.addSpacer(4)
  filaBarra(w, 134, 8, xp >= meta ? VERDE : ORO)
  w.addSpacer(4)
  const pie = fila(w); texto(pie, "⏱ " + minutos + " min", 12, AZUL); pie.addSpacer(); texto(pie, "Nv " + nivel, 11, GRIS)
} else {
  w.setPadding(14, 14, 14, 16)
  if (fam === "large") w.addSpacer()
  const todo = fila(w)
  foto(todo, brote, 118)
  todo.addSpacer(12)
  const der = columna(todo)
  linea(der, frase, 17, retos > 0 ? ORO : animo === "orgulloso" ? VERDE : BLANCO)
  der.addSpacer(8)
  const datos = fila(der); dato(datos, "🔥 " + racha, "racha", BLANCO); datos.addSpacer(6); dato(datos, String(minutos), "min redes", AZUL); datos.addSpacer(6); dato(datos, "Nv " + nivel, "nivel", ORO)
  der.addSpacer(10)
  filaBarra(der, 186, 8, xp >= meta ? VERDE : ORO)
  der.addSpacer(4)
  linea(der, xp + " / " + meta + " XP · " + rutina, 11, GRIS, "n")
  if (fam === "large") { w.addSpacer(); linea(w, "⏱ " + minutos + " min de redes hoy", 22, AZUL); w.addSpacer(4); linea(w, retos > 0 ? "⚔️ " + retos + (retos === 1 ? " reto por jugar" : " retos por jugar") : "Nivel " + nivel + " · " + racha + " días de racha", 14, GRIS, "n"); w.addSpacer() }
}
}`,
  logo: `if (!bloqueo()) {
w.backgroundColor = FONDO
const icono = await imagen("icon-192.png"), nombre = await imagen("logo-nombre.png")
const marca = (st, alto) => { const r = fila(st); const i = foto(r, icono, alto); if (i) i.cornerRadius = alto * 0.22; r.addSpacer(6); if (nombre) { const x = r.addImage(nombre); x.imageSize = new Size(alto * 2.15, alto * 0.62) } r.addSpacer(); return r }
if (fam === "small") {
  w.setPadding(12, 12, 12, 12)
  const top = marca(w, 22); if (retos > 0) texto(top, "⚔️ " + retos, 12, ORO)
  w.addSpacer()
  linea(w, String(racha), 44, BLANCO)
  linea(w, "días de racha 🔥", 11, GRIS, "n")
  w.addSpacer()
  filaBarra(w, 134, 6, VERDE)
  w.addSpacer(4)
  const pie = fila(w); texto(pie, xp + "/" + meta + " XP", 11, VERDE); pie.addSpacer(); texto(pie, "⏱ " + minutos + " min", 11, AZUL)
} else {
  w.setPadding(14, 16, 14, 16)
  const top = marca(w, 24); texto(top, retos > 0 ? "⚔️ " + retos + (retos === 1 ? " reto" : " retos") : "Nivel " + nivel, 12, retos > 0 ? ORO : GRIS, "n")
  w.addSpacer()
  const datos = fila(w)
  const tile = (valor, et, color) => { const c = columna(datos); c.backgroundColor = CAJA; c.cornerRadius = 14; c.setPadding(8, 10, 8, 10); linea(c, valor, 24, color); linea(c, et, 10, GRIS, "n"); return c }
  tile(String(racha), "días de racha", BLANCO); datos.addSpacer(8); tile(String(minutos), "min de redes", AZUL); datos.addSpacer(8); tile(xp + "/" + meta, "XP de hoy", VERDE)
  w.addSpacer()
  const pie = fila(w); texto(pie, rutina, 12, GRIS, "n"); pie.addSpacer(); barra(pie, 120, 6, xp / meta, VERDE)
}
}`,
}

export function scriptWidget(url: string, estilo: EstiloWidget = 'bosque'): string {
  return `const URL = "${url}", BASE = "https://tuagentedeia.com/bambu/"
${COMUN}
${ESTILOS[estilo]}
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)
Script.setWidget(w)
if (config.runsInApp) await (fam === "small" ? w.presentSmall() : w.presentMedium())
Script.complete()
`
}
