import { useMovimientos } from '../hooks/useMovimientos.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format } from '../utils/format.js'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, CreditCard, Send, Receipt, FileText, FilePlus2,
  PiggyBank, ChevronRight, TrendingDown, TrendingUp,
} from 'lucide-react'
import { useHBAuth } from '../hooks/useHBAuth.js'
import { useCuentas } from '../hooks/useCuentas.js'
import { useCreditos } from '../hooks/useCreditos.js'
import { simboloMoneda, toNumber } from '../utils/format.js'
import PageLayout from '../components/layout/PageLayout.jsx'
import ActionPanel from '../components/ui/ActionPanel.jsx'
import Card from '../components/ui/Card.jsx'
import Money from '../components/ui/Money.jsx'
import Badge from '../components/ui/Badge.jsx'
import Loader from '../components/ui/Loader.jsx'

export default function HomePage() {
  const { user } = useHBAuth()
  const navigate = useNavigate()
  const { cuentas, loading: lc } = useCuentas('ahorro')
  const { creditos, loading: lk } = useCreditos()

  const totalAhorro = cuentas.reduce((s, c) => s + toNumber(c.saldo), 0)
  const totalDeuda = creditos.reduce((s, c) => s + toNumber(c.pago_pendiente), 0)

  const acciones = [
    { icon: Send, label: 'Transferencias propias', to: '/operaciones/transferencia' },
    { icon: Receipt, label: 'Pago de crédito', to: '/operaciones/pago-credito' },
    { icon: FileText, label: 'Pago de servicios', to: '/operaciones/pago-servicios' },
    { icon: FilePlus2, label: 'Solicitar préstamo', to: '/creditos/solicitar' },
  ]

    // Tomamos la primera cuenta de ahorro para el gráfico de movimientos
  const primeraCuenta = cuentas[0]?.codcuentaahorro ?? null
  const { movimientos, loading: lm } = useMovimientos(primeraCuenta, 20)

  // Agrupamos por mes para el gráfico (sumamos montooperacion por mes)
  const movPorMes = movimientos.reduce((acc, m) => {
    const mes = m.fechahoraoperacion?.slice(0, 7) ?? 'Sin fecha'
    const prev = acc.find((x) => x.mes === mes)
    const monto = parseFloat(m.montooperacion ?? 0)
    if (prev) prev.monto += monto
    else acc.push({ mes, monto: monto })
    return acc
  }, []).slice(-6) // últimos 6 meses

  return (
    <PageLayout aside={<ActionPanel title="Operaciones frecuentes" items={acciones} />}>
      {/* Saludo */}
      <div className="bbva-hello">
        <h1>Hola {primerNombre(user?.nombre)}, hoy te ofrecemos:</h1>
        <p>Esta es la posición global de tus productos en Scotiabank.</p>
      </div>

      {/* KPIs */}
      <div className="bbva-kpis">
        <div className="bbva-kpi">
          <span className="bbva-kpi-ico" style={{ background: '#e2132b1a', color: 'var(--hb-red)' }}>
            <PiggyBank size={22} />
          </span>
          <div>
            <span className="bbva-kpi-label"><TrendingUp size={13} /> Total en ahorros</span>
            <Money className="bbva-kpi-val" value={totalAhorro} />
            <small>{cuentas.length} cuenta(s)</small>
          </div>
        </div>
        <div className="bbva-kpi">
          <span className="bbva-kpi-ico" style={{ background: '#00a9a51a', color: 'var(--hb-turquesa)' }}>
            <CreditCard size={22} />
          </span>
          <div>
            <span className="bbva-kpi-label"><TrendingDown size={13} /> Deuda total de créditos</span>
            <Money className="bbva-kpi-val" value={totalDeuda} />
            <small>{creditos.length} crédito(s)</small>
          </div>
        </div>
      </div>

      {/* Cuentas resumidas */}
      <Card title="Cuentas de Ahorro" icon={<Wallet size={18} />}
        actions={<button className="bbva-link" onClick={() => navigate('/cuentas/ahorro')}>Ver todas <ChevronRight size={14} /></button>}>
        {lc ? <Loader text="Cargando cuentas…" /> : cuentas.length === 0 ? (
          <p className="bbva-empty">No registra cuentas de ahorro.</p>
        ) : (
          <ul className="bbva-prodlist">
            {cuentas.map((c) => (
              <li key={c.codcuentaahorro} onClick={() => navigate(`/cuentas/ahorro/${c.codcuentaahorro}/movimientos`)}>
                <div className="bbva-prod-info">
                  <strong>{c.codcuentaahorro}</strong>
                  <small>{c.tipo} · <Badge estado={c.estado} /></small>
                </div>
                <div className="bbva-prod-amt">
                  <Money value={c.saldo} simbolo={simboloMoneda(c.moneda)} />
                  <ChevronRight size={16} />
                </div>
              </li>
            ))}
            <li className="bbva-prodlist-total">
              <span>Saldo disponible total</span>
              <Money value={totalAhorro} className="bbva-money-strong" />
            </li>
          </ul>
        )}
      </Card>

      {/* Créditos resumidos */}
      <Card title="Préstamos" icon={<CreditCard size={18} />}
        actions={<button className="bbva-link" onClick={() => navigate('/cuentas/credito')}>Ver todos <ChevronRight size={14} /></button>}>
        {lk ? <Loader text="Cargando créditos…" /> : creditos.length === 0 ? (
          <p className="bbva-empty">No registra créditos vigentes.</p>
        ) : (
          <ul className="bbva-prodlist">
            {creditos.map((c) => (
              <li key={c.codcuentacredito} onClick={() => navigate(`/cuentas/credito/${c.codcuentacredito}/cuotas`)}>
                <div className="bbva-prod-info">
                  <strong>{c.codcuentacredito}</strong>
                  <small>Consumo · <Badge estado={c.calificacion || 'Normal'} tone={c.dias_atraso > 0 ? 'red' : undefined} /></small>
                </div>
                <div className="bbva-prod-amt">
                  <Money value={c.pago_pendiente} />
                  <ChevronRight size={16} />
                </div>
              </li>
            ))}
            <li className="bbva-prodlist-total">
              <span>Saldo pendiente total</span>
              <Money value={totalDeuda} className="bbva-money-strong" />
            </li>
          </ul>
        )}
      </Card>

      {/* Gráfico de movimientos recientes */}
      {primeraCuenta && (
        <Card title="Movimientos recientes" icon={<TrendingUp size={18} />}>
          {lm ? <Loader text="Cargando movimientos…" /> : movimientos.length === 0 ? (
            <p className="bbva-empty">Sin movimientos registrados.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={movPorMes} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `S/${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`S/ ${v.toFixed(2)}`, 'Monto']} />
                  <Bar dataKey="monto" radius={[4, 4, 0, 0]}>
                    {movPorMes.map((_, i) => (
                      <Cell key={i} fill={i === movPorMes.length - 1 ? '#D11218' : '#f3a0a3'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ul className="bbva-prodlist" style={{ marginTop: 12 }}>
                {movimientos.slice(0, 5).map((m, i) => (
                  <li key={i}>
                    <div className="bbva-prod-info">
                      <strong>{m.desconceptooperacion ?? m.codconceptooperacion ?? '—'}</strong>
                      <small>{m.fechahoraoperacion?.slice(0, 10)}</small>
                    </div>
                    <div className="bbva-prod-amt">
                      <span style={{ color: m.codtipoegresoingreso === 'E' ? '#D11218' : '#16a34a', fontWeight: 700 }}>
                        {m.codtipoegresoingreso === 'E' ? '−' : '+'}S/ {parseFloat(m.montooperacion ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}    

    </PageLayout>
  )
}

function primerNombre(nombre) {
  if (!nombre) return 'Cliente'
  // El backend usa "Apellido, Nombre"; tomamos el nombre de pila si está.
  const parts = nombre.split(',')
  const np = (parts[1] || parts[0]).trim().split(/\s+/)[0]
  return np || 'Cliente'
}
