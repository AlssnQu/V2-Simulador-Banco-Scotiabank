/**
 * SolicitarCreditoPage.jsx — Simulador + Solicitud de Crédito (estado unificado)
 *
 * Un solo estado controla monto, plazo, tasa e ingresos.
 * Cualquier cambio en el simulador o en el formulario se refleja en ambos lados
 * en tiempo real, sin botón de sincronización.
 */
import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Calculator, FileText, AlertTriangle, CheckCircle2,
  Clock, ChevronDown, ChevronUp, FilePlus2, HeadphonesIcon,
  Phone, MessageCircle, Mail, Banknote,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useSolicitudCredito } from '../hooks/useOperaciones.js'
import { toNumber } from '../utils/format.js'
import PageLayout from '../components/layout/PageLayout.jsx'
import Card from '../components/ui/Card.jsx'
import Money from '../components/ui/Money.jsx'
import Badge from '../components/ui/Badge.jsx'
import Alert from '../components/ui/Alert.jsx'

/* ── Constantes ──────────────────────────────────────────── */
const TASAS = [
  { val: 12,    label: '12.00 % — Con garantía' },
  { val: 18,    label: '18.00 % — Personal básico' },
  { val: 24,    label: '24.00 % — Personal estándar' },
  { val: 30,    label: '30.00 % — Libre disponibilidad' },
  { val: 40.92, label: '40.92 % — Microempresa c/ SD' },
  { val: 43.92, label: '43.92 % — Microempresa s/ SD' },
]
const PLAZOS         = [6, 12, 18, 24, 36, 48, 60]
const MONTO_MIN      = 1_000
const MONTO_MAX      = 150_000   // ampliado para cubrir montos reales Scotiabank
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
const COLORES  = ['#D11218', '#f3a0a3']
const SOL      = '#D11218'

/* ── Fórmulas financieras (TEA → TEM → cuota francesa) ───── */
const tem      = (tea) => Math.pow(1 + tea / 100, 1 / 12) - 1
const calcCuota = (monto, tea, meses) => {
  if (!monto || !meses) return 0
  const r = tem(tea)
  if (r === 0) return monto / meses
  return (monto * r * Math.pow(1 + r, meses)) / (Math.pow(1 + r, meses) - 1)
}
const generarTabla = (monto, tea, meses) => {
  const r     = tem(tea)
  const cuota = calcCuota(monto, tea, meses)
  let saldo   = monto
  return Array.from({ length: meses }, (_, i) => {
    const interes = saldo * r
    const capital = cuota - interes
    saldo = Math.max(0, saldo - capital)
    return { nro: i + 1, capital, interes, cuota, saldo }
  })
}
const fmt = (v) =>
  `S/ ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/* ── Etapas del proceso ──────────────────────────────────── */
const ETAPAS = [
  { key: 'recibida',   label: 'Solicitud recibida',  desc: 'Registramos tu solicitud en el sistema.' },
  { key: 'evaluacion', label: 'En evaluación',       desc: 'Nuestros analistas revisan tu perfil crediticio.' },
  { key: 'aprobacion', label: 'Aprobación',          desc: 'El Comité de Créditos emite su resolución.' },
  { key: 'desembolso', label: 'Desembolso',          desc: 'El importe se acredita en tu cuenta.' },
]

/* ══════════════════════════════════════════════════════════
   ESTADO UNIFICADO — todos los controles comparten estas vars
═══════════════════════════════════════════════════════════ */
export default function SolicitarCreditoPage() {
  const navigate = useNavigate()
  const { run, loading, error, result, reset } = useSolicitudCredito()
  const tablaRef = useRef(null)

  /* Un solo grupo de estado para simulador + formulario */
  const [monto,     setMonto]     = useState(5000)
  const [montoText, setMontoText] = useState('5000')   // texto del input numérico
  const [plazo,     setPlazo]     = useState(12)
  const [tasa,      setTasa]      = useState(24)
  const [ingresos,  setIngresos]  = useState('')

  /* Sólo para el formulario de solicitud */
  const [tipo,       setTipo]      = useState('CO')
  const [actividad,  setActividad] = useState('4711')
  const [validacion, setValidacion]= useState(null)
  const [showTabla,  setShowTabla] = useState(false)

  /* ── Cálculos reactivos ── */
  const cuota        = useMemo(() => calcCuota(monto, tasa, plazo), [monto, tasa, plazo])
  const totalPagar   = useMemo(() => cuota * plazo,        [cuota, plazo])
  const totalInteres = useMemo(() => totalPagar - monto,   [totalPagar, monto])
  const tabla        = useMemo(() => generarTabla(monto, tasa, plazo), [monto, tasa, plazo])
  const pieData      = useMemo(() => [
    { name: 'Capital',    value: monto },
    { name: 'Intereses',  value: totalInteres },
  ], [monto, totalInteres])

  const ingresosNum = parseFloat(ingresos) || 0
  const pctIngreso  = ingresosNum > 0 ? (cuota / ingresosNum) * 100 : 0
  const alertaPago  = ingresosNum > 0 && pctIngreso > 30

  /* ── Handlers sincronizados ── */

  // Slider → actualiza monto y el texto del input
  const onSlider = (e) => {
    const v = Number(e.target.value)
    setMonto(v)
    setMontoText(String(v))
  }

  // Input numérico de monto → actualiza el slider y los cálculos
  const onMontoText = (e) => {
    const raw = e.target.value
    setMontoText(raw)
    const v = parseFloat(raw)
    if (!isNaN(v) && v >= MONTO_MIN && v <= MONTO_MAX) setMonto(v)
  }

  // Si el usuario ingresa un monto fuera del rango del slider, lo clampea al salir
  const onMontoBlur = () => {
    const v = parseFloat(montoText)
    if (isNaN(v) || v < MONTO_MIN) { setMonto(MONTO_MIN); setMontoText(String(MONTO_MIN)) }
    else if (v > MONTO_MAX)        { setMonto(MONTO_MAX); setMontoText(String(MONTO_MAX)) }
    else                           { setMonto(v);          setMontoText(String(v)) }
  }

  /* ── Submit ── */
  const onSubmit = async (e) => {
    e.preventDefault()
    setValidacion(null)
    if (!monto || monto <= 0)      { setValidacion('Ingresa un monto válido.'); return }
    if (!plazo || plazo <= 0)      { setValidacion('Selecciona un plazo.'); return }
    if (ingresosNum <= 0)          { setValidacion('Ingresa tu ingreso neto mensual.'); return }
    try {
      await run({
        montosolicitud:        monto,
        plazo,
        codtipocredito:        tipo,
        codactividadeconomica: actividad,
        montoingresoneto:      ingresosNum,
      })
    } catch { /* error manejado por el hook */ }
  }

  /* ── Pantalla de éxito ── */
  if (result) return (
    <PageLayout>
      <button className="hb-back" onClick={() => navigate('/inicio')}>
        <ArrowLeft size={16} /> Volver al inicio
      </button>
      <Card>
        <div style={{ textAlign: 'center' }}>
          <CheckCircle2 size={56} color="#16a34a" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ marginTop: 0 }}>¡Solicitud enviada!</h3>
          <p>Tu solicitud de préstamo fue registrada exitosamente.</p>

          <div className="hb-dl" style={{ maxWidth: 380, margin: '0 auto 20px', textAlign: 'left' }}>
            <dl>
              <div><dt>N° Solicitud</dt>
                <dd style={{ fontFamily: 'monospace', color: SOL, fontWeight: 700 }}>
                  {result.codsolicitud}
                </dd>
              </div>
              <div><dt>Estado</dt><dd><Badge estado={result.estado} /></dd></div>
              <div><dt>Monto solicitado</dt><dd><Money value={result.montosolicitud} /></dd></div>
              <div><dt>Plazo</dt><dd>{result.plazo} cuotas</dd></div>
            </dl>
          </div>

          <div style={{ maxWidth: 360, margin: '0 auto 20px', textAlign: 'left' }}>
            <p style={{ fontSize: 13, color: 'var(--hb-muted)', marginBottom: 10 }}>Etapas del proceso:</p>
            {ETAPAS.map((et, idx) => {
              const st = idx === 0 ? 'ok' : idx === 1 ? 'act' : 'pend'
              return (
                <div key={et.key}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0' }}>
                    <span style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                      background: st==='ok'?'#d1fae5':st==='act'?'#fef3c7':'#f3f4f6',
                      color:      st==='ok'?'#065f46':st==='act'?'#92400e':'#9ca3af',
                    }}>{st==='ok'?'✓':st==='act'?'●':'○'}</span>
                    <div>
                      <p style={{ margin:0, fontWeight:600, fontSize:13 }}>{et.label}</p>
                      <p style={{ margin:0, fontSize:12, color:'var(--hb-muted)' }}>{et.desc}</p>
                    </div>
                  </div>
                  {idx < ETAPAS.length-1 && <div style={{ width:2, height:14, background: idx===0?'#6ee7b7':'#e5e7eb', marginLeft:14 }} />}
                </div>
              )
            })}
          </div>

          <p style={{ fontSize:12, color:'var(--hb-muted)' }}>
            <Clock size={14} style={{ verticalAlign:'middle', marginRight:4 }} />
            El proceso de evaluación toma entre 24 y 48 horas hábiles.
          </p>
          <div style={{ background:'#f0f9ff', borderRadius:8, padding:'10px 14px', fontSize:13, textAlign:'left', marginTop:12 }}>
            <strong style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <HeadphonesIcon size={15} /> ¿Alguna duda?
            </strong>
            <span>Llama al <strong>0800-00-000</strong> (gratuito) · Lun–Vie 8am–8pm</span>
          </div>
        </div>
        <div className="bbva-form-actions" style={{ marginTop:20 }}>
          <button className="bbva-btn-gray" onClick={reset}>Nueva solicitud</button>
          <button className="bbva-btn" onClick={() => navigate('/inicio')}>Ir al inicio</button>
        </div>
      </Card>
    </PageLayout>
  )

  /* ── Vista principal ── */
  return (
    <PageLayout>
      <button className="hb-back" onClick={() => navigate('/operaciones')}>
        <ArrowLeft size={16} /> Volver a Operaciones
      </button>
      <h1 className="bbva-page-title">Solicitud de Préstamo</h1>
      <p className="bbva-page-sub">Ajusta los parámetros — simulador y formulario se actualizan juntos</p>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:24 }}>

        {/* ════ SIMULADOR ════ */}
        <Card title="Simulador de préstamo" icon={<Calculator size={18} />}>

          {/* ── Monto: slider + input numérico sincronizados ── */}
          <div style={{ marginBottom:20 }}>
            <label style={{ fontWeight:700, fontSize:14, display:'block', marginBottom:8 }}>
              Monto del préstamo
            </label>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
              {/* Input numérico — la fuente de verdad para el monto */}
              <div style={{ position:'relative', flexShrink:0 }}>
                <span style={{
                  position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
                  fontWeight:700, color: SOL, fontSize:14, pointerEvents:'none',
                }}>S/</span>
                <input
                  type="number"
                  min={MONTO_MIN} max={MONTO_MAX} step={100}
                  value={montoText}
                  onChange={onMontoText}
                  onBlur={onMontoBlur}
                  style={{
                    paddingLeft:32, paddingRight:8, paddingTop:8, paddingBottom:8,
                    width:130, border:'2px solid var(--hb-border)', borderRadius:8,
                    fontSize:15, fontWeight:700, color: SOL,
                    outline:'none',
                  }}
                  onFocus={(e) => e.target.style.borderColor = SOL}
                />
              </div>
              {/* Slider sincronizado */}
              <input type="range" style={{ flex:1, accentColor: SOL }}
                min={MONTO_MIN} max={MONTO_MAX} step={500}
                value={Math.min(Math.max(monto, MONTO_MIN), MONTO_MAX)}
                onChange={onSlider} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--hb-muted)' }}>
              <span>S/ 1,000</span><span>S/ 150,000</span>
            </div>
          </div>

          {/* ── Plazo, TEA e Ingresos — todos en una grilla 3 columnas ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>

            <div className="hb-field">
              <label>Plazo (meses)</label>
              <select className="hb-select" value={plazo}
                onChange={(e) => setPlazo(Number(e.target.value))}>
                {PLAZOS.map((p) => <option key={p} value={p}>{p} meses</option>)}
              </select>
            </div>

            <div className="hb-field">
              <label>TEA (Tasa Efectiva Anual)</label>
              <select className="hb-select" value={tasa}
                onChange={(e) => setTasa(Number(e.target.value))}>
                {TASAS.map((t) => <option key={t.val} value={t.val}>{t.label}</option>)}
              </select>
            </div>

            <div className="hb-field">
              <label>Ingreso neto mensual (S/)</label>
              <input className="hb-input" type="number" min="0" step="0.01"
                placeholder="Ej. 2000.00"
                value={ingresos}
                onChange={(e) => setIngresos(e.target.value)} />
            </div>

          </div>

          {/* ── Alerta capacidad de pago ── */}
          {alertaPago && (
            <div style={{
              display:'flex', gap:10, alignItems:'flex-start',
              background:'#fffbeb', border:'1px solid #fbbf24', borderRadius:8,
              padding:'10px 14px', marginBottom:16, fontSize:13,
            }}>
              <AlertTriangle size={18} color="#d97706" style={{ flexShrink:0, marginTop:1 }} />
              <span>
                Tu cuota estimada ({fmt(cuota)}) representa el{' '}
                <strong>{pctIngreso.toFixed(0)}% de tu ingreso mensual</strong>.
                Se recomienda que no supere el 30%. Considera reducir el monto o ampliar el plazo.
              </span>
            </div>
          )}

          {/* ── Resultado visual ── */}
          <div style={{
            background:'var(--hb-grad)', borderRadius:12, padding:'20px 16px',
            color:'#fff', textAlign:'center', marginBottom:16,
          }}>
            <p style={{ margin:'0 0 4px', fontSize:13, opacity:.8 }}>Cuota mensual estimada</p>
            <p style={{ margin:'0 0 16px', fontSize:38, fontWeight:900, letterSpacing:-1 }}>
              {fmt(cuota)}
            </p>
            <div style={{ display:'flex', justifyContent:'space-around' }}>
              <div>
                <p style={{ margin:0, fontSize:11, opacity:.7 }}>Total a pagar</p>
                <p style={{ margin:0, fontWeight:700 }}>{fmt(totalPagar)}</p>
              </div>
              <div style={{ width:1, background:'rgba(255,255,255,.25)' }} />
              <div>
                <p style={{ margin:0, fontSize:11, opacity:.7 }}>Total intereses</p>
                <p style={{ margin:0, fontWeight:700 }}>{fmt(totalInteres)}</p>
              </div>
              <div style={{ width:1, background:'rgba(255,255,255,.25)' }} />
              <div>
                <p style={{ margin:0, fontSize:11, opacity:.7 }}>TEM</p>
                <p style={{ margin:0, fontWeight:700 }}>{(tem(tasa)*100).toFixed(4)}%</p>
              </div>
            </div>
          </div>

          {/* ── Gráfico dona ── */}
          <p style={{ fontSize:13, fontWeight:600, color:'var(--hb-muted)', marginBottom:6 }}>
            Distribución del pago total
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORES[i]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize:12 }} />
            </PieChart>
          </ResponsiveContainer>

          {/* ── Tabla de amortización ── */}
          <button
            style={{
              width:'100%', marginTop:12, padding:'9px 0', borderRadius:8,
              border:`1.5px solid ${SOL}`, background:'transparent',
              color: SOL, fontWeight:700, fontSize:13, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}
            onClick={() => setShowTabla((v) => !v)}
          >
            {showTabla ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            {showTabla ? 'Ocultar tabla de amortización' : 'Ver tabla de amortización'}
          </button>

          {showTabla && (
            <div ref={tablaRef} style={{ marginTop:14 }}>
              <p style={{ fontSize:12, color:'var(--hb-muted)', marginBottom:8 }}>
                Monto: {fmt(monto)} · Plazo: {plazo} meses · TEA: {tasa}% · Cuota: {fmt(cuota)}
              </p>
              <div style={{ maxHeight:300, overflowY:'auto', border:'1px solid var(--hb-border)', borderRadius:8 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'#f9fafb', position:'sticky', top:0 }}>
                      {['Cuota','Capital','Interés','Total','Saldo'].map((h) => (
                        <th key={h} style={{ padding:'8px 10px', textAlign:'right', fontWeight:700,
                          borderBottom:'1px solid var(--hb-border)', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tabla.map((row, i) => (
                      <tr key={i} style={{ background: i%2===0?'#fff':'#fafafa' }}>
                        <td style={{ padding:'6px 10px', textAlign:'right', fontWeight:600 }}>{row.nro}</td>
                        <td style={{ padding:'6px 10px', textAlign:'right' }}>{fmt(row.capital)}</td>
                        <td style={{ padding:'6px 10px', textAlign:'right', color:'#d97706' }}>{fmt(row.interes)}</td>
                        <td style={{ padding:'6px 10px', textAlign:'right', fontWeight:600 }}>{fmt(row.cuota)}</td>
                        <td style={{ padding:'6px 10px', textAlign:'right', color:'var(--hb-muted)' }}>{fmt(row.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => window.print()}
                style={{ marginTop:8, padding:'7px 14px', borderRadius:6, border:'1px solid #d1d5db',
                  background:'#fff', fontSize:12, cursor:'pointer', fontWeight:600,
                  display:'flex', alignItems:'center', gap:6 }}>
                Imprimir / Guardar PDF
              </button>
            </div>
          )}
        </Card>

        {/* ════ FORMULARIO DE SOLICITUD ════ */}
        <Card title="Formulario de solicitud" icon={<FileText size={18} />}>

          {error      && <Alert tipo="error">{error}</Alert>}
          {validacion && <Alert tipo="warn">{validacion}</Alert>}

          {/* Resumen de lo que se va a solicitar — refleja el estado en vivo */}
          <div style={{
            background:'var(--hb-red-light)', border:`1px dashed ${SOL}`, borderRadius:8,
            padding:'12px 14px', marginBottom:16, fontSize:13,
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
              <span>📋 Monto: <strong style={{ color: SOL }}>{fmt(monto)}</strong></span>
              <span>📅 Plazo: <strong>{plazo} meses</strong></span>
              <span>📈 TEA: <strong>{tasa}%</strong></span>
              <span>💳 Cuota: <strong style={{ color: SOL }}>{fmt(cuota)}</strong></span>
            </div>
            <p style={{ margin:'8px 0 0', fontSize:11.5, color:'var(--hb-muted)' }}>
              Estos valores se actualizan en tiempo real con el simulador de arriba.
            </p>
          </div>

          <form onSubmit={onSubmit}>
            {/* Tipo de crédito y Actividad económica */}
            <div className="hb-grid-2" style={{ marginBottom:0 }}>
              <div className="hb-field">
                <label>Tipo de crédito</label>
                <select className="hb-select" value={tipo}
                  onChange={(e) => setTipo(e.target.value)}>
                  <option value="CO">CO — Consumo / Libre disponibilidad</option>
                  <option value="ME">ME — Microempresa</option>
                </select>
              </div>
              <div className="hb-field">
                <label>Propósito del préstamo</label>
                <select className="hb-select" value={actividad}
                  onChange={(e) => setActividad(e.target.value)} required>
                  {ACTIVIDADES.map((a) => (
                    <option key={a.cod} value={a.cod}>{a.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cuota estimada con el monto actual del formulario */}
            <div style={{
              background:'#f0fdf4', border:'1px solid #bbf7d0',
              borderRadius:8, padding:'10px 14px', fontSize:13, margin:'16px 0',
            }}>
              <Banknote size={15} color="#16a34a" style={{ verticalAlign:'middle', marginRight:6 }} />
              Cuota mensual con estos parámetros:{' '}
              <strong style={{ color:'#16a34a' }}>{fmt(cuota)}</strong>
              {ingresosNum > 0 && (
                <span style={{ marginLeft:8, color: pctIngreso > 30 ? '#d97706' : '#16a34a', fontWeight:600 }}>
                  ({pctIngreso.toFixed(0)}% de tu ingreso)
                </span>
              )}
            </div>

            <button type="submit" className="bbva-btn" disabled={loading}
              style={{ width:'100%', justifyContent:'center', marginTop:8 }}>
              <FilePlus2 size={18} />
              {loading ? 'Enviando solicitud…' : 'Enviar solicitud'}
            </button>

            <p style={{ fontSize:11, color:'var(--hb-muted)', marginTop:10, textAlign:'center' }}>
              Al enviar, confirmas que los datos son correctos y aceptas los términos del crédito.
            </p>
          </form>
        </Card>

        {/* ════ CONTACTO ════ */}
        <Card title="¿Necesitas ayuda?" icon={<HeadphonesIcon size={18} />}>
          <ul style={{ listStyle:'none', padding:0, margin:0, fontSize:13 }}>
            {[
              { Icon: Phone,         color:'#16a34a', label:'0800-00-000',              sub:'Línea gratuita (Lun–Vie 8am–8pm)' },
              { Icon: Phone,         color:'#2563eb', label:'(01) 615-0000',            sub:'Lima y provincias' },
              { Icon: MessageCircle, color:'#16a34a', label:'+51 999 000 000',          sub:'WhatsApp (24/7)' },
              { Icon: Mail,          color:'#d97706', label:'clientes@scotiabank.com.pe',sub:'Correo electrónico' },
            ].map(({ Icon, color, label, sub }) => (
              <li key={label} style={{ display:'flex', gap:10, alignItems:'center',
                padding:'10px 0', borderBottom:'1px solid var(--hb-border)' }}>
                <Icon size={18} color={color} style={{ flexShrink:0 }} />
                <div>
                  <strong>{label}</strong>
                  <span style={{ color:'var(--hb-muted)', marginLeft:6 }}>— {sub}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

      </div>
    </PageLayout>
  )
}