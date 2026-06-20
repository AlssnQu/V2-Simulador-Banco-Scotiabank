/**
 * SolicitarCreditoPage.jsx — Simulador + Solicitud de Crédito
 *
 * Flujo:
 *  1. Simulador en vivo (slider monto, select plazo, select tasa)
 *     → calcula cuota, total, intereses, gráfico dona, tabla de amortización
 *  2. Alerta de capacidad de pago (cuota > 30 % del ingreso)
 *  3. Botón "Solicitar este préstamo" pre-llena el formulario
 *  4. Formulario conecta con POST /creditos/solicitar (backend real)
 *  5. Modal de éxito con código de solicitud + timeline de etapas
 */
import { useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Calculator, FileText, AlertTriangle, CheckCircle2,
  Clock, ChevronDown, ChevronUp, Download, FilePlus2,
  Phone, MessageCircle, Mail, HeadphonesIcon,
  TrendingUp, Banknote,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useSolicitudCredito } from '../hooks/useOperaciones.js'
import { toNumber } from '../utils/format.js'
import PageLayout from '../components/layout/PageLayout.jsx'
import Card from '../components/ui/Card.jsx'
import Money from '../components/ui/Money.jsx'
import Badge from '../components/ui/Badge.jsx'
import Alert from '../components/ui/Alert.jsx'

/* ── Constantes ─────────────────────────────────────────── */
const TASAS = [
  { val: 18, label: '18 % — Personal básico' },
  { val: 24, label: '24 % — Personal estándar' },
  { val: 30, label: '30 % — Personal express' },
  { val: 12, label: '12 % — Con garantía' },
]
const PLAZOS = [6, 12, 18, 24, 36, 48, 60]
const ACTIVIDADES = [
  { cod: '0111', label: '0111 — Cultivo de cereales' },
  { cod: '4711', label: '4711 — Comercio minorista (bodega/abarrotes)' },
  { cod: '4771', label: '4771 — Comercio minorista de prendas de vestir' },
  { cod: '4520', label: '4520 — Mantenimiento y reparación de vehículos' },
  { cod: '5610', label: '5610 — Restaurantes y servicio de comidas' },
  { cod: '4100', label: '4100 — Construcción de edificios' },
  { cod: '4923', label: '4923 — Transporte de carga por carretera' },
  { cod: '9601', label: '9601 — Lavado y limpieza de prendas' },
]
const COLORES = ['#D11218', '#f3a0a3']
const SOL_COLOR = '#D11218'

/* ── Helper: cuota mensual francesa ─────────────────────── */
function calcularCuota(monto, tasaAnual, meses) {
  if (!monto || !meses) return 0
  const r = tasaAnual / 100 / 12
  if (r === 0) return monto / meses
  return (monto * r * Math.pow(1 + r, meses)) / (Math.pow(1 + r, meses) - 1)
}

/* ── Helper: tabla de amortización completa ─────────────── */
function generarTabla(monto, tasaAnual, meses) {
  const r = tasaAnual / 100 / 12
  const cuota = calcularCuota(monto, tasaAnual, meses)
  let saldo = monto
  return Array.from({ length: meses }, (_, i) => {
    const interes = saldo * r
    const capital = cuota - interes
    saldo = Math.max(0, saldo - capital)
    return {
      nro: i + 1,
      capital: capital,
      interes: interes,
      cuota: cuota,
      saldo: saldo,
    }
  })
}

/* ── Helper: formatear moneda ───────────────────────────── */
const fmt = (v) => `S/ ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/* ── Etapas del proceso de solicitud ────────────────────── */
const ETAPAS = [
  { key: 'recibida',    label: 'Solicitud recibida',   desc: 'Registramos tu solicitud en el sistema.' },
  { key: 'evaluacion',  label: 'En evaluación',        desc: 'Nuestros analistas revisan tu perfil crediticio.' },
  { key: 'aprobacion',  label: 'Aprobación',           desc: 'El Comité de Créditos emite su resolución.' },
  { key: 'desembolso',  label: 'Desembolso',           desc: 'El importe se acredita en tu cuenta.' },
]

/* ══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════ */
export default function SolicitarCreditoPage() {
  const navigate = useNavigate()
  const { run, loading, error, result, reset } = useSolicitudCredito()
  const tablaRef = useRef(null)

  /* ── Estado del simulador ── */
  const [monto,    setMonto]    = useState(5000)
  const [plazo,    setPlazo]    = useState(12)
  const [tasa,     setTasa]     = useState(24)
  const [ingresos, setIngresos] = useState('')
  const [showTabla, setShowTabla] = useState(false)

  /* ── Estado del formulario ── */
  const [validacion, setValidacion] = useState(null)
  const [form, setForm] = useState({
    codtipocredito: 'CO',
    codactividadeconomica: '0111',
    // monto y plazo e ingreso se sincronizan desde el simulador al click
    montosolicitud: '',
    plazo: '',
    montoingresoneto: '',
  })
  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  /* ── Cálculos derivados ── */
  const cuota        = useMemo(() => calcularCuota(monto, tasa, plazo), [monto, tasa, plazo])
  const totalPagar   = useMemo(() => cuota * plazo, [cuota, plazo])
  const totalInteres = useMemo(() => totalPagar - monto, [totalPagar, monto])
  const tabla        = useMemo(() => generarTabla(monto, tasa, plazo), [monto, tasa, plazo])
  const pieData      = useMemo(() => [
    { name: 'Capital', value: monto },
    { name: 'Intereses', value: totalInteres },
  ], [monto, totalInteres])

  /* ── Capacidad de pago (alerta si cuota > 30 % del ingreso) ── */
  const ingresosNum  = parseFloat(ingresos) || 0
  const pctIngreso   = ingresosNum > 0 ? (cuota / ingresosNum) * 100 : 0
  const alertaPago   = ingresosNum > 0 && pctIngreso > 30

  /* ── Pre-llenar formulario desde simulador ── */
  const usarSimulador = useCallback(() => {
    setForm((f) => ({
      ...f,
      montosolicitud:  String(monto),
      plazo:           String(plazo),
      montoingresoneto: ingresos || '',
    }))
    // Hacer scroll suave al formulario
    setTimeout(() => {
      document.getElementById('formSolicitud')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [monto, plazo, ingresos])

  /* ── Submit ── */
  const onSubmit = async (e) => {
    e.preventDefault()
    setValidacion(null)
    const m = toNumber(form.montosolicitud)
    const p = parseInt(form.plazo, 10)
    const i = toNumber(form.montoingresoneto)
    if (m <= 0)  { setValidacion('Ingresa un monto válido.'); return }
    if (!p || p <= 0) { setValidacion('Ingresa un plazo válido.'); return }
    if (i <= 0)  { setValidacion('Ingresa tu ingreso neto mensual.'); return }
    try {
      await run({ montosolicitud: m, plazo: p, codtipocredito: form.codtipocredito,
                  codactividadeconomica: form.codactividadeconomica, montoingresoneto: i })
    } catch { /* error ya manejado por el hook */ }
  }

  /* ── Descargar tabla como texto (impresión básica) ── */
  const descargarTabla = () => { window.print() }

  /* ── Pantalla de éxito ── */
  if (result) return (
    <PageLayout>
      <button className="hb-back" onClick={() => navigate('/inicio')}>
        <ArrowLeft size={16} /> Volver al inicio
      </button>
      <Card>
        <div className="hb-comprobante" style={{ textAlign: 'center' }}>
          <CheckCircle2 size={56} color="#16a34a" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ marginTop: 0 }}>¡Solicitud enviada!</h3>
          <p>Tu solicitud de préstamo fue registrada exitosamente.</p>

          {/* Resumen */}
          <div className="hb-dl" style={{ maxWidth: 380, margin: '0 auto 20px', textAlign: 'left' }}>
            <dl>
              <div><dt>N° Solicitud</dt>
                <dd style={{ fontFamily: 'monospace', color: SOL_COLOR, fontWeight: 700 }}>
                  {result.codsolicitud}
                </dd>
              </div>
              <div><dt>Estado</dt><dd><Badge estado={result.estado} /></dd></div>
              <div><dt>Monto solicitado</dt><dd><Money value={result.montosolicitud} /></dd></div>
              <div><dt>Plazo</dt><dd>{result.plazo} cuotas</dd></div>
            </dl>
          </div>

          {/* Timeline de etapas */}
          <div style={{ maxWidth: 360, margin: '0 auto 20px', textAlign: 'left' }}>
            <p style={{ fontSize: 13, color: 'var(--hb-muted)', marginBottom: 10 }}>Etapas del proceso:</p>
            {ETAPAS.map((et, idx) => {
              const estado = idx === 0 ? 'completada' : idx === 1 ? 'activa' : 'pendiente'
              return (
                <div key={et.key}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0' }}>
                    <span style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      background: estado === 'completada' ? '#d1fae5' : estado === 'activa' ? '#fef3c7' : '#f3f4f6',
                      color: estado === 'completada' ? '#065f46' : estado === 'activa' ? '#92400e' : '#9ca3af',
                    }}>
                      {estado === 'completada' ? '✓' : estado === 'activa' ? '●' : '○'}
                    </span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{et.label}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--hb-muted)' }}>{et.desc}</p>
                    </div>
                  </div>
                  {idx < ETAPAS.length - 1 && (
                    <div style={{ width: 2, height: 14, background: idx === 0 ? '#6ee7b7' : '#e5e7eb', marginLeft: 14 }} />
                  )}
                </div>
              )
            })}
          </div>

          <p style={{ fontSize: 12, color: 'var(--hb-muted)' }}>
            <Clock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            El proceso de evaluación toma entre 24 y 48 horas hábiles.
          </p>

          {/* Contacto */}
          <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', fontSize: 13, textAlign: 'left', marginTop: 12 }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <HeadphonesIcon size={15} /> ¿Alguna duda?
            </strong>
            <span>Llama al <strong>0800-00-000</strong> (gratuito) · Lun–Vie 8am–8pm</span>
          </div>
        </div>

        <div className="bbva-form-actions" style={{ marginTop: 20 }}>
          <button className="bbva-btn-gray" onClick={() => { reset() }}>Nueva solicitud</button>
          <button className="bbva-btn" onClick={() => navigate('/inicio')}>Ir al inicio</button>
        </div>
      </Card>
    </PageLayout>
  )

  /* ── Vista principal (simulador + formulario) ── */
  return (
    <PageLayout>
      <button className="hb-back" onClick={() => navigate('/operaciones')}>
        <ArrowLeft size={16} /> Volver a Operaciones
      </button>
      <h1 className="bbva-page-title">Solicitud de Préstamo</h1>
      <p className="bbva-page-sub">Simula tu cuota y solicita tu crédito en minutos</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>

        {/* ════════ COLUMNA IZQUIERDA: Simulador ════════ */}
        <div style={{ display: 'grid', gap: 20 }}>
          <Card title="Simulador de préstamo" icon={<Calculator size={18} />}>

            {/* Slider de monto */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ fontWeight: 700, fontSize: 14 }}>Monto del préstamo</label>
                <span style={{ fontWeight: 800, fontSize: 20, color: SOL_COLOR }}>{fmt(monto)}</span>
              </div>
              <input type="range" style={{ width: '100%', accentColor: SOL_COLOR }}
                min={1000} max={100000} step={500} value={monto}
                onChange={(e) => setMonto(Number(e.target.value))} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--hb-muted)' }}>
                <span>S/ 1,000</span><span>S/ 100,000</span>
              </div>
            </div>

            {/* Plazo y Tasa */}
            <div className="hb-grid-2" style={{ marginBottom: 20 }}>
              <div className="hb-field">
                <label>Plazo en meses</label>
                <select className="hb-select" value={plazo}
                  onChange={(e) => setPlazo(Number(e.target.value))}>
                  {PLAZOS.map((p) => <option key={p} value={p}>{p} meses</option>)}
                </select>
              </div>
              <div className="hb-field">
                <label>Tasa de interés anual</label>
                <select className="hb-select" value={tasa}
                  onChange={(e) => setTasa(Number(e.target.value))}>
                  {TASAS.map((t) => <option key={t.val} value={t.val}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {/* Resultado del simulador */}
            <div style={{
              background: 'var(--hb-grad)', borderRadius: 12, padding: '20px 16px',
              color: '#fff', textAlign: 'center', marginBottom: 16,
            }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, opacity: .8 }}>Cuota mensual estimada</p>
              <p style={{ margin: '0 0 16px', fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>
                {fmt(cuota)}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, opacity: .7 }}>Total a pagar</p>
                  <p style={{ margin: 0, fontWeight: 700 }}>{fmt(totalPagar)}</p>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,.25)' }} />
                <div>
                  <p style={{ margin: 0, fontSize: 11, opacity: .7 }}>Total intereses</p>
                  <p style={{ margin: 0, fontWeight: 700 }}>{fmt(totalInteres)}</p>
                </div>
              </div>
            </div>

            {/* Gráfico de distribución */}
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--hb-muted)', marginBottom: 6 }}>
              Distribución del pago total
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORES[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>

            {/* Botón tabla de amortización */}
            <button
              style={{
                width: '100%', marginTop: 12, padding: '9px 0', borderRadius: 8,
                border: `1.5px solid ${SOL_COLOR}`, background: 'transparent',
                color: SOL_COLOR, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
              onClick={() => setShowTabla((v) => !v)}
            >
              {showTabla ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showTabla ? 'Ocultar tabla de amortización' : 'Ver tabla de amortización'}
            </button>

            {/* Tabla de amortización expandible */}
            {showTabla && (
              <div ref={tablaRef} id="seccionAmortizacion" style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--hb-muted)', marginBottom: 8 }}>
                  Préstamo: {fmt(monto)} · {plazo} cuotas · Tasa {tasa}% anual · Cuota {fmt(cuota)}
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--hb-border)', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                        {['Cuota', 'Capital', 'Interés', 'Total', 'Saldo'].map((h) => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700,
                            borderBottom: '1px solid var(--hb-border)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tabla.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>{row.nro}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmt(row.capital)}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', color: '#d97706' }}>{fmt(row.interes)}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>{fmt(row.cuota)}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--hb-muted)' }}>{fmt(row.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={descargarTabla}
                  style={{
                    marginTop: 8, padding: '7px 14px', borderRadius: 6, border: '1px solid #d1d5db',
                    background: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Download size={14} /> Imprimir / Guardar PDF
                </button>
              </div>
            )}
          </Card>

          {/* Contacto / Ayuda */}
          <Card title="¿Necesitas ayuda?" icon={<HeadphonesIcon size={18} />}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
              {[
                { Icon: Phone, color: '#16a34a', label: '0800-00-000', sub: 'Línea gratuita (Lun–Vie 8am–8pm)' },
                { Icon: Phone, color: '#2563eb', label: '(01) 615-0000', sub: 'Lima y provincias' },
                { Icon: MessageCircle, color: '#16a34a', label: '+51 999 000 000', sub: 'WhatsApp (24/7)' },
                { Icon: Mail, color: '#d97706', label: 'clientes@scotiabank.com.pe', sub: 'Correo electrónico' },
              ].map(({ Icon, color, label, sub }) => (
                <li key={label} style={{ display: 'flex', gap: 10, alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--hb-border)' }}>
                  <Icon size={18} color={color} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>{label}</strong>
                    <span style={{ color: 'var(--hb-muted)', marginLeft: 6 }}>— {sub}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ════════ COLUMNA DERECHA: Formulario ════════ */}
        <div style={{ display: 'grid', gap: 20 }}>
          <Card title="Formulario de solicitud" icon={<FileText size={18} />}>

            {/* Alerta de capacidad de pago */}
            {alertaPago && (
              <div style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8,
                padding: '10px 14px', marginBottom: 16, fontSize: 13,
              }}>
                <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Tu cuota estimada ({fmt(cuota)}) representa el{' '}
                  <strong>{pctIngreso.toFixed(0)}% de tu ingreso mensual</strong>.
                  Se recomienda que no supere el 30%. Considera reducir el monto o ampliar el plazo.
                </span>
              </div>
            )}

            {error && <Alert tipo="error">{error}</Alert>}
            {validacion && <Alert tipo="warn">{validacion}</Alert>}

            {/* Botón para sincronizar simulador → form */}
            <button
              type="button" id="formSolicitud"
              onClick={usarSimulador}
              style={{
                width: '100%', marginBottom: 16, padding: '10px 0', borderRadius: 8,
                background: 'var(--hb-red-light)', border: `1.5px dashed ${SOL_COLOR}`,
                color: SOL_COLOR, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <TrendingUp size={16} /> Usar valores del simulador
            </button>

            <form onSubmit={onSubmit}>
              {/* Datos del simulador (pre-llenados) */}
              <div className="hb-grid-2">
                <div className="hb-field">
                  <label>Monto solicitado (S/)</label>
                  <input className="hb-input" type="number" min="1" step="0.01"
                    placeholder="0.00" value={form.montosolicitud}
                    onChange={setF('montosolicitud')} required />
                </div>
                <div className="hb-field">
                  <label>Plazo (meses)</label>
                  <input className="hb-input" type="number" min="1" step="1"
                    placeholder="12" value={form.plazo}
                    onChange={setF('plazo')} required />
                </div>
              </div>

              <div className="hb-grid-2">
                <div className="hb-field">
                  <label>Tipo de crédito</label>
                  <select className="hb-select" value={form.codtipocredito} onChange={setF('codtipocredito')}>
                    <option value="CO">CO — Consumo</option>
                    <option value="ME">ME — Microempresa</option>
                  </select>
                </div>
                <div className="hb-field">
                  <label>Ingreso neto mensual (S/)</label>
                  <input className="hb-input" type="number" min="0" step="0.01"
                    placeholder="0.00" value={form.montoingresoneto}
                    onChange={(e) => { setF('montoingresoneto')(e); setIngresos(e.target.value) }}
                    required />
                </div>
              </div>

              <div className="hb-field">
                <label>Propósito del préstamo</label>
                <select className="hb-select" value={form.codactividadeconomica}
                  onChange={setF('codactividadeconomica')} required>
                  {ACTIVIDADES.map((a) => (
                    <option key={a.cod} value={a.cod}>{a.label}</option>
                  ))}
                </select>
              </div>

              {/* Cuota estimada si el form tiene datos válidos */}
              {toNumber(form.montosolicitud) > 0 && parseInt(form.plazo) > 0 && (
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16,
                }}>
                  <Banknote size={15} color="#16a34a" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Cuota mensual estimada:{' '}
                  <strong style={{ color: '#16a34a' }}>
                    {fmt(calcularCuota(toNumber(form.montosolicitud), tasa, parseInt(form.plazo) || 1))}
                  </strong>
                </div>
              )}

              <button type="submit" className="bbva-btn" disabled={loading}
                style={{ width: '100%', justifyContent: 'center' }}>
                <FilePlus2 size={18} />
                {loading ? 'Enviando solicitud…' : 'Enviar solicitud'}
              </button>

              <p style={{ fontSize: 11, color: 'var(--hb-muted)', marginTop: 10, textAlign: 'center' }}>
                Al enviar, confirmas que los datos son correctos y aceptas los términos del crédito.
              </p>
            </form>
          </Card>
        </div>

      </div>
    </PageLayout>
  )
}
