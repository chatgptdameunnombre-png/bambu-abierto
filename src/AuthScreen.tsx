import { useEffect, useState, type FormEvent } from 'react'
import { cuenta, errorDeCuenta, google, setLocalOnly } from './lib/firebase'
import { LegalLinks } from './Legal'
import { DuoIcon } from './DuoIcons'
import { Cielo } from './Onboarding'

type View = 'entrar' | 'crear' | 'recuperar'

function iosInBrowser(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  return ios && !standalone
}

export function AuthScreen() {
  const [view, setView] = useState<View>('entrar')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  function go(next: View) { setView(next); setNotice(''); setError('') }

  useEffect(() => {
    if (!google.pendiente()) return
    setBusy(true)
    google.volver().catch(reason => setError(errorDeCuenta(reason))).finally(() => setBusy(false))
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const mail = email.trim().toLowerCase()
    setBusy(true); setNotice(''); setError('')
    try {
      if (view === 'crear') {
        if (password.length < 8) throw new Error('La contraseña necesita al menos 8 caracteres.')
        await cuenta.crear(mail, password, name)
      } else if (view === 'recuperar') {
        await cuenta.recuperar(mail)
        setNotice('Listo. Si ese correo tiene cuenta, te llega un enlace para cambiar la contraseña. Revisa también spam.')
      } else {
        await cuenta.entrar(mail, password)
      }
    } catch (reason) {
      setError(errorDeCuenta(reason))
    } finally { setBusy(false) }
  }

  const title = view === 'crear' ? 'Crea tu cuenta' : view === 'recuperar' ? 'Recupera tu acceso' : 'Entra a tu cuenta'
  return <main className="d-auth ob-fondo">
    <Cielo />
    <section className="d-auth-card">
      <div className="d-auth-brand"><img src="icon.svg" width="44" height="44" alt="" /><img className="d-auth-nombre" src="logo-nombre.png" width="104" height="30" alt="bambú" /></div>
      <h1>{title}</h1>
      <p className="d-auth-copy">{view === 'crear' ? 'Tu progreso se guarda en tu cuenta y puedes competir en las tablas. Si ya usabas Bambú en este teléfono, se sube todo lo que tienes.' : view === 'recuperar' ? 'Escribe tu correo y te mandamos un enlace para poner una contraseña nueva.' : 'Con Google o con tu correo.'}</p>
      {view !== 'recuperar' && <>
        <button type="button" className="d-google" disabled={busy} onClick={() => { setBusy(true); google.ir() }}>
          <svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true"><path className="g-r" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5Z" /><path className="g-b" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.1Z" /><path className="g-y" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.8l7.9-6.2Z" /><path className="g-g" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.2C6.6 42.6 14.6 48 24 48Z" /></svg>
          Continuar con Google
        </button>
        <div className="d-auth-or"><span>o con tu correo</span></div>
      </>}
      {view !== 'recuperar' && <div className="d-mode two" role="tablist">
        <button type="button" role="tab" aria-selected={view === 'entrar'} className={view === 'entrar' ? 'on' : ''} onClick={() => go('entrar')}>Entrar</button>
        <button type="button" role="tab" aria-selected={view === 'crear'} className={view === 'crear' ? 'on' : ''} onClick={() => go('crear')}>Crear cuenta</button>
      </div>}
      <form className="d-auth-form" onSubmit={submit}>
        {view === 'crear' && <label className="d-field">Tu nombre<input className="d-input" autoComplete="nickname" required maxLength={40} value={name} onChange={e => setName(e.target.value)} placeholder="Cómo te llamas" /></label>}
        <label className="d-field">Correo<input className="d-input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" /></label>
        {view !== 'recuperar' && <label className="d-field">Contraseña
          <span className="d-pass">
            <input className="d-input" type={show ? 'text' : 'password'} autoComplete={view === 'crear' ? 'new-password' : 'current-password'} required minLength={view === 'crear' ? 8 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder={view === 'crear' ? 'Mínimo 8 caracteres' : 'Tu contraseña'} />
            <button type="button" className="d-pass-eye" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar contraseña' : 'Ver contraseña'}>{show ? 'Ocultar' : 'Ver'}</button>
          </span>
        </label>}
        {error && <p className="d-auth-msg error" role="alert">{error}</p>}
        {notice && <p className="d-auth-msg ok" role="status">{notice}</p>}
        {view === 'crear' && <LegalLinks />}
        <button className="d-btn green wide" type="submit" disabled={busy}>{busy ? 'Un momento' : view === 'crear' ? 'Crear mi cuenta' : view === 'recuperar' ? 'Mandar enlace' : 'Entrar'}</button>
      </form>
      {view === 'recuperar'
        ? <button type="button" className="d-auth-link" onClick={() => go('entrar')}>Volver a entrar</button>
        : view === 'entrar' && <button type="button" className="d-auth-link" onClick={() => go('recuperar')}>Olvidé mi contraseña</button>}
      {iosInBrowser() && <p className="d-auth-ios"><DuoIcon name="estrella" size={20} />Para que no te pida entrar a cada rato, abre Bambú desde el ícono de tu pantalla de inicio.</p>}
      <button type="button" className="d-btn white wide" onClick={() => { setLocalOnly(true); window.location.reload() }}>Seguir sin cuenta</button>
      <p className="d-auth-foot">Sin cuenta todo se queda solo en este teléfono y no sales en las tablas.</p>
    </section>
  </main>
}
