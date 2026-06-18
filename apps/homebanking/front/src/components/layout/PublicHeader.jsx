import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronDown } from 'lucide-react'
import Logo from '../ui/Logo.jsx'

// Categorías reales del menú público de Scotiabank (solo navegación visual: todas
// llevan a la sección de productos de este demo educativo).
const NAV = [
  'Canales', 'Ahorros', 'Tarjetas', 'Préstamos',
  'Depósitos e inversión', 'Seguros', 'Programas de lealtad',
  'Financieros', 'Servicios',
]

// Cabecera del sitio público (home marketero), inspirada en el diseño Scotiabank
// trabajado previamente en Vue/Inertia (Welcome.vue): logo + buscador, menú de
// categorías y botón "Acceder" con submenú (Personas / Negocios / Telebanking).
export default function PublicHeader() {
  const navigate = useNavigate()
  const [showAccederMenu, setShowAccederMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowAccederMenu(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <header className="lp-header">
      <div className="hb-franja-top" />

      {/* Fila superior: logo + buscador + acciones */}
      <div className="lp-topbar">
        <button className="lp-brand" onClick={() => navigate('/')} aria-label="Scotiabank — Inicio">
          <Logo size={40} variant="dark" subtitle="" />
        </button>

        <div className="lp-search">
          <Search size={16} />
          <input type="text" placeholder="Búsqueda" />
        </div>

        <div className="lp-topbar-actions">
          <button className="lp-ghost-btn" onClick={() => navigate('/login')}>
            Hazte Cliente
          </button>

          <div className="lp-acceder" ref={menuRef}>
            <button className="lp-cta" onClick={() => setShowAccederMenu((v) => !v)}>
              Acceder <ChevronDown size={15} />
            </button>
            {showAccederMenu && (
              <div className="lp-acceder-menu">
                <button onClick={() => navigate('/login')}>Personas</button>
                <button className="disabled" disabled>Negocios</button>
                <button className="disabled" disabled>Telebanking</button>
              </div>
            )}
          </div>

          <button className="lp-outline-btn" onClick={() => navigate('/login')}>
            Abrir cuenta digital
          </button>
        </div>
      </div>

      {/* Fila de categorías */}
      <nav className="lp-nav-links lp-nav-links-scroll">
        {NAV.map((n) => (
          <a key={n} href="#productos">{n}</a>
        ))}
      </nav>
    </header>
  )
}
