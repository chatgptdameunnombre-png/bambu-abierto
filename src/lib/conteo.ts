export type Punto = { x: number; y: number; z: number; v: number }
export type Cuadro = { img: Punto[]; mundo: Punto[]; aspecto?: number }
export type Patron = 'empuje' | 'fondo' | 'sentadilla' | 'talones' | 'puente' | 'crunch' | 'piernas' | 'cuerda' | 'dominada' | 'pike' | 'hspu' | 'remo' | 'elevacion' | 'saltos' | 'burpee' | 'generico'
  | 'plancha' | 'lateral' | 'wallsit' | 'colgado' | 'lsit' | 'parado' | 'hollow' | 'barco' | 'planche' | 'lever' | 'bandera' | 'quieto'
export type Aviso = 'acomodate' | 'posicion' | 'baja' | 'mas' | 'recto' | 'rapido' | 'sube' | 'extiende' | 'cadera' | 'alta' | 'rodillas' | 'pies'
type Repeticion = 'empuje' | 'fondo' | 'sentadilla' | 'talones' | 'puente' | 'crunch' | 'piernas' | 'cuerda' | 'dominada' | 'pike' | 'hspu' | 'remo' | 'elevacion' | 'saltos' | 'burpee'
export type Tipo = 'reps' | 'seconds' | 'free'
export type Opciones = { inclinado?: boolean; rodillas?: boolean; doblado?: boolean; estirados?: boolean; tuck?: boolean; salto?: boolean }
export type Base = { pie: number; mano: number; largo: number }

const CARDIO = /^(correr|caminar|trotar|nadar|bici|cardio|f[uú]tbol)/i
const AGUANTE_RE = /aguante|isom[eé]tric|\bhold\b|sost[eé]n|est[aá]tic/i
const FAMILIAS: [RegExp, Patron][] = [
  [/planche lean/i, 'plancha'],
  [/planche(?!.*push)|cuervo|\bcrow\b|frog stand|\brana\b|\branita\b/i, 'planche'],
  [/lever/i, 'lever'],
  [/bandera|human flag/i, 'bandera'],
  [/tal[oó]n|calf raises?|pantorrilla/i, 'talones'],
  [/crunch|abs con piernas|encogimiento/i, 'crunch'],
  [/cuerda|jump rope/i, 'cuerda'],
  [/aguante (isom[eé]trico )?de abs|aguante en v\b|\bbarco\b|boat (hold|pose)/i, 'barco'],
  [/plancha lateral|side plank/i, 'lateral'],
  [/^(plancha|plank)/i, 'plancha'],
  [/wall sit|silla en (la )?pared/i, 'wallsit'],
  [/elevaci[oó]n(es)? de piernas colgad|hanging leg|toes to bar|knees to (elbows?|chest)|rodillas al pecho colgad/i, 'elevacion'],
  [/\blegs? raises?\b|elevaci[oó]n(es)? de piernas|levantamiento de piernas/i, 'piernas'],
  [/colgar|colgad|dead hang/i, 'colgado'],
  [/\bl[- ]?sit\b|\bv[- ]?sit\b/i, 'lsit'],
  [/hollow( body)? hold/i, 'hollow'],
  [/handstand push|\bhspu\b|lagartijas de cabeza/i, 'hspu'],
  [/handstand(?!.*toque)|parado de (cabeza|manos)|\bvertical\b|\bpino\b/i, 'parado'],
  [/pike/i, 'pike'],
  [/burpee/i, 'burpee'],
  [/\bfondos?\b|\bdips?\b/i, 'fondo'],
  [/lagartija|push ?ups?|flexi[oó]n(es)? de pecho/i, 'empuje'],
  [/dominadas? australianas?|australian|\bremo\b|\brows?\b|inverted row/i, 'remo'],
  [/dominada|pull ?ups?|chin ?ups?|muscle ?ups?|jal[oó]n/i, 'dominada'],
  [/puente|hip thrust|glute bridge/i, 'puente'],
  [/^(?!.*tal[oó]n).*(sentadilla|squat|desplante|zancada|lunge|pistol|step ?ups?)/i, 'sentadilla'],
  [/jumping jacks?|saltos de (estrella|tijera)/i, 'saltos'],
]
const AGUANTE: Patron[] = ['plancha', 'lateral', 'wallsit', 'colgado', 'lsit', 'parado', 'hollow', 'barco', 'planche', 'lever', 'bandera', 'quieto']
export const esAguante = (p: Patron) => AGUANTE.includes(p)
export function patronDe(name: string, kind?: Tipo): Patron | null {
  const n = name.trim()
  if (!n || kind === 'free' || CARDIO.test(n)) return null
  const f = FAMILIAS.find(([re]) => re.test(n))?.[1]
  const sostener = kind ? kind === 'seconds' : f ? esAguante(f) : AGUANTE_RE.test(n)
  if (f && esAguante(f) === sostener) return f
  return sostener ? 'quieto' : 'generico'
}
export const esCamara = (name: string, kind?: Tipo) => patronDe(name, kind) !== null
export const tipoDe = (name: string, kind?: Tipo): 'reps' | 'seconds' => esAguante(patronDe(name, kind) ?? 'generico') ? 'seconds' : 'reps'
export const esGeneral = (name: string, kind?: Tipo) => { const p = patronDe(name, kind); return p === 'generico' || p === 'quieto' }
export function opcionesDe(name: string): Opciones {
  return { inclinado: /inclinad|declinad|en (la )?pared|elevad/i.test(name), rodillas: /rodillas|de rodilla/i.test(name), doblado: /cuervo|\bcrow\b|frog|\brana\b|\branita\b/i.test(name), estirados: /brazos (estirados|rectos)|plancha alta|high plank/i.test(name), tuck: /\btuck\b|agrupad/i.test(name), salto: /salto|jump/i.test(name) }
}

const FRENTE = 'Recarga el teléfono en la pared o en una botella, frente a ti, a unos 2 metros.'
const DE_LADO = 'Pon el teléfono de lado, a unos 2 metros.'
export const COMO: Record<Patron, string> = {
  empuje: 'Pon el teléfono en el piso frente a tu cabeza, a 1 metro, o de lado a 2 metros. De frente basta con que se vean tu cabeza, hombros y manos.',
  fondo: `${FRENTE} Que se te vean hombros, codos y manos.`,
  sentadilla: `${FRENTE} Que se te vea todo el cuerpo, de los hombros a los pies. De frente cuenta cuánto baja tu cadera.`,
  talones: `${FRENTE} Que se te vea de los hombros a los pies. Sube en puntas, aguanta un instante y baja completo.`,
  crunch: `${DE_LADO} Boca arriba con las rodillas dobladas: cuenta cuando despegas los hombros del piso y vuelves a bajar.`,
  piernas: `${DE_LADO} Boca arriba con las piernas estiradas: cuenta cuando las subes hasta arriba y las vuelves a bajar.`,
  cuerda: `${FRENTE} Que se te vea de los hombros a los pies. Cuenta cada salto.`,
  puente: 'Pon el teléfono de lado, a unos 2 metros y a la altura del piso. Boca arriba con las rodillas dobladas: cuenta cuando subes la cadera hasta quedar en línea con hombros y rodillas, y vuelves a bajar.',
  dominada: 'Pon el teléfono abajo mirando hacia la barra, a unos 2 metros. Que se te vean las manos y la cabeza.',
  pike: `${DE_LADO} Cuenta con la cadera arriba y la cabeza bajando entre las manos.`,
  hspu: `${DE_LADO} Cuenta cuando bajas de cabeza y vuelves a estirar los brazos.`,
  remo: `${DE_LADO} Cuerpo recto debajo de la barra; cuenta cuando subes el pecho y vuelves a estirar.`,
  elevacion: 'Teléfono abajo mirando hacia la barra, a unos 2 metros. Cuenta cuando subes las piernas y vuelves abajo.',
  saltos: `${FRENTE} De frente, con brazos y piernas a cuadro.`,
  burpee: `${DE_LADO} O en diagonal, que se te vea de la cabeza a los pies.`,
  plancha: 'De lado a unos 2 metros, o en el piso frente a tu cabeza a 1 metro. Apoyado en los codos, con el cuerpo recto y las rodillas despegadas.',
  lateral: `${FRENTE} Solo cuenta mientras tu cuerpo esté recto, de la cabeza a los pies.`,
  wallsit: `${DE_LADO} Solo cuenta con los muslos paralelos al piso y la espalda en la pared.`,
  colgado: 'Teléfono abajo mirando hacia la barra. Cuenta mientras estés colgado con los brazos estirados.',
  lsit: 'Pon el teléfono a unos 2 metros, de lado o enfrente de ti, a la altura del piso. Cuenta mientras tus piernas estén estiradas al frente.',
  parado: `${DE_LADO} Cuenta mientras estés de cabeza con el cuerpo recto.`,
  hollow: `${DE_LADO} Boca arriba, hombros y piernas despegados del piso.`,
  barco: `${DE_LADO} Sentado, echa el torso hacia atrás y despega los pies del piso: tu cuerpo forma una V. Puedes doblar las rodillas. El tiempo corre mientras torso y pies estén arriba.`,
  planche: `${DE_LADO} Cuenta mientras tus pies estén despegados del piso, el cuerpo horizontal y los brazos estirados.`,
  lever: 'Pon el teléfono de lado a la barra, a unos 3 metros. Cuenta mientras estés colgado con el cuerpo horizontal y los brazos estirados.',
  bandera: 'Pon el teléfono frente a ti y al poste, a unos 3 metros. Cuenta mientras tu cuerpo esté horizontal, recto y sin tocar el piso.',
  generico: 'Ponte a unos 2 metros, de lado o de frente, que se te vea todo el cuerpo. La cámara aprende tu movimiento en la primera repetición y cuenta cada vez que regresas al inicio. Recorrido completo o no cuenta.',
  quieto: 'Ponte a unos 2 metros, que se te vea todo el cuerpo. El tiempo corre mientras estés completo en cámara y sin moverte.',
}

type Ej = { name: string; kind: 'reps' | 'seconds' }
const R = (...n: string[]): Ej[] => n.map(name => ({ name, kind: 'reps' }))
const S = (...n: string[]): Ej[] => n.map(name => ({ name, kind: 'seconds' }))
export const CAMARA_GRUPOS: { grupo: string; ejercicios: Ej[] }[] = [
  { grupo: 'Lagartijas y empuje', ejercicios: R('Lagartijas', 'Lagartijas diamante', 'Lagartijas abiertas', 'Lagartijas arqueras', 'Lagartijas declinadas', 'Lagartijas inclinadas', 'Lagartijas en rodillas', 'Lagartijas explosivas', 'Lagartijas a una mano', 'Pseudo planche push ups', 'Pike push ups', 'Handstand push up con pared', 'Fondos', 'Fondos en banco') },
  { grupo: 'Dominadas y jalón', ejercicios: R('Dominadas', 'Chin ups', 'Dominadas abiertas', 'Dominadas arqueras', 'Dominadas australianas', 'Muscle up', 'Curl de toalla superior', 'Curl de toalla inferior') },
  { grupo: 'Piernas', ejercicios: R('Sentadillas', 'Sentadilla sumo', 'Sentadilla con salto', 'Sentadilla búlgara', 'Desplantes', 'Pistol squat', 'Shrimp squat', 'Puente de glúteo', 'Elevaciones de talones') },
  { grupo: 'Abdomen', ejercicios: R('Crunches', 'Leg raises', 'Abs con piernas arriba', 'V-ups', 'Elevaciones de piernas colgado', 'Toes to bar', 'Mountain climbers', 'Russian twist') },
  { grupo: 'Cuerpo completo', ejercicios: R('Burpees', 'Jumping jacks') },
  { grupo: 'Aguantes', ejercicios: S('Plancha', 'Plancha con brazos estirados', 'Plancha lateral', 'Wall sit', 'Hollow hold', 'L sit', 'Colgarse de la barra') },
  { grupo: 'Skills', ejercicios: S('Tuck planche', 'Planche', 'Cuervo', 'Front lever tuck', 'Front lever', 'Back lever tuck', 'Back lever', 'Handstand contra pared', 'Handstand libre', 'Bandera humana') },
]
export const CAMARA: Ej[] = CAMARA_GRUPOS.flatMap(g => g.ejercicios)
export function comoDe(ej: string, p: Patron): string {
  if (p === 'crunch' && /piernas arriba/i.test(ej)) return `${DE_LADO} Boca arriba con las piernas arriba y quietas: cuenta cuando despegas los hombros del piso y vuelves a bajar.`
  if (p === 'plancha' && opcionesDe(ej).estirados) return 'De lado a unos 2 metros, o en el piso frente a tu cabeza a 1 metro. Brazos estirados con las manos abajo de los hombros, cuerpo recto y rodillas despegadas.'
  return COMO[p]
}
export const CAMARA_BASICOS: Ej[] = CAMARA.filter(e => ['Lagartijas', 'Sentadillas', 'Fondos', 'Dominadas', 'Burpees', 'Jumping jacks', 'Plancha', 'Plancha lateral', 'Wall sit'].includes(e.name))

export const AVISOS: Record<Aviso, string> = {
  acomodate: 'No te veo completo. Aléjate un poco.',
  posicion: 'Ponte en posición.',
  baja: 'Baja hasta abajo. Esa no contó.',
  mas: 'Sube más. Esa no contó.',
  recto: 'Cuerpo recto. Esa no contó.',
  rapido: 'Más controlado. Esa no contó.',
  sube: 'La barbilla arriba de las manos. Esa no contó.',
  extiende: 'Estira los brazos hasta abajo. Esa no contó.',
  cadera: 'Sube la cadera. Esa no contó.',
  alta: 'Baja la cadera. Esa no contó.',
  rodillas: 'Despega las rodillas del piso. Esa no contó.',
  pies: 'Despega los pies del piso. Esa no contó.',
}
export const AVISOS_AGUANTE: Partial<Record<Aviso, string>> = {
  posicion: 'Ponte en posición. El tiempo está en pausa.',
  recto: 'Cuerpo recto. El tiempo está en pausa.',
  cadera: 'Sube la cadera. El tiempo está en pausa.',
  alta: 'Baja la cadera. El tiempo está en pausa.',
  rodillas: 'Despega las rodillas del piso. El tiempo está en pausa.',
  pies: 'Despega los pies del piso. El tiempo está en pausa.',
  extiende: 'Estira los brazos. El tiempo está en pausa.',
}

const N = { nariz: 0, hombro: [11, 12], codo: [13, 14], muneca: [15, 16], cadera: [23, 24], rodilla: [25, 26], tobillo: [27, 28] } as const
type Par = readonly [number, number]
type Rango = { arriba: number; abajo: number; min: number }
const RANGO: Record<Repeticion, Rango> = {
  empuje: { arriba: 150, abajo: 100, min: 450 },
  fondo: { arriba: 150, abajo: 100, min: 450 },
  sentadilla: { arriba: 160, abajo: 100, min: 600 },
  talones: { arriba: 160, abajo: 100, min: 500 },
  puente: { arriba: 160, abajo: 100, min: 700 },
  crunch: { arriba: 160, abajo: 100, min: 600 },
  piernas: { arriba: 160, abajo: 100, min: 700 },
  cuerda: { arriba: 160, abajo: 100, min: 280 },
  dominada: { arriba: 155, abajo: 90, min: 500 },
  pike: { arriba: 150, abajo: 100, min: 450 },
  hspu: { arriba: 150, abajo: 100, min: 600 },
  remo: { arriba: 150, abajo: 95, min: 450 },
  elevacion: { arriba: 155, abajo: 100, min: 600 },
  saltos: { arriba: 140, abajo: 60, min: 300 },
  burpee: { arriba: 150, abajo: 60, min: 1000 },
}
const BAJO = 0.3
const NORMAL = 0.4
const NUEVO = 0.65
const GRACIA = 700
const CAIDA = 0.55
const CAIDA_H = 0.65
const VENTANA = 3500
const CAIDA_P: Partial<Record<Patron, [number, number, number]>> = { sentadilla: [0.15, 0.7, 8000], talones: [0.04, 0.14, 8000], cuerda: [0.04, 0.12, 4000], crunch: [0.06, 0.17, 8000], piernas: [0.1, 0.55, 8000] }
const GRACIA_P: Partial<Record<Patron, number>> = { hollow: 1200, barco: 1200, lsit: 1200 }
const VENTANA_G = 8000
const QUIETO = 0.15
const CANALES: [number, number, number][] = [[11, 13, 15], [12, 14, 16], [23, 25, 27], [24, 26, 28], [11, 23, 25], [12, 24, 26], [23, 11, 13], [24, 12, 14], [25, 27, 31], [26, 28, 32]]
const UMBRAL_G = [45, 45, 45, 45, 28, 28, 45, 45, 22, 22, 45, 45]
const PUNTOS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]

export function angulo(a: Punto, b: Punto, c: Punto): number {
  const u = [a.x - b.x, a.y - b.y, a.z - b.z], w = [c.x - b.x, c.y - b.y, c.z - b.z]
  const nu = Math.hypot(u[0], u[1], u[2]), nw = Math.hypot(w[0], w[1], w[2])
  if (!nu || !nw) return 180
  const cos = (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / (nu * nw)
  return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI
}

function inclinacion(a: Punto, b: Punto): number {
  const len = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
  return len ? Math.abs(a.y - b.y) / len : 0
}

export type Medida = { visto: boolean; postura: boolean; recto: boolean; ang: number; falla?: Aviso; arriba?: boolean; r?: number; hy?: number; esc?: number; canales?: number[]; pts?: number[] }
const NADA: Medida = { visto: false, postura: false, recto: false, ang: 180 }
const TOLERANTE: Patron[] = ['empuje', 'fondo', 'pike', 'hspu', 'remo', 'plancha', 'lateral', 'hollow', 'barco', 'crunch', 'burpee', 'lsit']

export function medir(p: Patron, f: Cuadro, op: Opciones = {}, base?: Base, dentro = false): Medida {
  const { img, mundo } = f
  if (img.length < 29 || mundo.length < 29) return NADA
  const asp = f.aspecto && f.aspecto > 0 ? f.aspecto : 1
  const umbral = TOLERANTE.includes(p) ? BAJO : NORMAL
  const ver = (i: number) => (img[i]?.v ?? 0) >= umbral
  const lados = (...g: Par[]) => ([0, 1] as const).filter(s => g.every(j => ver(j[s])))
  const peso = (s: 0 | 1, g: Par[]) => g.reduce((m, j) => m + img[j[s]].v, 0)
  const mejor = (...g: Par[]): 0 | 1 | -1 => { const ok = lados(...g); return ok.length ? ok.reduce((a, s) => peso(s, g) > peso(a, g) ? s : a) : -1 }
  const ang = (a: Par, b: Par, c: Par, s: 0 | 1) => angulo(mundo[a[s]], mundo[b[s]], mundo[c[s]])
  const plano = (a: Par, b: Par, c: Par, s: 0 | 1) => { const p = img[a[s]], q = img[b[s]], r = img[c[s]]; const ux = (p.x - q.x) * asp, uy = p.y - q.y, vx = (r.x - q.x) * asp, vy = r.y - q.y, n = Math.hypot(ux, uy) * Math.hypot(vx, vy); return n > 0 ? Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / n))) * 180 / Math.PI : 180 }
  const flexion = (a: Par, b: Par, c: Par) => { const ok = lados(a, b, c); return ok.length ? Math.min(...ok.map(s => ang(a, b, c, s))) : null }
  const torso = (s: 0 | 1 | -1) => s !== -1 ? inclinacion(mundo[N.hombro[s]], mundo[N.cadera[s]]) : null
  const pie = (s: 0 | 1) => ver(N.tobillo[s]) ? N.tobillo : ver(N.rodilla[s]) ? N.rodilla : null
  const linea = (s: 0 | 1 | -1) => { if (s === -1) return null; const q = pie(s); return q ? ang(N.hombro, N.cadera, q, s) : null }
  const alto = (g: Par) => Math.min(...lados(g).map(k => img[g[k]].y))
  const bajo = (g: Par) => Math.max(...lados(g).map(k => img[g[k]].y))
  const medio = (g: Par) => { const ok = lados(g); return ok.reduce((m: number, k) => m + img[g[k]].y, 0) / ok.length }
  const d2 = (a: Punto, b: Punto) => Math.hypot((a.x - b.x) * asp, a.y - b.y)
  const ancho = lados(N.hombro).length === 2 ? d2(img[11], img[12]) : 0
  const brazo = Math.max(0, ...lados(N.hombro, N.codo).map(s => d2(img[N.hombro[s]], img[N.codo[s]])))
  const frente = ancho > 0 && brazo > 0 && ancho > 0.6 * brazo
  const deFrente = ancho >= 0.06 && (brazo === 0 || ancho > 0.6 * brazo)
  const mitad = (a: number, b: number) => ({ x: (img[a].x + img[b].x) / 2, y: (img[a].y + img[b].y) / 2, z: 0, v: 1 })

  if (p === 'generico' || p === 'quieto') {
    if (!(ver(11) || ver(12)) || !(ver(23) || ver(24))) return NADA
    const sh = ver(11) && ver(12) ? mitad(11, 12) : ver(11) ? img[11] : img[12]
    const hp = ver(23) && ver(24) ? mitad(23, 24) : ver(23) ? img[23] : img[24]
    const largo = d2(sh, hp)
    if (largo <= 0.02) return NADA
    if (p === 'quieto') {
      const pts = PUNTOS.flatMap(i => ver(i) ? [img[i].x * asp, img[i].y] : [NaN, NaN])
      return { visto: PUNTOS.filter(i => ver(i)).length >= 6, postura: true, recto: true, ang: 180, pts, esc: largo }
    }
    const canales = CANALES.map(([a, b, c]) => ver(a) && ver(b) && ver(c) ? angulo(mundo[a], mundo[b], mundo[c]) : NaN)
    const manos = ver(15) && ver(16)
    canales.push(manos && ver(23) && ver(24) ? ((img[15].x + img[16].x) / 2 - hp.x) * asp / largo * 60 : NaN)
    canales.push(manos ? ((img[15].y + img[16].y) / 2 - sh.y) / largo * 90 : NaN)
    return { visto: true, postura: true, recto: true, ang: 180, canales }
  }
  if (p === 'planche' || p === 'lever' || p === 'bandera') {
    const s = mejor(N.hombro, N.cadera)
    if (s === -1 || !lados(N.muneca).length) return NADA
    const k = mejor(N.hombro, N.codo, N.muneca)
    const codo = k === -1 ? null : ang(N.hombro, N.codo, N.muneca, k)
    const brazosOk = op.doblado || codo === null || codo >= (dentro ? 135 : 145)
    const horizontal = inclinacion(mundo[N.hombro[s]], mundo[N.cadera[s]]) < (op.tuck ? 0.7 : 0.6) + (dentro ? 0.1 : 0)
    if (p === 'lever') return { visto: true, postura: alto(N.muneca) < img[N.hombro[s]].y && horizontal, recto: brazosOk, ang: codo ?? 180, falla: brazosOk ? undefined : 'extiende' }
    const pie = piso(img, ver)
    const despegado = pie === null ? dentro : base ? pie < base.pie - (dentro ? 0.06 : 0.12) * base.largo : pie < bajo(N.muneca) - (dentro ? 0.01 : 0.03)
    if (p === 'planche') {
      const postura = img[N.hombro[s]].y < bajo(N.muneca) && despegado && (horizontal || !!op.doblado)
      return { visto: true, postura, recto: brazosOk, ang: codo ?? 180, falla: !despegado ? 'pies' : !postura ? 'posicion' : brazosOk ? undefined : 'extiende' }
    }
    const q = ver(N.tobillo[s]) ? N.tobillo : null
    return { visto: true, postura: despegado && (q ? inclinacion(mundo[N.hombro[s]], mundo[q[s]]) < 0.5 : horizontal), recto: q ? ang(N.hombro, N.cadera, q, s) >= 150 : true, ang: 180, falla: despegado ? undefined : 'pies' }
  }

  if (p === 'empuje' && deFrente) {
    const codo = flexion(N.hombro, N.codo, N.muneca)
    const s = mejor(N.hombro, N.cadera)
    const t = torso(s)
    const dePie = s !== -1 && img[N.cadera[s]].v >= 0.7 && t !== null && t >= 0.8
    const r = lados(N.muneca).length ? (medio(N.muneca) - medio(N.hombro)) / ancho : undefined
    return { visto: true, postura: !dePie, recto: true, ang: codo ?? 180, r, hy: medio(N.hombro), esc: ancho }
  }
  if (p === 'empuje' || p === 'fondo' || p === 'dominada' || p === 'colgado' || p === 'pike' || p === 'hspu' || p === 'remo') {
    const codo = flexion(N.hombro, N.codo, N.muneca)
    if (codo === null) return NADA
    if (p === 'dominada' || p === 'colgado') {
      if (!ver(N.nariz)) return NADA
      const manos = alto(N.muneca)
      if (p === 'colgado') return { visto: true, postura: manos < img[N.nariz].y, recto: codo >= 140, ang: codo }
      return { visto: true, postura: manos < alto(N.hombro), recto: true, ang: codo, arriba: codo <= RANGO.dominada.abajo && img[N.nariz].y <= manos + 0.03 }
    }
    const s = mejor(N.hombro, N.cadera)
    const t = torso(s), l = linea(s)
    if (p === 'pike') return { visto: true, postura: s !== -1 && img[N.cadera[s]].y < img[N.hombro[s]].y - 0.03, recto: true, ang: codo }
    if (p === 'hspu') return { visto: true, postura: s !== -1 && img[N.cadera[s]].y < img[N.hombro[s]].y && bajo(N.muneca) > img[N.hombro[s]].y, recto: true, ang: codo }
    if (p === 'remo') return { visto: true, postura: alto(N.muneca) < alto(N.hombro) && (t === null || t < 0.8), recto: true, ang: codo }
    if (p === 'fondo') return { visto: true, postura: t === null || t >= 0.55, recto: true, ang: codo }
    const r = frente && lados(N.muneca).length ? (medio(N.muneca) - medio(N.hombro)) / ancho : undefined
    const lr = op.rodillas ? (s !== -1 && ver(N.rodilla[s]) ? ang(N.hombro, N.cadera, N.rodilla, s) : null) : l
    return { visto: true, postura: t === null || t < (op.inclinado ? 0.9 : 0.65), recto: lr === null || lr >= 140, ang: codo, r }
  }
  if (p === 'sentadilla') {
    const rodilla = flexion(N.cadera, N.rodilla, N.tobillo)
    if (rodilla === null) return NADA
    const t = torso(mejor(N.hombro, N.cadera))
    const caderaFrente = frente && lados(N.cadera).length === 2 && !op.salto
    return { visto: true, postura: t === null || t >= 0.45, recto: true, ang: rodilla, ...(caderaFrente ? { hy: medio(N.cadera), esc: ancho } : {}) }
  }
  if (p === 'crunch') {
    const s = mejor(N.hombro, N.cadera)
    if (s === -1) return NADA
    const sh = img[N.hombro[s]], hp = img[N.cadera[s]]
    const elev = Math.atan2(hp.y - sh.y, Math.abs(sh.x - hp.x) * asp) * 180 / Math.PI
    return { visto: true, postura: true, recto: true, ang: 180, hy: elev / 100, esc: 1 }
  }
  if (p === 'piernas') {
    const s = mejor(N.cadera)
    if (s === -1) return NADA
    const q = ver(N.tobillo[s]) ? N.tobillo : ver(N.rodilla[s]) ? N.rodilla : ver(N.tobillo[1 - s]) ? N.tobillo : ver(N.rodilla[1 - s]) ? N.rodilla : null
    if (!q) return NADA
    const hp = img[N.cadera[s]], pi = ver(q[s]) ? img[q[s]] : img[q[1 - s]]
    const elev = Math.atan2(hp.y - pi.y, Math.abs(pi.x - hp.x) * asp) * 180 / Math.PI
    return { visto: true, postura: true, recto: true, ang: 180, hy: elev / 100, esc: 1 }
  }
  if (p === 'barco') {
    const s = mejor(N.hombro, N.cadera)
    if (s === -1) return NADA
    const rod = ver(N.rodilla[s]), tob = ver(N.tobillo[s])
    if (!rod && !tob) return NADA
    const q = tob ? N.tobillo : N.rodilla
    const sh = img[N.hombro[s]], hp = img[N.cadera[s]], pi = img[q[s]]
    const sube = (a: Punto) => Math.atan2(hp.y - a.y, Math.abs(a.x - hp.x) * asp) * 180 / Math.PI
    const torsoArriba = sube(sh), minimo = dentro ? 8 : 12
    const pies = (!tob || sube(img[N.tobillo[s]]) >= minimo) && (!rod || sube(img[N.rodilla[s]]) >= minimo)
    const v = plano(N.hombro, N.cadera, q, s)
    const postura = torsoArriba >= (dentro ? 10 : 15) && torsoArriba <= (dentro ? 85 : 80) && (sh.x - hp.x) * (pi.x - hp.x) < 0
    const recto = pies && v >= (dentro ? 40 : 50) && v <= (dentro ? 150 : 140)
    return { visto: true, postura, recto, ang: v, falla: !postura ? 'posicion' : !pies ? 'pies' : recto ? undefined : 'posicion' }
  }
  if (p === 'puente') {
    const s = mejor(N.hombro, N.cadera, N.rodilla)
    if (s === -1) return NADA
    const sh = img[N.hombro[s]], hp = img[N.cadera[s]], kn = img[N.rodilla[s]]
    const v1x = (sh.x - hp.x) * asp, v1y = sh.y - hp.y, v2x = (kn.x - hp.x) * asp, v2y = kn.y - hp.y
    const n = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y)
    if (!(n > 0)) return NADA
    let cadera = frente ? ang(N.hombro, N.cadera, N.rodilla, s) : Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / n))) * 180 / Math.PI
    const dx = kn.x - sh.x
    if (!frente && Math.abs(dx) > 0.01 && hp.y < sh.y + (kn.y - sh.y) * (hp.x - sh.x) / dx) cadera = 180
    const t = torso(s)
    return { visto: true, postura: t === null || t < 0.75, recto: true, ang: cadera >= 162 ? 95 : 180 - tope((cadera - 145) / 17) * 80 }
  }
  if (p === 'talones' || p === 'cuerda') {
    const s = mejor(N.hombro, N.cadera)
    if (s === -1 || !lados(N.tobillo).length) return NADA
    const t = torso(s)
    const esc = frente ? ancho : d2(img[N.hombro[s]], img[N.cadera[s]]) * 0.75
    if (!(esc > 0.02)) return NADA
    return { visto: true, postura: t === null || t >= 0.75, recto: true, ang: 180, hy: -medio(N.hombro), esc }
  }
  if (p === 'elevacion') {
    if (!ver(N.nariz) || !lados(N.muneca).length) return NADA
    const s = mejor(N.hombro, N.cadera)
    const q = s === -1 ? null : pie(s)
    if (s === -1 || !q) return NADA
    return { visto: true, postura: alto(N.muneca) < img[N.nariz].y, recto: true, ang: ang(N.hombro, N.cadera, q, s) }
  }
  if (p === 'saltos') {
    const ok = lados(N.cadera, N.hombro, N.muneca)
    if (!ok.length) return NADA
    const abre = Math.max(...ok.map(s => ang(N.cadera, N.hombro, N.muneca, s)))
    const t = torso(mejor(N.hombro, N.cadera))
    return { visto: true, postura: t === null || t >= 0.6, recto: true, ang: 180 - abre }
  }
  if (p === 'burpee') {
    const s = mejor(N.hombro, N.cadera)
    if (s === -1) return NADA
    return { visto: true, postura: true, recto: true, ang: (torso(s) ?? 0) * 180 }
  }
  if (p === 'wallsit') {
    const s = mejor(N.cadera, N.rodilla, N.tobillo)
    if (s === -1) return NADA
    const rodilla = frente ? ang(N.cadera, N.rodilla, N.tobillo, s) : plano(N.cadera, N.rodilla, N.tobillo, s)
    const t = ver(N.hombro[s]) ? torso(s) : null
    const muslo = frente ? inclinacion(mundo[N.cadera[s]], mundo[N.rodilla[s]]) : Math.abs(img[N.rodilla[s]].y - img[N.cadera[s]].y) / Math.max(1e-6, d2(img[N.cadera[s]], img[N.rodilla[s]]))
    return { visto: true, postura: rodilla >= 65 && rodilla <= 115 && (t === null || t >= 0.6) && muslo < 0.5, recto: true, ang: rodilla }
  }
  if (p === 'lsit') {
    const uno = (g: Par) => { const a = img[g[0]], b = img[g[1]]; return Math.max(a.v, b.v) >= umbral ? (a.v >= b.v ? a : b) : null }
    const sh = uno(N.hombro), kn = uno(N.rodilla), an = uno(N.tobillo), cad = uno(N.cadera) ?? kn, pie = an ?? kn
    if (!sh || !cad || !pie) return NADA
    const torsoL = d2(sh, cad)
    if (torsoL <= 0.02) return NADA
    if (d2(cad, pie) / torsoL < 0.8) {
      const erguido = (cad.y - sh.y) / torsoL >= (dentro ? 0.7 : 0.8)
      const altura = Math.abs(pie.y - cad.y) / torsoL
      const encogido = !!kn && kn !== cad && (Math.min(cad.y, pie.y) - kn.y) / torsoL > (dentro ? 0.3 : 0.2)
      return { visto: true, postura: erguido && altura <= (dentro ? 0.55 : 0.45), recto: !encogido, ang: 90 }
    }
    const ang3 = (a: Punto, b: Punto, c: Punto) => { const ux = (a.x - b.x) * asp, uy = a.y - b.y, vx = (c.x - b.x) * asp, vy = c.y - b.y, n = Math.hypot(ux, uy) * Math.hypot(vx, vy); return n > 0 ? Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / n))) * 180 / Math.PI : 180 }
    const cadera = ang3(sh, cad, kn && kn !== cad ? kn : pie)
    const rodilla = kn && an && kn !== cad ? ang3(cad, kn, an) : 180
    const caen = Math.abs(pie.y - cad.y) / d2(cad, pie)
    return { visto: true, postura: cadera >= (dentro ? 40 : 45) && cadera <= (dentro ? 135 : 120) && caen < (dentro ? 0.62 : 0.5), recto: rodilla >= (dentro ? 130 : 140), ang: cadera }
  }
  if (p === 'parado') {
    const s = mejor(N.hombro, N.cadera, N.tobillo)
    if (s === -1) return NADA
    const manos = lados(N.muneca).map(k => img[N.muneca[k]].y)
    const invertido = img[N.tobillo[s]].y < img[N.hombro[s]].y && (!manos.length || Math.max(...manos) > img[N.hombro[s]].y)
    return { visto: true, postura: invertido, recto: ang(N.hombro, N.cadera, N.tobillo, s) >= 150, ang: 180 }
  }
  if (p === 'hollow') {
    const s = mejor(N.hombro, N.cadera)
    const q = s === -1 ? null : pie(s)
    if (s === -1 || !q) return NADA
    const l = frente ? ang(N.hombro, N.cadera, q, s) : plano(N.hombro, N.cadera, q, s), t = torso(s) ?? 1
    const margen = dentro ? 0.006 : -0.008
    const alzado = img[N.hombro[s]].y < img[N.cadera[s]].y + margen && img[q[s]].y < img[N.cadera[s]].y + margen
    return { visto: true, postura: t < (dentro ? 0.7 : 0.6) && alzado, recto: l >= (dentro ? 100 : 110) && l <= (dentro ? 179 : 176), ang: l }
  }
  const s = mejor(N.hombro, N.cadera)
  const l = linea(s), t = torso(s)
  if (p === 'plancha') {
    if (frente) {
      if (!ver(N.nariz) || !lados(N.codo).length) return NADA
      const hombros = medio(N.hombro), codos = medio(N.codo)
      const manos = lados(N.muneca).length > 0
      const brazos = op.estirados ? manos && (flexion(N.hombro, N.codo, N.muneca) ?? 0) >= (dentro ? 140 : 150) && medio(N.muneca) > hombros + 0.5 * ancho : bajo(N.codo) > hombros && (!manos || bajo(N.muneca) - codos <= 0.4 * ancho)
      const cerca = (g: Par, k: number) => !lados(g).length || medio(g) <= hombros + k * ancho
      const postura = brazos && cerca(N.cadera, 1) && cerca(N.rodilla, 1.6) && img[N.nariz].y >= hombros - 0.3 * ancho
      const alzado = (op.estirados ? medio(N.muneca) : codos) - hombros
      const arriba = op.estirados || alzado >= (dentro ? 0.25 : 0.35) * ancho
      const firme = (i: number) => (img[i]?.v ?? 0) >= NORMAL
      const piernas = ([0, 1] as const).filter(k => firme(N.rodilla[k]) && firme(N.tobillo[k]))
      const rodillas = !piernas.length || piernas.some(k => img[N.rodilla[k]].y <= img[N.tobillo[k]].y + (dentro ? 0.02 : -0.03) * alzado)
      return { visto: true, postura, recto: arriba && rodillas, ang: 180, falla: !postura ? 'posicion' : !arriba ? 'cadera' : rodillas ? undefined : 'rodillas' }
    }
    if (l === null || t === null || s === -1) return NADA
    const b = mejor(N.hombro, N.codo)
    if (b === -1) return { visto: true, postura: false, recto: false, ang: l }
    const apoyo = (k: 0 | 1) => {
      const sh = img[N.hombro[k]], el = img[N.codo[k]], wr = img[N.muneca[k]], verMano = ver(N.muneca[k])
      const vertical = (a: Punto, c: Punto) => (c.y - a.y) / Math.max(1e-6, d2(a, c))
      if (op.estirados) return verMano && ang(N.hombro, N.codo, N.muneca, k) >= (dentro ? 140 : 150) && vertical(sh, wr) >= 0.7
      const codo = verMano ? ang(N.hombro, N.codo, N.muneca, k) : 90
      return vertical(sh, el) >= 0.6 && codo >= 50 && codo <= 135
    }
    const pt = (i: number) => ({ x: img[i].x * asp, y: img[i].y })
    const a = pt(op.estirados ? N.muneca[b] : N.codo[b])
    const z = ver(N.tobillo[s]) ? pt(N.tobillo[s]) : { x: a.x + 1, y: a.y }
    const dx = z.x - a.x, dy = z.y - a.y, largo = Math.hypot(dx, dy) || 1
    const sobre = (i: number) => { const r = pt(i); return (dx * (r.y - a.y) - dy * (r.x - a.x)) / largo }
    const hs = sobre(N.hombro[b])
    const rel = (i: number) => Math.abs(hs) > 1e-6 ? sobre(i) / hs : 0
    const conPiernas = ver(N.rodilla[s]) && ver(N.tobillo[s])
    const cadera = rel(N.cadera[s]) >= (dentro ? 0.27 : 0.32)
    const rodillas = !conPiernas || rel(N.rodilla[s]) >= (dentro ? 0.06 : 0.12)
    const derecho = l >= (dentro ? 145 : 150)
    const piernas = !conPiernas || ang(N.cadera, N.rodilla, N.tobillo, s) >= (dentro ? 140 : 150)
    const postura = t < (dentro ? 0.8 : 0.7) && apoyo(b)
    const hb = pt(N.hombro[s]), cb = pt(N.cadera[s]), pb = pt(pie(s)![s])
    const lado = (r: { x: number; y: number }) => (pb.x - hb.x) * (r.y - hb.y) - (pb.y - hb.y) * (r.x - hb.x)
    const pica = lado(cb) * lado(a) < 0
    const falla: Aviso | undefined = !postura ? 'posicion' : !cadera ? 'cadera' : !rodillas ? 'rodillas' : !derecho ? (pica ? 'alta' : 'cadera') : piernas ? undefined : 'recto'
    return { visto: true, postura, recto: cadera && rodillas && derecho && piernas, ang: l, falla }
  }
  if (p === 'lateral') {
    const q = s === -1 ? null : pie(s)
    if (s === -1 || !q || t === null) return NADA
    const recta = plano(N.hombro, N.cadera, q, s)
    const hb = img[N.hombro[s]], cb = img[N.cadera[s]], pb = img[q[s]]
    const dx = pb.x - hb.x
    const caida = Math.abs(dx) > 0.01 ? cb.y > hb.y + (pb.y - hb.y) * (cb.x - hb.x) / dx : false
    const ok = recta >= (dentro ? 160 : 165)
    return { visto: true, postura: t < 0.85, recto: ok, ang: recta, falla: ok ? undefined : caida ? 'cadera' : 'alta' }
  }
  if (l !== null && t !== null) return { visto: true, postura: t < 0.85, recto: l >= 150, ang: l }
  return NADA
}

const PIES = [27, 28, 29, 30]
function piso(img: Punto[], ver: (i: number) => boolean): number | null {
  const ys = PIES.filter(i => ver(i)).map(i => img[i].y)
  return ys.length ? Math.max(...ys) : null
}
export function calibrar(c: Conteo, f: Cuadro): Conteo {
  const v = (i: number) => (f.img[i]?.v ?? 0) >= NORMAL
  const pie = piso(f.img, v)
  const asp = f.aspecto && f.aspecto > 0 ? f.aspecto : 1
  const lado = [0, 1].find(k => v(N.hombro[k]) && v(N.cadera[k]))
  if (pie === null || lado === undefined) return c
  const sh = f.img[N.hombro[lado]], hp = f.img[N.cadera[lado]]
  const largo = Math.hypot((sh.x - hp.x) * asp, sh.y - hp.y)
  const manos = [15, 16].filter(v).map(i => f.img[i].y)
  return largo > 0.02 ? { ...c, base: { pie, mano: manos.length ? Math.max(...manos) : pie, largo } } : c
}
export const SKILLS: Patron[] = ['planche', 'lever', 'bandera', 'parado']
export const esSkill = (p: Patron) => SKILLS.includes(p)

export type Conteo = {
  ej: string; patron: Patron; reps: number; segundos: number; fase: 'nada' | 'arriba' | 'abajo'
  suave: number | null; prof: number; profMax: number; ultimaProf: number; bajando: boolean; rTop: number; malDesde: number; hist: [number, number][]; escS: number
  inicio: number; ok: boolean; acumulado: number; ultimo: number | null; aviso: Aviso | null; visto: boolean; min: number; abajo: number
  op: Opciones; canal: number; polo: 1 | -1; sc: number[]; hc: [number, number[]][]; ref: number[]; refT: number; mov: number; base?: Base
}

export function nuevoConteo(ej: string, kind?: Tipo): Conteo {
  const patron = patronDe(ej, kind) ?? (kind === 'seconds' ? 'quieto' : 'generico')
  const r = RANGO[patron as Repeticion]
  const min = r ? (/explosiv|salto|palmada/i.test(ej) ? 350 : r.min) : patron === 'generico' ? 400 : 0
  const abajo = /toes to bar/i.test(ej.trim()) ? 70 : r?.abajo ?? 0
  return { ej, patron, reps: 0, segundos: 0, fase: 'nada', suave: null, prof: 0, profMax: 0, ultimaProf: 0, bajando: false, rTop: 0, malDesde: 0, hist: [], escS: 0, inicio: 0, ok: true, acumulado: 0, ultimo: null, aviso: null, visto: false, min, abajo, op: opcionesDe(ej), canal: -1, polo: 1, sc: [], hc: [], ref: [], refT: 0, mov: 1 }
}

function pasoGenerico(c: Conteo, m: Medida | null, t: number, base: Conteo): Conteo {
  if (!m || !m.visto || !m.canales) return { ...base, visto: false, aviso: 'acomodate', prof: 0 }
  const sc = m.canales.map((v, i) => Number.isNaN(v) ? NaN : c.sc[i] === undefined || Number.isNaN(c.sc[i]) ? v : c.sc[i] * (1 - NUEVO) + v * NUEVO)
  const hc: [number, number[]][] = [...c.hc.filter(([tt]) => t - tt <= VENTANA_G), [t, sc]]
  const rango = (i: number) => {
    let lo = Infinity, hi = -Infinity, primero = NaN
    for (const [, v] of hc) { const x = v[i]; if (Number.isNaN(x)) continue; if (Number.isNaN(primero)) primero = x; lo = Math.min(lo, x); hi = Math.max(hi, x) }
    return { lo, hi, amp: hi > lo ? hi - lo : 0, primero }
  }
  let { canal, polo, fase, inicio, profMax } = c
  const n0 = { ...base, visto: true, sc, hc, aviso: c.aviso === 'acomodate' || c.aviso === 'posicion' ? null : c.aviso }
  if (canal < 0 || Number.isNaN(sc[canal]) || (fase !== 'abajo' && rango(canal).amp < UMBRAL_G[canal] * 0.6)) {
    let elegido = -1, puntaje = 1
    sc.forEach((v, i) => { if (Number.isNaN(v)) return; const pt = rango(i).amp / UMBRAL_G[i]; if (pt >= puntaje) { puntaje = pt; elegido = i } })
    if (elegido < 0) return { ...n0, canal: -1, fase: 'arriba', prof: 0, profMax: 0, inicio: 0 }
    const r0 = rango(elegido)
    canal = elegido
    polo = Math.abs(r0.primero - r0.hi) <= Math.abs(r0.primero - r0.lo) ? 1 : -1
    fase = 'arriba'
    inicio = hc[0][0]
    profMax = 0
  }
  const r = rango(canal)
  const pos = r.amp > 0 ? (sc[canal] - r.lo) / r.amp : 1
  const q = polo === 1 ? pos : 1 - pos
  const prof = tope(1 - q)
  const n = { ...n0, canal, polo, prof }
  if (fase === 'abajo') {
    if (q < 0.8) return { ...n, fase, inicio, profMax: 1 }
    const vale = t - inicio >= c.min
    return { ...n, fase: 'arriba', inicio: 0, profMax: 0, ultimaProf: 1, reps: vale ? c.reps + 1 : c.reps, aviso: vale ? null : 'rapido' }
  }
  if (r.amp >= UMBRAL_G[canal] && q <= 0.2) return { ...n, fase: 'abajo', inicio: inicio || t, profMax: 1 }
  if (q < 0.8) return { ...n, fase: 'arriba', inicio: inicio || t, profMax: Math.max(profMax, prof) }
  const media = profMax >= 0.5
  return { ...n, fase: 'arriba', inicio: 0, profMax: 0, ultimaProf: media ? profMax : c.ultimaProf, aviso: media ? 'baja' : n.aviso }
}

const tope = (n: number) => Math.max(0, Math.min(1, n))

export function pasoMedida(c: Conteo, m: Medida | null, t: number): Conteo {
  const dt = c.ultimo === null ? 0 : Math.min(500, Math.max(0, t - c.ultimo))
  const base = { ...c, ultimo: t }
  const enRep = c.fase === 'abajo' || (c.fase === 'arriba' && c.inicio > 0)
  if (c.patron === 'generico') return pasoGenerico(c, m, t, base)
  if (c.patron === 'quieto' && m && m.visto && m.pts && m.esc) {
    let { ref, refT, mov } = c
    if (!ref.length || ref.length !== m.pts.length) { ref = m.pts; refT = t }
    else if (t - refT >= 1000) {
      let suma = 0, k = 0
      for (let i = 0; i < m.pts.length; i += 2) if (!Number.isNaN(m.pts[i]) && !Number.isNaN(ref[i])) { suma += Math.hypot(m.pts[i] - ref[i], m.pts[i + 1] - ref[i + 1]); k++ }
      mov = k ? suma / k / m.esc / ((t - refT) / 1000) : 1
      ref = m.pts
      refT = t
    }
    base.ref = ref; base.refT = refT; base.mov = mov
    m = { ...m, postura: mov < QUIETO }
  }
  if (esAguante(c.patron)) {
    const bien = !!m && m.visto && m.postura && m.recto
    const malDesde = bien ? 0 : c.malDesde || t
    if (!bien && (c.prof < 1 || t - malDesde >= (GRACIA_P[c.patron] ?? GRACIA))) {
      const aviso: Aviso = !m || !m.visto ? 'acomodate' : m.falla ?? (m.postura ? 'recto' : 'posicion')
      return { ...base, visto: !!m?.visto, prof: 0, malDesde, aviso }
    }
    const acumulado = c.acumulado + (c.prof === 1 ? dt : 0) / 1000
    return { ...base, visto: true, prof: 1, malDesde, aviso: null, acumulado, segundos: Math.floor(acumulado + 1e-6) }
  }
  if (!m || !m.visto) return { ...base, visto: false, aviso: 'acomodate', suave: null, prof: 0, ok: enRep && c.patron !== 'burpee' ? false : c.ok }
  if (!m.postura) return { ...base, visto: true, aviso: 'posicion', ok: enRep ? false : c.ok, suave: null, prof: 0 }
  const r = RANGO[c.patron as Repeticion]
  let medida = m.ang, rTop = c.rTop, hist = c.hist, escS = c.escS
  if (m.hy !== undefined && m.esc) {
    const [ini, fin, ven] = CAIDA_P[c.patron] ?? [0.12, CAIDA_H, VENTANA]
    hist = [...c.hist.filter(([tt]) => t - tt <= ven), [t, m.hy] as [number, number]]
    escS = c.escS ? c.escS * 0.8 + m.esc * 0.2 : m.esc
    const caida = (m.hy - Math.min(...hist.map(([, y]) => y))) / escS
    const eq = caida <= ini ? 180 : r.arriba - tope((caida - ini) / (fin - ini)) * (r.arriba - c.abajo) - (caida >= fin ? 5 : 0)
    medida = m.ang <= c.abajo ? Math.min(m.ang, eq) : eq
  } else if (m.r !== undefined && m.r > 0) {
    rTop = Math.max(c.rTop * 0.998, m.r)
    const caida = 1 - m.r / rTop
    const eq = caida <= 0.1 ? 180 : r.arriba - tope((caida - 0.1) / (CAIDA - 0.1)) * (r.arriba - c.abajo) - (caida >= CAIDA ? 5 : 0)
    medida = m.ang <= c.abajo ? Math.min(m.ang, eq) : eq
  }
  const suave = c.suave === null ? medida : c.suave * (1 - NUEVO) + medida * NUEVO
  const prof = tope((r.arriba - suave) / (r.arriba - c.abajo))
  const n = { ...base, visto: true, suave, prof, rTop, hist, escS, aviso: c.aviso === 'acomodate' || c.aviso === 'posicion' ? null : c.aviso }
  if (c.patron === 'dominada') {
    if (c.fase === 'nada') return suave >= r.arriba ? { ...n, fase: 'abajo', profMax: 0, inicio: 0 } : { ...n, aviso: 'posicion' }
    if (c.fase === 'arriba') {
      if (suave >= r.arriba) return { ...n, fase: 'abajo', profMax: 0, inicio: 0, bajando: false }
      if (m.arriba && c.bajando) return { ...n, bajando: false, aviso: 'extiende' }
      return { ...n, bajando: c.bajando || (!m.arriba && suave >= 120) }
    }
    if (m.arriba) {
      const vale = c.inicio > 0 && t - c.inicio >= c.min
      return { ...n, fase: 'arriba', inicio: 0, profMax: 0, bajando: false, ultimaProf: 1, reps: vale ? c.reps + 1 : c.reps, aviso: vale ? null : 'rapido' }
    }
    if (suave >= r.arriba) return { ...n, profMax: 0, inicio: 0, ultimaProf: c.profMax >= 0.5 ? c.profMax : c.ultimaProf, aviso: c.profMax >= 0.5 ? 'sube' : n.aviso }
    return { ...n, profMax: Math.max(c.profMax, prof), inicio: c.inicio || t }
  }
  if (c.fase === 'nada') return suave >= r.arriba ? { ...n, fase: 'arriba', profMax: 0, inicio: 0, ok: true } : { ...n, aviso: 'posicion' }
  if (c.fase === 'arriba') {
    if (suave >= r.arriba) {
      const media = c.profMax >= 0.35
      return { ...n, profMax: 0, inicio: 0, ok: true, ultimaProf: media ? c.profMax : c.ultimaProf, aviso: media ? (c.patron === 'puente' ? 'cadera' : c.patron === 'crunch' || c.patron === 'piernas' ? 'mas' : 'baja') : n.aviso }
    }
    const ok = c.ok && m.recto, inicio = c.inicio || t, profMax = Math.max(c.profMax, prof)
    return prof >= 1 ? { ...n, fase: 'abajo', inicio, ok, profMax: 1 } : { ...n, inicio, ok, profMax }
  }
  const ok = c.ok && m.recto
  if (suave < r.arriba) return { ...n, ok }
  const listo = { ...n, fase: 'arriba' as const, profMax: 0, inicio: 0, ok: true, ultimaProf: 1 }
  if (!ok) return { ...listo, aviso: 'recto' }
  if (t - c.inicio < c.min) return { ...listo, aviso: 'rapido' }
  return { ...listo, reps: c.reps + 1, aviso: null }
}

export function paso(c: Conteo, f: Cuadro | null, t: number): Conteo {
  return pasoMedida(c, f ? medir(c.patron, f, c.op, c.base, esAguante(c.patron) && c.prof === 1) : null, t)
}

export const valorDe = (c: Conteo) => esAguante(c.patron) ? c.segundos : c.reps
