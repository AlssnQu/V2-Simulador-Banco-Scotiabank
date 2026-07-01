export default function Logo({ size = 44, wordmark = true, variant = "dark" }) {
  const textColor = variant === "light" ? "#ffffff" : "#E31937";
  const subColor =
    variant === "light" ? "rgba(255,255,255,.8)" : "#6b6b7b";

  const nameSize = Math.round(size * 0.48);
  const subSize = Math.max(9, Math.round(size * 0.22));

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Círculo principal */}
        <circle cx="24" cy="24" r="20" fill="#E31937" />

        {/* Elemento decorativo */}
        <path
          d="M15 24c0-5 4-9 9-9h9v4h-8c-3 0-5 2-5 5s2 5 5 5h8v4h-9c-5 0-9-4-9-9z"
          fill="#ffffff"
        />
      </svg>

      {wordmark && (
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            lineHeight: 1,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: nameSize,
              color: textColor,
            }}
          >
            Banco Andino
          </span>

          <span
            style={{
              fontSize: subSize,
              color: subColor,
              fontWeight: 600,
              letterSpacing: "1px",
            }}
          >
            CORE FINANCIERO
          </span>
        </span>
      )}
    </span>
  );
}