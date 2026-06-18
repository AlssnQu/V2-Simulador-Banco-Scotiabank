import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { CreditCard, Fingerprint, Lock, LogIn, ArrowLeft, Eye, EyeOff, Banknote, Send, PiggyBank, Smartphone } from 'lucide-react'
import { useHBAuth } from '../hooks/useHBAuth.js'
import { extractError } from '../utils/format.js'
import Alert from '../components/ui/Alert.jsx'
import Logo from '../components/ui/Logo.jsx'

// Beneficios mostrados en el panel derecho (referencia: Login.vue — "Abre tu nueva Cuenta Digital").
const BENEFICIOS = [
  { icon: Banknote, texto: 'Sin costo de mantenimiento.' },
  { icon: Send, texto: 'Transferencias interbancarias digitales gratis.' },
  { icon: PiggyBank, texto: 'Depósitos gratis e ilimitados en agencias y cajeros a nivel nacional.' },
  { icon: Smartphone, texto: 'Cobra y paga de forma inmediata con usuarios Plin o Yape.' },
]

export default function LoginPage() {
  const { login, isAuthenticated } = useHBAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Número de tarjeta / usuario que pudo venir desde el landing.
  const [tarjeta, setTarjeta] = useState(location.state?.tarjeta || '')
  const [dni, setDni] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Si ya hay sesión, va directo a la banca.
  useEffect(() => {
    if (isAuthenticated) navigate('/inicio', { replace: true })
  }, [isAuthenticated, navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    // El DNI se valida en el front como dato adicional de verificación del titular.
    // Nota: el backend actual solo autentica con tarjeta (username) + clave; el DNI
    // no se envía al servidor (igual que en el diseño original del profesor).
    if (!/^\d{8}$/.test(dni.trim())) {
      setError('Ingresa un DNI válido de 8 dígitos.')
      return
    }

    setLoading(true)
    try {
      // El backend autentica con la tarjeta/usuario (codcliente) + la clave.
      await login(tarjeta.trim(), password)
      navigate('/inicio', { replace: true })
    } catch (err) {
      setError(extractError(err, 'No se pudo iniciar sesión.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sb-login-wrap">
      <div className="hb-franja-top" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10 }} />

      <div className="sb-login-form-col">
        <div className="sb-login-form-inner">
          <Logo size={56} variant="dark" subtitle="" />
          <h2 className="sb-login-title">Inicia sesión</h2>
          <p className="sb-login-sub">Ingresa con el número de tu tarjeta de ahorros</p>

          <Alert tipo="error">{error}</Alert>

          <form onSubmit={onSubmit}>
            <div className="sb-field-group">
              <label htmlFor="tarjeta">N° de tarjeta de ahorros</label>
              <div className="sb-field-icon-wrap">
                <CreditCard size={18} className="sb-field-ico" />
                <input
                  id="tarjeta"
                  placeholder="Ej. cli000001"
                  autoComplete="username"
                  value={tarjeta}
                  onChange={(e) => setTarjeta(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="sb-field-group">
              <label htmlFor="dni">DNI</label>
              <div className="sb-field-icon-wrap">
                <Fingerprint size={18} className="sb-field-ico" />
                <input
                  id="dni"
                  placeholder="8 dígitos"
                  inputMode="numeric"
                  maxLength={8}
                  autoComplete="off"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>

            <div className="sb-field-group">
              <label htmlFor="password">Clave de Internet</label>
              <div className="sb-field-icon-wrap">
                <Lock size={18} className="sb-field-ico" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="sb-field-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar clave' : 'Mostrar clave'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button type="submit" className="sb-btn-primary" disabled={loading}>
              <LogIn size={18} />
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <p className="sb-login-hint">
            Prueba: tarjeta <strong>cli000001</strong> · DNI <strong>12345678</strong> · clave <strong>demo1234</strong>
          </p>

          <Link to="/" className="sb-login-back">
            <ArrowLeft size={15} /> Volver al inicio
          </Link>
        </div>
      </div>

      <div className="sb-login-promo-col">
        <h2>Abre ahora tu nueva Cuenta Digital</h2>
        <div className="sb-promo-list">
          {BENEFICIOS.map((b, i) => {
            const Icon = b.icon
            return (
              <div className="sb-promo-item" key={i}>
                <span className="sb-promo-ico"><Icon size={18} /></span>
                <p>{b.texto}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
