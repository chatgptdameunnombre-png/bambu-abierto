const http = require('node:http')
const crypto = require('node:crypto')

const PORT = Number(process.env.PORT || 5641)
const users = new Map()
const tokens = new Map()
const refresh = new Map()
const docs = new Map()
let clock = Date.now() * 1000
const now = () => (clock = Math.max(clock + 1, Date.now() * 1000))
const ts = m => { const sec = Math.floor(m / 1e6); return `${new Date(sec * 1000).toISOString().replace(/\.\d{3}Z$/, '')}.${String(m - sec * 1e6).padStart(6, '0')}Z` }
const micros = t => { const m = /^(.*T\d\d:\d\d:\d\d)(?:\.(\d+))?Z$/.exec(t); return m ? Date.parse(`${m[1]}Z`) * 1000 + Number(((m[2] || '') + '000000').slice(0, 6)) : 0 }
const log = []

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' })
  res.end(JSON.stringify(body))
}
const fail = (res, code, message) => send(res, code, { error: { code, message, status: code === 403 ? 'PERMISSION_DENIED' : code === 401 ? 'UNAUTHENTICATED' : 'INVALID_ARGUMENT' } })
function session(uid) {
  const idToken = crypto.randomBytes(12).toString('hex')
  const refreshToken = crypto.randomBytes(12).toString('hex')
  tokens.set(idToken, uid); refresh.set(refreshToken, uid)
  return { idToken, refreshToken, expiresIn: process.env.EXPIRES || '3600' }
}
function auth(req) { return tokens.get(String(req.headers.authorization || '').replace(/^Bearer /, '')) }
function allowed(uid, name, isDelete, w) {
  if (!uid) return false
  if (/documents\/bambu_pases\/[A-Za-z0-9]{16,40}$/.test(name)) {
    const prev = docs.get(name)
    if (prev && val(prev.fields.uid) !== uid) return false
    if (isDelete) return !!prev
    const f = w.update.fields
    return val(f.uid) === uid && typeof val(f.hasta) === 'string' && Object.keys(f).every(k => ['uid', 'hasta'].includes(k))
  }
  if (/documents\/bambu_widget\/[A-Za-z0-9]{16,40}$/.test(name)) {
    const prev = docs.get(name)
    if (prev && val(prev.fields.uid) !== uid) return false
    if (isDelete) return !!prev
    const f = w.update.fields
    return val(f.uid) === uid && Object.keys(f).every(k => ['uid', 'dia', 'racha', 'nivel', 'xpHoy', 'meta', 'minutos', 'rutina'].includes(k))
  }
  const av = /documents\/bambu_avisos\/([^/]+)$/.exec(name)
  if (av) {
    if (av[1] !== uid) return false
    if (isDelete) return true
    const keys = w.updateMask ? w.updateMask.fieldPaths : Object.keys(w.update.fields)
    return keys.every(k => ['sub', 'hora', 'zona', 'ultimo', 'hecho', 'racha'].includes(k)) && (!w.updateMask || docs.has(name))
  }
  if (/documents\/bambu_retos\/[A-Za-z0-9_-]{8,300}$/.test(name)) {
    const prev = docs.get(name)
    const lista = x => (x?.arrayValue?.values || []).map(v => v.stringValue)
    const mapa = x => Object.fromEntries(Object.entries(x?.mapValue?.fields || {}).map(([k, v]) => [k, Number(v.integerValue)]))
    const marcaOk = v => Number.isInteger(v) && v >= 0 && v <= 2000
    if (isDelete) return !!prev && val(prev.fields.de) === uid
    const f = w.update.fields
    if (!w.updateMask) {
      const ps = lista(f.participantes), m = mapa(f.marcas)
      return !prev && val(f.de) === uid && ps.includes(uid) && ps.length >= 2 && ps.length <= 10 && new Set(ps).size === ps.length && ['reps', 'aguante', 'cindy'].includes(val(f.tipo)) && Object.keys(m).length === 1 && marcaOk(m[uid]) && Object.keys(f).every(k => ['de', 'participantes', 'tipo', 'ejercicio', 'marcas'].includes(k))
    }
    if (!prev || !lista(prev.fields.participantes).includes(uid)) return false
    const antes = mapa(prev.fields.marcas), despues = mapa(f.marcas), keys = w.updateMask.fieldPaths.join(',')
    if (keys === 'marcas') {
      if (uid in antes || prev.s / 1000 + 48 * 3600 * 1000 < Date.now()) return false
      const nuevas = Object.keys(despues).filter(k => !(k in antes))
      return nuevas.length === 1 && nuevas[0] === uid && marcaOk(despues[uid]) && Object.keys(antes).every(k => despues[k] === antes[k])
    }
    if (keys === 'participantes,marcas') {
      const ps = lista(f.participantes)
      return JSON.stringify(ps) === JSON.stringify(lista(prev.fields.participantes).filter(x => x !== uid)) && !(uid in despues) && Object.keys(antes).filter(k => k !== uid).every(k => despues[k] === antes[k]) && Object.keys(despues).length === Object.keys(antes).filter(k => k !== uid).length
    }
    return false
  }
  const sol = /documents\/bambu_solicitudes\/([^/_]+)__([^/]+)$/.exec(name)
  if (sol) return isDelete ? sol[1] === uid || sol[2] === uid : sol[1] === uid
  const m = /documents\/(bambu\/([^/]+)\/registros\/[^/]+|bambu_perfiles\/([^/]+)|bambu_directorio\/([^/]+))$/.exec(name)
  if (!m) return false
  return (m[2] || m[3] || m[4]) === uid
}
const val = v => v && ('stringValue' in v ? v.stringValue : 'booleanValue' in v ? v.booleanValue : 'integerValue' in v ? Number(v.integerValue) : undefined)
function canRead(uid, d) {
  const m = /documents\/bambu_perfiles\/([^/]+)$/.exec(d.name)
  if (!m) return true
  if (m[1] === uid) return true
  if (val(d.fields.publica) === true) return true
  return (d.fields.aprobados?.arrayValue?.values || []).some(x => x.stringValue === uid)
}
function cmp(a, b) { return a.s - b.s || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) }

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {})
  let raw = ''
  req.on('data', c => { raw += c })
  req.on('end', () => {
    const url = new URL(req.url, 'http://x')
    let body = {}
    try { body = raw && req.headers['content-type']?.includes('json') ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw)) } catch { return fail(res, 400, 'BAD_JSON') }
    log.push(`${req.method} ${url.pathname}`)
    if (url.pathname === '/_log') return send(res, 200, { log, docs: [...docs.keys()], users: [...users.keys()] })
    if (url.pathname === '/_reset') { users.clear(); tokens.clear(); refresh.clear(); docs.clear(); log.length = 0; return send(res, 200, {}) }
    if (url.pathname === '/_doc') { const d = docs.get(url.searchParams.get('name')); return d ? send(res, 200, d) : fail(res, 404, 'NOT_FOUND') }
    if (url.pathname === '/_expire') { tokens.clear(); return send(res, 200, {}) }
    const op = /\/auth\/v1\/accounts:(\w+)/.exec(url.pathname)?.[1]
    if (op === 'signUp') {
      if (users.has(body.email)) return fail(res, 400, 'EMAIL_EXISTS')
      if (String(body.password || '').length < 6) return fail(res, 400, 'WEAK_PASSWORD : Password should be at least 6 characters')
      const uid = crypto.randomBytes(10).toString('hex')
      users.set(body.email, { uid, password: body.password })
      return send(res, 200, { localId: uid, email: body.email, ...session(uid) })
    }
    if (op === 'signInWithPassword') {
      const u = users.get(body.email)
      if (!u || u.password !== body.password) return fail(res, 400, 'INVALID_LOGIN_CREDENTIALS')
      return send(res, 200, { localId: u.uid, email: body.email, registered: true, ...session(u.uid) })
    }
    if (op === 'sendOobCode') return send(res, 200, { email: body.email })
    if (op === 'signInWithIdp') {
      const tok = new URLSearchParams(body.postBody || '').get('id_token') || ''
      let claims = {}
      try { claims = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()) } catch { return fail(res, 400, 'INVALID_IDP_RESPONSE') }
      if (!claims.email) return fail(res, 400, 'INVALID_IDP_RESPONSE')
      let u = users.get(claims.email)
      if (!u) { u = { uid: crypto.randomBytes(10).toString('hex'), password: null }; users.set(claims.email, u) }
      return send(res, 200, { localId: u.uid, email: claims.email, displayName: claims.name, firstName: claims.given_name, providerId: 'google.com', ...session(u.uid) })
    }
    if (op === 'delete') {
      const uid = tokens.get(body.idToken)
      if (!uid) return fail(res, 400, 'INVALID_ID_TOKEN')
      for (const [mail, u] of users) if (u.uid === uid) users.delete(mail)
      return send(res, 200, {})
    }
    if (url.pathname.endsWith('/token/v1/token')) {
      const uid = refresh.get(body.refresh_token)
      if (!uid) return fail(res, 400, 'INVALID_REFRESH_TOKEN')
      const s = session(uid)
      return send(res, 200, { id_token: s.idToken, refresh_token: s.refreshToken, expires_in: s.expiresIn, user_id: uid })
    }
    const uid = auth(req)
    if (url.pathname.endsWith(':commit')) {
      if (!uid) return fail(res, 401, 'UNAUTHENTICATED')
      const writes = body.writes || []
      if (writes.length > 500) return fail(res, 400, 'TOO_MANY_WRITES')
      for (const w of writes) if (!allowed(uid, w.update?.name || w.delete, !!w.delete, w)) return fail(res, 403, 'Missing or insufficient permissions.')
      const s = now()
      for (const w of writes) {
        if (w.delete) { docs.delete(w.delete); continue }
        if (w.currentDocument?.exists === true && !docs.has(w.update.name)) return fail(res, 404, 'NOT_FOUND')
        if (w.currentDocument?.updateTime && (!docs.has(w.update.name) || ts(docs.get(w.update.name).s) !== w.currentDocument.updateTime)) return fail(res, 409, 'FAILED_PRECONDITION')
        if (w.currentDocument?.exists === false && docs.has(w.update.name)) return fail(res, 409, 'ALREADY_EXISTS')
        const fields = w.updateMask ? { ...docs.get(w.update.name).fields, ...w.update.fields } : { ...w.update.fields }
        for (const t of w.updateTransforms || []) if (t.setToServerValue === 'REQUEST_TIME') fields[t.fieldPath] = { timestampValue: ts(s) }
        docs.set(w.update.name, { name: w.update.name, fields, s })
      }
      return send(res, 200, { commitTime: ts(s) })
    }
    if (url.pathname.endsWith(':runQuery')) {
      if (!uid) return fail(res, 401, 'UNAUTHENTICATED')
      const parent = decodeURIComponent(url.pathname.replace(/^\/firestore\/v1\//, '').replace(/:runQuery$/, ''))
      const q = body.structuredQuery
      const coll = q.from[0].collectionId
      if (coll === 'registros' && !parent.endsWith(`/bambu/${uid}`)) return fail(res, 403, 'Missing or insufficient permissions.')
      let list = [...docs.values()].filter(d => d.name.startsWith(`${parent}/${coll}/`) && !d.name.slice(parent.length + coll.length + 2).includes('/'))
      const f = q.where?.fieldFilter
      if (f && f.op === 'GREATER_THAN') list = list.filter(d => d.fields[f.field.fieldPath] && micros(d.fields[f.field.fieldPath].timestampValue) > micros(f.value.timestampValue))
      if (f && f.op === 'EQUAL') list = list.filter(d => val(d.fields[f.field.fieldPath]) === val(f.value))
      if (f && f.op === 'ARRAY_CONTAINS') list = list.filter(d => (d.fields[f.field.fieldPath]?.arrayValue?.values || []).some(v => v.stringValue === val(f.value)))
      if (coll === 'bambu_solicitudes' && !(f && f.op === 'EQUAL' && ['de', 'para'].includes(f.field.fieldPath) && val(f.value) === uid)) return fail(res, 403, 'Missing or insufficient permissions.')
      if (coll === 'bambu_widget' && !(f && f.op === 'EQUAL' && f.field.fieldPath === 'uid' && val(f.value) === uid)) return fail(res, 403, 'Missing or insufficient permissions.')
      if (coll === 'bambu_retos' && !(f && f.op === 'ARRAY_CONTAINS' && f.field.fieldPath === 'participantes' && val(f.value) === uid)) return fail(res, 403, 'Missing or insufficient permissions.')
      if (coll === 'bambu_pases' && !(f && f.op === 'EQUAL' && f.field.fieldPath === 'uid' && val(f.value) === uid)) return fail(res, 403, 'Missing or insufficient permissions.')
      if (coll === 'bambu_perfiles' && list.some(d => !canRead(uid, d))) return fail(res, 403, 'Missing or insufficient permissions.')
      if (coll === 'bambu_perfiles') list.sort((a, b) => Number(b.fields.xp?.integerValue || 0) - Number(a.fields.xp?.integerValue || 0))
      else list.sort(cmp)
      if (q.startAt) {
        const s = micros(q.startAt.values[0].timestampValue), name = q.startAt.values[1].referenceValue
        list = list.filter(d => cmp(d, { s, name }) > 0)
      }
      list = list.slice(0, q.limit || 1000)
      const readTime = ts(now())
      if (!list.length) return send(res, 200, [{ readTime }])
      return send(res, 200, list.map(d => ({ document: { name: d.name, fields: q.select ? {} : d.fields, updateTime: ts(d.s) }, readTime })))
    }
    const pase = /^\/firestore\/v1\/(.+\/bambu_(?:pases|widget)\/[^/]+)$/.exec(decodeURIComponent(url.pathname))
    if (req.method === 'GET' && pase) {
      const d = docs.get(pase[1])
      return d ? send(res, 200, { name: d.name, fields: d.fields }) : fail(res, 404, 'NOT_FOUND')
    }
    const reto = /^\/firestore\/v1\/(.+\/bambu_retos\/[^/]+)$/.exec(decodeURIComponent(url.pathname))
    if (req.method === 'GET' && reto) {
      if (!uid) return fail(res, 401, 'UNAUTHENTICATED')
      const d = docs.get(reto[1])
      if (!d) return fail(res, 404, 'NOT_FOUND')
      if (!(d.fields.participantes?.arrayValue?.values || []).some(v => v.stringValue === uid)) return fail(res, 403, 'Missing or insufficient permissions.')
      return send(res, 200, { name: d.name, fields: d.fields, updateTime: ts(d.s) })
    }
    const one = /^\/firestore\/v1\/(.+\/bambu_perfiles\/[^/]+)$/.exec(decodeURIComponent(url.pathname))
    if (req.method === 'GET' && one) {
      if (!uid) return fail(res, 401, 'UNAUTHENTICATED')
      const d = docs.get(one[1])
      if (!d) return fail(res, 404, 'NOT_FOUND')
      if (!canRead(uid, d)) return fail(res, 403, 'Missing or insufficient permissions.')
      return send(res, 200, { name: d.name, fields: d.fields })
    }
    fail(res, 404, `NOT_FOUND ${url.pathname}`)
  })
})
server.listen(PORT, () => { if (require.main === module) console.log(`nube de prueba en http://localhost:${PORT}`) })
module.exports = server
