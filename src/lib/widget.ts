import type { AppData } from './model'
import { gardenStats } from './jardin'
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

export function estadoParaAvisos(data: AppData, today: string): EstadoAvisos {
  const activo = data.sets.some(s => s.day === today) || xpOn(data, today) > 0
  return { ultimo: activo ? today : '', hecho: xpOn(data, today) >= DAILY_GOAL, racha: esCompetir(data.settings) ? 0 : gardenStats(data, today).current }
}

export function scriptWidget(url: string): string {
  return `const URL = "${url}"
const VERDE = new Color("#58cc02"), ORO = new Color("#ffc800"), AZUL = new Color("#1cb0f6"), GRIS = new Color("#aab5ae")
const w = new ListWidget()
w.backgroundColor = new Color("#0d1013")
w.url = "https://tuagentedeia.com/bambu/"
let f = {}
try { f = (await new Request(URL).loadJSON()).fields || {} } catch (e) {}
const n = k => Number((f[k] || {}).integerValue || 0)
const s = k => (f[k] || {}).stringValue || ""
const hoy = new Date(), d = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + String(hoy.getDate()).padStart(2, "0")
const fresco = s("dia") === d
const linea = (texto, color, tam) => { const t = w.addText(texto); t.textColor = color; t.font = Font.heavySystemFont(tam); t.minimumScaleFactor = 0.6 }
linea("bambú", VERDE, 14)
w.addSpacer(4)
linea("🔥 " + n("racha") + (n("racha") === 1 ? " día" : " días"), Color.white(), 22)
linea("⚡ " + (fresco ? n("xpHoy") : 0) + " / " + n("meta") + " XP", ORO, 15)
linea("⏱ " + (fresco ? n("minutos") : 0) + " min de redes", AZUL, 13)
linea(fresco ? s("rutina") : "Abre Bambú para empezar", GRIS, 12)
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)
Script.setWidget(w)
if (config.runsInApp) await w.presentSmall()
Script.complete()
`
}
