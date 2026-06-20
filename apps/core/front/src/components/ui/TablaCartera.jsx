import { useNavigate } from 'react-router-dom'
import { money, num } from '../../utils/format.js'
import Semaforo from './Semaforo.jsx'

/**
 * Tabla de cartera de un asesor (endpoint /creditos/cartera).
 * Ordenada por backend por días de atraso desc. Click → detalle del crédito.
 */
export default function TablaCartera({ cartera = [] }) {
  const navigate = useNavigate()

  if (!cartera.length) {
    return <p className="page-subtitle">No hay créditos en la cartera.</p>
  }

  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Crédito</th>
          <th>Cliente</th>
          <th className="num">Saldo capital</th>
          <th className="num">Vigente</th>
          <th className="num">Vencido</th>
          <th className="num">Días atraso</th>
          <th>Calificación</th>
        </tr>
      </thead>
      <tbody>
        {cartera.map((c) => (
          <tr
            key={c.codcuentacredito}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/creditos/${c.codcuentacredito}`)}
          >
            <td>{c.codcuentacredito}</td>
            <td>{c.nomcliente}</td>
            <td className="num">{money(c.montosaldocapital)}</td>
            <td className="num">{money(c.car_vig_capital)}</td>
            <td className="num">{money(c.car_ven_capital)}</td>
            <td className="num" style={{ color: c.diasatrasocredito > 30 ? '#D11218' : c.diasatrasocredito > 0 ? '#d97706' : 'inherit', fontWeight: c.diasatrasocredito > 0 ? 700 : 400 }}>
              {num(c.diasatrasocredito)}
            </td>
            <td>
              <Semaforo
                estado={
                  c.diasatrasocredito > 30
                    ? 'ROJO'
                    : c.diasatrasocredito > 0
                      ? 'AMARILLO'
                      : 'VERDE'
                }
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
