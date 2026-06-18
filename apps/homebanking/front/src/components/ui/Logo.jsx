/**
 * Logo de marca Scotiabank — wordmark rojo institucional con punto, sin isotipo.
 * Coherente con la identidad visual real de Scotiabank (tipografía bold, rojo #D11218).
 *
 * @param {Object} props
 * @param {number}  [props.size=44]          Tamaño de referencia (controla escala del texto).
 * @param {boolean} [props.wordmark=true]    (Se mantiene por compatibilidad; siempre se muestra el texto).
 * @param {'dark'|'light'} [props.variant='dark'] Color del texto: 'dark' = rojo sobre fondo claro, 'light' = blanco sobre fondo rojo/oscuro.
 * @param {string}  [props.subtitle='BANCA POR INTERNET'] Texto secundario bajo el nombre.
 */
export default function Logo({
  size = 44,
  variant = 'dark',
  subtitle = 'BANCA POR INTERNET',
}) {
  const textColor = variant === 'light' ? '#ffffff' : '#D11218'
  const dotColor = variant === 'light' ? 'rgba(255,255,255,.55)' : '#c9c9c9'
  const subColor = variant === 'light' ? 'rgba(255,255,255,.85)' : '#6b6b6b'
  const nameSize = Math.round(size * 0.62)
  const subSize = Math.max(9, Math.round(size * 0.2))

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.04 }}>
      <span
        style={{
          fontWeight: 900,
          fontSize: nameSize,
          color: textColor,
          letterSpacing: '-0.5px',
        }}
      >
        Scotiabank<span style={{ color: dotColor }}>.</span>
      </span>
      {subtitle && (
        <span
          style={{
            fontSize: subSize,
            fontWeight: 700,
            color: subColor,
            letterSpacing: '1.2px',
          }}
        >
          {subtitle}
        </span>
      )}
    </span>
  )
}
