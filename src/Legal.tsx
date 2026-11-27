import { useState } from 'react'
import type { AppData } from './lib/model'
import { AVISO_CORTO, VERSION_LEGAL, avisoPrivacidad, legalListo, terminos, type Documento } from './lib/legal'
import { Sheet } from './Sheet'
import { DuoIcon } from './DuoIcons'

export const mostrarLegal = legalListo() || import.meta.env.DEV
export const legalAceptado = (s: AppData['settings']) => s.legal?.version === VERSION_LEGAL && s.legal.salud === true
type Commit = (update: (d: AppData) => AppData) => void

function Doc({ doc }: { doc: Documento }) {
  return <div className="d-legal">
    <p className="d-hint left">Última actualización: {doc.actualizado}</p>
    {doc.secciones.map(s => <section key={s.titulo}><h3>{s.titulo}</h3>{s.parrafos.map(p => <p key={p}>{p}</p>)}</section>)}
  </div>
}

export function LegalSheet({ cual, onClose }: { cual: 'privacidad' | 'terminos'; onClose: () => void }) {
  const doc = cual === 'privacidad' ? avisoPrivacidad() : terminos()
  return <Sheet title={doc.titulo} tall onClose={onClose}><Doc doc={doc} /></Sheet>
}

export function LegalLinks() {
  const [ver, setVer] = useState<'privacidad' | 'terminos' | null>(null)
  if (!mostrarLegal) return null
  return <>
    <p className="d-auth-legal">{AVISO_CORTO()} Lee el <button type="button" className="d-auth-link inline" onClick={() => setVer('privacidad')}>aviso de privacidad</button> y los <button type="button" className="d-auth-link inline" onClick={() => setVer('terminos')}>términos</button>.</p>
    {ver && <LegalSheet cual={ver} onClose={() => setVer(null)} />}
  </>
}

export function Consentimiento({ onAceptar, onSalir }: { onAceptar: (salud: boolean) => void; onSalir: () => void }) {
  const [acepto, setAcepto] = useState(false)
  const [salud, setSalud] = useState(false)
  const [ver, setVer] = useState<'privacidad' | 'terminos' | null>(null)
  return <main className="d-auth">
    <section className="d-auth-card d-consent">
      <div className="d-auth-brand"><img src="icon.svg" width="44" height="44" alt="" /><img className="d-auth-nombre" src="logo-nombre.png" width="104" height="30" alt="bambú" /></div>
      <h1>Antes de empezar</h1>
      <p className="d-auth-copy">{AVISO_CORTO()}</p>
      <div className="d-row2">
        <button type="button" className="d-btn white small" onClick={() => setVer('privacidad')}>Aviso de privacidad</button>
        <button type="button" className="d-btn white small" onClick={() => setVer('terminos')}>Términos</button>
      </div>
      <label className="d-check"><input type="checkbox" checked={acepto} onChange={e => setAcepto(e.target.checked)} /><span>Leí y acepto el aviso de privacidad y los términos y condiciones.</span></label>
      <label className="d-check"><input type="checkbox" checked={salud} onChange={e => setSalud(e.target.checked)} /><span>Doy mi consentimiento expreso para que se traten mis datos de salud y bienestar (ejercicio y, si los registro, peso, comida y sueño).</span></label>
      <p className="d-hint left">Si eres menor de 18 años, pide a tu mamá, papá o tutor que lo lea y acepte contigo.</p>
      <button type="button" className="d-btn green wide" disabled={!acepto || !salud} onClick={() => onAceptar(salud)}>Aceptar y continuar</button>
      <button type="button" className="d-btn white wide" onClick={onSalir}>Salir de mi cuenta</button>
    </section>
    {ver && <LegalSheet cual={ver} onClose={() => setVer(null)} />}
  </main>
}

export function LegalCard({ data }: { data: AppData }) {
  const [ver, setVer] = useState<'privacidad' | 'terminos' | null>(null)
  if (!mostrarLegal) return null
  const l = data.settings.legal
  return <div className="d-card">
    <div className="d-card-head"><h2>Privacidad y términos</h2><DuoIcon name="escudo" size={32} /></div>
    {!legalListo() && <p className="d-hint left red">Faltan el nombre, el domicilio y el correo del responsable. Hasta llenarlos, esto solo se ve en pruebas.</p>}
    {l && <p className="d-hint left">Aceptaste la versión del {l.fecha.slice(0, 10)}.</p>}
    <div className="d-row2">
      <button type="button" className="d-btn white small" onClick={() => setVer('privacidad')}>Aviso de privacidad</button>
      <button type="button" className="d-btn white small" onClick={() => setVer('terminos')}>Términos</button>
    </div>
    {ver && <LegalSheet cual={ver} onClose={() => setVer(null)} />}
  </div>
}

export const registroLegal = (salud: boolean) => ({ version: VERSION_LEGAL, fecha: new Date().toISOString(), salud })
export function aceptar(commit: Commit, salud: boolean) {
  commit(d => ({ ...d, settings: { ...d.settings, legal: registroLegal(salud) } }))
}
