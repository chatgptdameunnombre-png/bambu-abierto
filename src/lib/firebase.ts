import type { RecordRow } from './records'
import { authError, docId, encode, fieldsOf, microsToTs, recordFields, rowOf, sessionGone, type FsDoc, type FsValue } from './nubeFormato'
import { dirFrom, dirOf, perfilOf, type Dir, type Perfil } from './perfil'
import { MAX_PERSONAS, tipoDeReto, type Reto, type TipoReto } from './retos'

const API_KEY = 'AIzaSyDZZK2IeuHYrvFSn-R-9v6xfY33s1X7vjo'
const PROJECT = 'tuagentedeia-4f2a1'
const PRUEBA = import.meta.env.VITE_NUBE_PRUEBA?.trim()
const AUTH = `${PRUEBA ? `${PRUEBA}/auth` : 'https://identitytoolkit.googleapis.com'}/v1/accounts`
const TOKEN = `${PRUEBA ? `${PRUEBA}/token` : 'https://securetoken.googleapis.com'}/v1/token?key=${API_KEY}`
const ROOT = `projects/${PROJECT}/databases/(default)/documents`
const DOCS = `${PRUEBA ? `${PRUEBA}/firestore` : 'https://firestore.googleapis.com'}/v1/${ROOT}`
const SESSION_KEY = 'bambu.cuenta.v1'
const LOCAL_KEY = 'bambu.local'
const PULL_PAGE = 1000
const GOOGLE_CLIENT = '705086353492-86q95kr5csg6ejmq17rbppt5l8gjsho2.apps.googleusercontent.com'
const GOOGLE_STATE = 'bambu.google.estado'
const PUSH_BATCH = 400

export type Sesion = { uid: string; email: string; idToken: string; refreshToken: string; expiresAt: number; nombre?: string }

export function localOnly(): boolean { try { return localStorage.getItem(LOCAL_KEY) === '1' } catch { return false } }
export function setLocalOnly(on: boolean): void {
  try { if (on) localStorage.setItem(LOCAL_KEY, '1'); else localStorage.removeItem(LOCAL_KEY) } catch { return }
}
export const cuentaActiva = !localOnly()

function leer(): Sesion | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Sesion | null
    return s?.uid && s.refreshToken ? s : null
  } catch { return null }
}
let actual = leer()
const oyentes = new Set<(s: Sesion | null) => void>()
function guardar(s: Sesion | null) {
  const cambio = actual?.uid !== s?.uid
  actual = s
  try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY) } catch { return }
  if (cambio) oyentes.forEach(f => f(s))
}

class NubeError extends Error {
  readonly code: string
  constructor(code: string) { super(authError(code)); this.code = code }
}

async function post(url: string, body: unknown, token?: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  })
  const json = await res.json().catch(() => ({})) as Record<string, unknown>
  if (!res.ok) {
    const e = json.error as { message?: string; status?: string } | undefined
    throw new NubeError(`${res.status} ${e?.status ?? ''} ${e?.message ?? ''}`.trim())
  }
  return json
}

function desdeAuth(j: Record<string, unknown>, nombre?: string): Sesion {
  return { uid: String(j.localId), email: String(j.email ?? ''), idToken: String(j.idToken), refreshToken: String(j.refreshToken), expiresAt: Date.now() + Number(j.expiresIn ?? 3600) * 1000, nombre }
}

let renovando: Promise<string> | null = null
async function token(force = false): Promise<string> {
  const s = actual
  if (!s) throw new NubeError('SIN_SESION')
  if (!force && s.expiresAt - Date.now() > 120000) return s.idToken
  if (!renovando) {
    renovando = (async () => {
      const res = await fetch(TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(s.refreshToken)}`, signal: AbortSignal.timeout(15000) })
      const j = await res.json().catch(() => ({})) as Record<string, unknown>
      if (!res.ok) {
        const code = String((j.error as { message?: string } | undefined)?.message ?? res.status)
        if (sessionGone(code) && actual?.uid === s.uid) guardar(null)
        throw new NubeError(code)
      }
      const next: Sesion = { ...s, idToken: String(j.id_token), refreshToken: String(j.refresh_token), expiresAt: Date.now() + Number(j.expires_in ?? 3600) * 1000 }
      if (actual?.uid === s.uid) guardar(next)
      return next.idToken
    })().finally(() => { renovando = null })
  }
  return renovando
}

async function conToken(url: string, body: unknown): Promise<Record<string, unknown> | unknown[]> {
  try { return await post(url, body, await token()) } catch (error) {
    if (!(error instanceof NubeError) || !/^401/.test(error.code)) throw error
    return post(url, body, await token(true))
  }
}

export const cuenta = {
  guardada: () => actual,
  alCambiar(f: (s: Sesion | null) => void) { oyentes.add(f); return () => { oyentes.delete(f) } },
  async crear(email: string, password: string, nombre: string) {
    const j = await post(`${AUTH}:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true })
    guardar(desdeAuth(j, nombre.trim().slice(0, 40) || undefined))
  },
  async entrar(email: string, password: string) {
    const j = await post(`${AUTH}:signInWithPassword?key=${API_KEY}`, { email, password, returnSecureToken: true })
    const s = desdeAuth(j)
    if (actual && actual.uid === s.uid) { actual = s; try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch { return } }
    else guardar(s)
  },
  async recuperar(email: string) {
    await post(`${AUTH}:sendOobCode?key=${API_KEY}`, { requestType: 'PASSWORD_RESET', email })
  },
  salir() { guardar(null) },
  proveedor: () => { const s = actual; return s ? String((claims(s.idToken).firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider ?? 'password') : '' },
  async borrar(password: string) {
    const s = actual
    if (!s) throw new NubeError('SIN_SESION')
    if (password) await cuenta.entrar(s.email, password)
    else {
      await token(true)
      const desde = Number(claims(actual?.idToken ?? '').auth_time ?? 0)
      if (Date.now() / 1000 - desde > 240) throw new NubeError('REAUTH_GOOGLE')
    }
    await borrarPerfil(s.uid)
    await borrarPases(s.uid)
    await borrarRetos(s.uid)
    await borrarFallos(s.uid)
    await borrarWidgets(s.uid)
    await borrarAvisos(s.uid)
    const sol = await solicitudes(s.uid)
    await Promise.all([...sol.entrantes.map(de => cancelarSolicitud(de, s.uid)), ...sol.salientes.map(para => cancelarSolicitud(s.uid, para))])
    for (;;) {
      const docs = await listar(s.uid, 400)
      if (!docs.length) break
      await conToken(`${DOCS}:commit`, { writes: docs.map(name => ({ delete: name })) })
      if (docs.length < 400) break
    }
    await post(`${AUTH}:delete?key=${API_KEY}`, { idToken: await token() })
    guardar(null)
  },
}

function claims(idToken: string): Record<string, unknown> {
  try { return JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown> } catch { return {} }
}
const regreso = () => `${location.origin}${location.pathname}`

export const google = {
  ir() {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    const estado = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
    try { localStorage.setItem(GOOGLE_STATE, estado) } catch { return }
    const q = new URLSearchParams({ client_id: GOOGLE_CLIENT, redirect_uri: regreso(), response_type: 'id_token', scope: 'openid email profile', nonce: estado, state: estado, prompt: 'select_account' })
    location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${q}`)
  },
  pendiente: () => /(?:^#|&)(?:id_token|error)=/.test(location.hash),
  async volver() {
    const h = new URLSearchParams(location.hash.slice(1))
    const idToken = h.get('id_token')
    const error = h.get('error')
    history.replaceState(null, '', `${location.pathname}${location.search}`)
    let guardado: string | null = null
    try { guardado = localStorage.getItem(GOOGLE_STATE); localStorage.removeItem(GOOGLE_STATE) } catch { guardado = null }
    if (error || !idToken) throw new NubeError('GOOGLE_CANCELADO')
    if (!guardado || h.get('state') !== guardado || claims(idToken).nonce !== guardado) throw new NubeError('GOOGLE_ESTADO')
    const j = await post(`${AUTH}:signInWithIdp?key=${API_KEY}`, { postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`, requestUri: regreso(), returnSecureToken: true })
    if (j.needConfirmation) throw new NubeError('GOOGLE_OTRA_CUENTA')
    const nombre = typeof j.firstName === 'string' ? j.firstName : typeof j.displayName === 'string' ? j.displayName : undefined
    guardar(desdeAuth(j, nombre))
  },
}

export const correoVerificado = () => { const s = cuenta.guardada(); return !s || claims(s.idToken).email_verified === true }
export async function mandarVerificacion(): Promise<void> {
  await post(`${AUTH}:sendOobCode?key=${API_KEY}`, { requestType: 'VERIFY_EMAIL', idToken: await token() })
}
export async function revisarVerificacion(): Promise<boolean> {
  await token(true)
  return correoVerificado()
}

export const errorDeCuenta = (e: unknown) => e instanceof Error ? e.message : authError('')

const registros = (uid: string) => `${ROOT}/bambu/${uid}/registros`

async function listar(uid: string, limit: number): Promise<string[]> {
  const out = await conToken(`${DOCS}/bambu/${uid}:runQuery`, { structuredQuery: { from: [{ collectionId: 'registros' }], select: { fields: [{ fieldPath: '__name__' }] }, limit } }) as { document?: FsDoc }[]
  return out.map(x => x.document?.name).filter((x): x is string => !!x)
}

export type Remote = { pull: (cursor: number) => Promise<{ rows: RecordRow[]; cursor: number }>; push: (rows: RecordRow[]) => Promise<void> }

export function remoto(uid: string): Remote {
  return {
    async pull(cursor) {
      const rows: RecordRow[] = []
      let current = cursor
      let after: { s: string; name: string } | null = null
      for (;;) {
        const query: Record<string, unknown> = {
          from: [{ collectionId: 'registros' }],
          where: { fieldFilter: { field: { fieldPath: 's' }, op: 'GREATER_THAN', value: { timestampValue: microsToTs(cursor) } } },
          orderBy: [{ field: { fieldPath: 's' }, direction: 'ASCENDING' }, { field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
          limit: PULL_PAGE,
        }
        if (after) query.startAt = { values: [{ timestampValue: after.s }, { referenceValue: after.name }], before: false }
        const out = await conToken(`${DOCS}/bambu/${uid}:runQuery`, { structuredQuery: query }) as { document?: FsDoc }[]
        const docs = out.map(x => x.document).filter((x): x is FsDoc => !!x)
        for (const doc of docs) {
          const r = rowOf(doc)
          if (!r) continue
          rows.push(r.row)
          current = Math.max(current, r.s)
        }
        if (docs.length < PULL_PAGE) break
        const last = docs[docs.length - 1]
        after = { s: String((last.fields?.s as { timestampValue?: string } | undefined)?.timestampValue ?? ''), name: last.name }
      }
      return { rows, cursor: current }
    },
    async push(rows) {
      for (let i = 0; i < rows.length; i += PUSH_BATCH) {
        const writes = rows.slice(i, i + PUSH_BATCH).map(row => ({
          update: { name: `${registros(uid)}/${docId(row.collection, row.id)}`, fields: recordFields(row) },
          updateTransforms: [{ fieldPath: 's', setToServerValue: 'REQUEST_TIME' }],
        }))
        await conToken(`${DOCS}:commit`, { writes })
      }
    },
  }
}

const toFields = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, encode(v)])) as Record<string, FsValue>
const stamp = [{ fieldPath: 's', setToServerValue: 'REQUEST_TIME' }]
const idOf = (d: FsDoc) => d.name.split('/').pop() ?? ''

export async function publicarPerfil(p: Perfil): Promise<void> {
  const { uid, actualizado, siguiendo, ...rest } = p
  void actualizado; void siguiendo
  const { uid: _u, actualizado: _a, ...dir } = dirOf(p)
  void _u; void _a
  await conToken(`${DOCS}:commit`, { writes: [
    { update: { name: `${ROOT}/bambu_perfiles/${uid}`, fields: toFields(rest) }, updateTransforms: stamp },
    { update: { name: `${ROOT}/bambu_directorio/${uid}`, fields: toFields(dir) }, updateTransforms: stamp },
  ] })
}

export async function borrarPerfil(uid: string): Promise<void> {
  await conToken(`${DOCS}:commit`, { writes: [{ delete: `${ROOT}/bambu_perfiles/${uid}` }, { delete: `${ROOT}/bambu_directorio/${uid}` }] })
}

async function query(parent: string, structuredQuery: Record<string, unknown>): Promise<FsDoc[]> {
  const out = await conToken(`${DOCS}${parent}:runQuery`, { structuredQuery }) as { document?: FsDoc }[]
  return out.map(x => x.document).filter((x): x is FsDoc => !!x)
}
const eq = (field: string, value: FsValue) => ({ fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value } })

export async function directorio(): Promise<Dir[]> {
  return (await query('', { from: [{ collectionId: 'bambu_directorio' }], limit: 500 })).map(d => dirFrom(idOf(d), fieldsOf(d.fields))).filter((x): x is Dir => !!x)
}
export async function perfilesPublicos(): Promise<Perfil[]> {
  return (await query('', { from: [{ collectionId: 'bambu_perfiles' }], where: eq('publica', { booleanValue: true }), limit: 300 })).map(d => perfilOf(idOf(d), fieldsOf(d.fields))).filter((x): x is Perfil => !!x)
}
export async function perfilDe(uid: string): Promise<Perfil | null> {
  try {
    const res = await fetch(`${DOCS}/bambu_perfiles/${uid}`, { headers: { Authorization: `Bearer ${await token()}` }, signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const doc = await res.json() as FsDoc
    return perfilOf(uid, fieldsOf(doc.fields))
  } catch { return null }
}
export async function solicitudes(uid: string): Promise<{ entrantes: string[]; salientes: string[] }> {
  const [inn, out] = await Promise.all([
    query('', { from: [{ collectionId: 'bambu_solicitudes' }], where: eq('para', { stringValue: uid }), limit: 200 }),
    query('', { from: [{ collectionId: 'bambu_solicitudes' }], where: eq('de', { stringValue: uid }), limit: 200 }),
  ])
  const field = (d: FsDoc, k: string) => String(fieldsOf(d.fields)[k] ?? '')
  return { entrantes: inn.map(d => field(d, 'de')).filter(Boolean), salientes: out.map(d => field(d, 'para')).filter(Boolean) }
}
export async function pedirAmistad(de: string, para: string): Promise<void> {
  await conToken(`${DOCS}:commit`, { writes: [{ update: { name: `${ROOT}/bambu_solicitudes/${de}__${para}`, fields: toFields({ de, para }) }, updateTransforms: stamp }] })
}
export async function guardarPase(llave: string, hasta: string): Promise<void> {
  const s = actual
  if (!s) throw new NubeError('SIN_SESION')
  await conToken(`${DOCS}:commit`, { writes: [{ update: { name: `${ROOT}/bambu_pases/${llave}`, fields: toFields({ uid: s.uid, hasta }) }, updateTransforms: stamp }] })
}
export async function borrarPase(llave: string): Promise<void> {
  await conToken(`${DOCS}:commit`, { writes: [{ delete: `${ROOT}/bambu_pases/${llave}` }] })
}
export async function borrarPases(uid: string): Promise<void> {
  const docs = await query('', { from: [{ collectionId: 'bambu_pases' }], where: eq('uid', { stringValue: uid }), limit: 20 })
  if (docs.length) await conToken(`${DOCS}:commit`, { writes: docs.map(d => ({ delete: d.name })) })
}
export const urlPase = (llave: string) => `https://firestore.googleapis.com/v1/${ROOT}/bambu_pases/${llave}?key=${API_KEY}`
const msDe = (v: unknown) => typeof v === 'string' ? Date.parse(v) || 0 : 0
function retoDe(d: FsDoc & { updateTime?: string }): Reto | null {
  const f = fieldsOf(d.fields)
  if (typeof f.de !== 'string' || !Array.isArray(f.participantes) || typeof f.ejercicio !== 'string') return null
  const marcas: Record<string, number> = {}
  if (f.marcas && typeof f.marcas === 'object') for (const [k, v] of Object.entries(f.marcas as Record<string, unknown>)) if (typeof v === 'number') marcas[k] = v
  return { id: idOf(d), de: f.de, participantes: f.participantes.filter((x): x is string => typeof x === 'string'), tipo: tipoDeReto(String(f.tipo)), ejercicio: f.ejercicio, marcas, creado: msDe(f.s), movido: msDe(f.t), version: d.updateTime ?? '' }
}
const ambos = [{ fieldPath: 's', setToServerValue: 'REQUEST_TIME' }, { fieldPath: 't', setToServerValue: 'REQUEST_TIME' }]
const movido = [{ fieldPath: 't', setToServerValue: 'REQUEST_TIME' }]
export async function misRetos(uid: string): Promise<Reto[]> {
  const docs = await query('', { from: [{ collectionId: 'bambu_retos' }], where: { fieldFilter: { field: { fieldPath: 'participantes' }, op: 'ARRAY_CONTAINS', value: { stringValue: uid } } }, limit: 60 })
  return docs.map(retoDe).filter((x): x is Reto => !!x).sort((x, y) => Math.max(y.creado, y.movido) - Math.max(x.creado, x.movido))
}
export async function crearReto(rivales: string[], tipo: TipoReto, ejercicio: string, marca: number): Promise<string> {
  const s = actual
  if (!s) throw new NubeError('SIN_SESION')
  const id = `${s.uid}__${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const participantes = [s.uid, ...rivales.filter(x => x !== s.uid)].slice(0, MAX_PERSONAS)
  await conToken(`${DOCS}:commit`, { writes: [{ update: { name: `${ROOT}/bambu_retos/${id}`, fields: toFields({ de: s.uid, participantes, tipo, ejercicio, marcas: { [s.uid]: Math.round(marca) } }) }, currentDocument: { exists: false }, updateTransforms: ambos }] })
  return id
}
export async function marcarReto(r: Reto, uid: string, marca: number): Promise<void> {
  await conToken(`${DOCS}:commit`, { writes: [{ update: { name: `${ROOT}/bambu_retos/${r.id}`, fields: toFields({ marcas: { ...r.marcas, [uid]: Math.round(marca) } }) }, updateMask: { fieldPaths: ['marcas'] }, currentDocument: r.version ? { updateTime: r.version } : { exists: true }, updateTransforms: movido }] })
}
export async function salirReto(r: Reto, uid: string): Promise<void> {
  const marcas = Object.fromEntries(Object.entries(r.marcas).filter(([k]) => k !== uid))
  await conToken(`${DOCS}:commit`, { writes: [{ update: { name: `${ROOT}/bambu_retos/${r.id}`, fields: toFields({ participantes: r.participantes.filter(x => x !== uid), marcas }) }, updateMask: { fieldPaths: ['participantes', 'marcas'] }, currentDocument: { exists: true }, updateTransforms: movido }] })
}
export type Fallo = { donde: string; error: string; pila: string; version: string; navegador: string }
export async function reportarFallo(f: Fallo): Promise<void> {
  const s = cuentaActiva ? actual : null
  const de = s?.uid ?? 'local'
  const id = `${de}__${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  const corto = (x: string, n: number) => String(x ?? '').slice(0, n)
  const fields = toFields({ de, donde: corto(f.donde, 40), error: corto(f.error, 400), pila: corto(f.pila, 800), version: corto(f.version, 60), navegador: corto(f.navegador, 200) })
  const cuerpo = { writes: [{ update: { name: `${ROOT}/bambu_fallos/${id}`, fields }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 's', setToServerValue: 'REQUEST_TIME' }] }] }
  if (s) await conToken(`${DOCS}:commit`, cuerpo)
  else await post(`${DOCS}:commit?key=${API_KEY}`, cuerpo)
}
export async function borrarFallos(uid: string): Promise<void> {
  const docs = await query('', { from: [{ collectionId: 'bambu_fallos' }], where: { fieldFilter: { field: { fieldPath: 'de' }, op: 'EQUAL', value: { stringValue: uid } } }, limit: 300 })
  for (const d of docs) await conToken(`${DOCS}:commit`, { writes: [{ delete: d.name }] })
}
export async function borrarReto(id: string): Promise<void> {
  await conToken(`${DOCS}:commit`, { writes: [{ delete: `${ROOT}/bambu_retos/${id}` }] })
}
export async function borrarRetos(uid: string): Promise<void> {
  for (const r of await misRetos(uid)) {
    if (r.de === uid) await borrarReto(r.id)
    else await salirReto(r, uid)
  }
}
export async function leerReto(id: string): Promise<Reto | null> {
  const pedir = async (tk: string) => fetch(`${DOCS}/bambu_retos/${id}`, { headers: { Authorization: `Bearer ${tk}` }, signal: AbortSignal.timeout(15000) })
  let res = await pedir(await token())
  if (res.status === 401) res = await pedir(await token(true))
  if (!res.ok) return null
  return retoDe(await res.json() as FsDoc & { updateTime?: string })
}
export type EstadoWidget = { dia: string; racha: number; nivel: number; xpHoy: number; meta: number; minutos: number; rutina: string; retos?: number }
export async function guardarWidget(llave: string, e: EstadoWidget): Promise<void> {
  const s = actual
  if (!s) throw new NubeError('SIN_SESION')
  await conToken(`${DOCS}:commit`, { writes: [{ update: { name: `${ROOT}/bambu_widget/${llave}`, fields: toFields({ uid: s.uid, ...e }) }, updateTransforms: stamp }] })
}
export async function borrarWidget(llave: string): Promise<void> {
  await conToken(`${DOCS}:commit`, { writes: [{ delete: `${ROOT}/bambu_widget/${llave}` }] })
}
export async function borrarWidgets(uid: string): Promise<void> {
  const docs = await query('', { from: [{ collectionId: 'bambu_widget' }], where: eq('uid', { stringValue: uid }), limit: 20 })
  if (docs.length) await conToken(`${DOCS}:commit`, { writes: docs.map(d => ({ delete: d.name })) })
}
export const urlWidget = (llave: string) => `https://firestore.googleapis.com/v1/${ROOT}/bambu_widget/${llave}?key=${API_KEY}`
export type Suscripcion = { endpoint: string; p256dh: string; auth: string }
export type EstadoAvisos = { ultimo: string; hecho: boolean; racha: number }
export async function guardarAvisos(uid: string, sub: Suscripcion, hora: string, zona: string, e: EstadoAvisos): Promise<void> {
  await conToken(`${DOCS}:commit`, { writes: [{ update: { name: `${ROOT}/bambu_avisos/${uid}`, fields: toFields({ sub, hora, zona, ...e }) }, updateTransforms: stamp }] })
}
export async function estadoAvisos(uid: string, e: EstadoAvisos): Promise<void> {
  await conToken(`${DOCS}:commit`, { writes: [{ update: { name: `${ROOT}/bambu_avisos/${uid}`, fields: toFields({ ...e }) }, updateMask: { fieldPaths: ['ultimo', 'hecho', 'racha'] }, currentDocument: { exists: true }, updateTransforms: stamp }] })
}
export function avisarFinPase(hasta: number): void {
  const s = actual
  if (!s) return
  void conToken(`${DOCS}:commit`, { writes: [{ update: { name: `${ROOT}/bambu_avisos/${s.uid}`, fields: toFields({ paseHasta: Math.max(0, Math.round(hasta)) }) }, updateMask: { fieldPaths: ['paseHasta'] }, currentDocument: { exists: true }, updateTransforms: stamp }] }).catch(() => undefined)
}
export async function borrarAvisos(uid: string): Promise<void> {
  await conToken(`${DOCS}:commit`, { writes: [{ delete: `${ROOT}/bambu_avisos/${uid}` }] })
}
export async function cancelarSolicitud(de: string, para: string): Promise<void> {
  await conToken(`${DOCS}:commit`, { writes: [{ delete: `${ROOT}/bambu_solicitudes/${de}__${para}` }] })
}
