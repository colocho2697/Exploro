'use client';

import React from 'react';

interface BackpackerLoaderProps {
  message?: string;
  submessage?: string;
  size?: 'small' | 'medium' | 'large';
  compact?: boolean;
}

export function BackpackerLoader({
  message = 'Explorando la zona…',
  submessage = 'Buscando las mejores recomendaciones verificadas',
  size = 'medium',
  compact = false,
}: BackpackerLoaderProps): React.JSX.Element {
  const scale = size === 'small' ? 0.7 : size === 'large' ? 1.25 : 1;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compact ? '1rem' : '2.5rem 1.5rem',
        textAlign: 'center',
        background: '#ffffff',
        borderRadius: '1.25rem',
        border: '1.5px dashed #cbd5e1',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        margin: '0.5rem 0',
      }}
    >
      <style>{`
        @keyframes backpacker-bob {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(-1.5deg); }
        }
        @keyframes backpacker-leg-left {
          0%, 100% { transform: rotate(24deg); }
          50% { transform: rotate(-24deg); }
        }
        @keyframes backpacker-leg-right {
          0%, 100% { transform: rotate(-24deg); }
          50% { transform: rotate(24deg); }
        }
        @keyframes backpacker-arm-pole {
          0%, 100% { transform: rotate(-18deg); }
          50% { transform: rotate(20deg); }
        }
        @keyframes backpacker-pack-wobble {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-3deg); }
        }
        @keyframes backpacker-trail {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -32; }
        }
        @keyframes backpacker-dust {
          0% { opacity: 0; transform: scale(0.4) translateX(0); }
          50% { opacity: 0.6; }
          100% { opacity: 0; transform: scale(1.1) translateX(-18px); }
        }
        @keyframes backpacker-pin-float {
          0%, 100% { transform: translateY(0px); opacity: 0.9; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>

      {/* SVG ANIMADO DEL HOMBRECITO MOCHILERO */}
      <div style={{ position: 'relative', width: 140 * scale, height: 140 * scale }}>
        <svg
          viewBox="0 0 160 160"
          width={140 * scale}
          height={140 * scale}
          style={{ overflow: 'visible' }}
        >
          {/* Suelo y rastro de senderismo con movimiento */}
          <line
            x1="15"
            y1="138"
            x2="145"
            y2="138"
            stroke="#e2e8f0"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            x1="25"
            y1="138"
            x2="135"
            y2="138"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeDasharray="6 10"
            strokeLinecap="round"
            style={{ animation: 'backpacker-trail 0.85s linear infinite' }}
          />

          {/* Polvillo bajo las botas */}
          <circle
            cx="48"
            cy="134"
            r="3.5"
            fill="#cbd5e1"
            style={{ animation: 'backpacker-dust 0.85s ease-out infinite' }}
          />
          <circle
            cx="42"
            cy="136"
            r="2.5"
            fill="#94a3b8"
            style={{ animation: 'backpacker-dust 0.85s ease-out infinite 0.4s' }}
          />

          {/* Pin flotante de destino al frente */}
          <g
            transform="translate(122, 45)"
            style={{ animation: 'backpacker-pin-float 1.8s ease-in-out infinite' }}
          >
            <path
              d="M0 0 C-6 -6 -10 -13 -10 -20 C-10 -28 -3 -34 5 -34 C13 -34 20 -28 20 -20 C20 -13 16 -6 10 0 L5 8 Z"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <circle cx="5" cy="-20" r="4" fill="#ffffff" />
          </g>

          {/* GRUPO PRINCIPAL DEL MOCHILERO (Bobbing vertical) */}
          <g style={{ animation: 'backpacker-bob 0.85s ease-in-out infinite' }}>
            {/* PIERNA TRASERA */}
            <g
              style={{
                transformOrigin: '76px 105px',
                animation: 'backpacker-leg-left 0.85s ease-in-out infinite',
              }}
            >
              {/* Muslo */}
              <line
                x1="76"
                y1="105"
                x2="66"
                y2="122"
                stroke="#1e293b"
                strokeWidth="7"
                strokeLinecap="round"
              />
              {/* Pantorrilla y bota */}
              <line
                x1="66"
                y1="122"
                x2="60"
                y2="135"
                stroke="#334155"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M56 135 L68 135 L70 138 L54 138 Z"
                fill="#78350f"
                stroke="#451a03"
                strokeWidth="1"
              />
            </g>

            {/* MOCHILA DE VIAJE (Con esterilla/saco arriba y wobble) */}
            <g
              style={{
                transformOrigin: '56px 82px',
                animation: 'backpacker-pack-wobble 0.85s ease-in-out infinite',
              }}
            >
              {/* Cuerpo de la mochila */}
              <rect
                x="42"
                y="65"
                width="24"
                height="34"
                rx="6"
                fill="#ea580c"
                stroke="#c2410c"
                strokeWidth="2"
              />
              {/* Bolsillo frontal de la mochila */}
              <rect
                x="38"
                y="74"
                width="12"
                height="18"
                rx="3"
                fill="#f97316"
                stroke="#c2410c"
                strokeWidth="1.5"
              />
              {/* Esterilla / sleeping bag enrollado encima de la mochila */}
              <rect
                x="40"
                y="55"
                width="28"
                height="11"
                rx="5"
                fill="#0284c7"
                stroke="#0369a1"
                strokeWidth="1.5"
              />
              <line x1="48" y1="55" x2="48" y2="66" stroke="#0369a1" strokeWidth="1.5" />
              <line x1="60" y1="55" x2="60" y2="66" stroke="#0369a1" strokeWidth="1.5" />
              {/* Botella de agua lateral */}
              <rect
                x="39"
                y="80"
                width="5"
                height="12"
                rx="2"
                fill="#38bdf8"
              />
            </g>

            {/* TORSO / CAMISETA VERDE EXPLORO */}
            <path
              d="M66 70 L92 70 L88 104 L70 104 Z"
              fill="#10b981"
              stroke="#059669"
              strokeWidth="2"
            />
            {/* Tirantes de la mochila sobre el pecho */}
            <path
              d="M71 70 L72 104"
              stroke="#ea580c"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M84 70 L83 104"
              stroke="#ea580c"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Correa pectoral con brújula */}
            <line x1="72" y1="84" x2="83" y2="84" stroke="#c2410c" strokeWidth="2.5" />
            <circle cx="77" cy="84" r="3.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />

            {/* PIERNA DELANTERA */}
            <g
              style={{
                transformOrigin: '82px 105px',
                animation: 'backpacker-leg-right 0.85s ease-in-out infinite',
              }}
            >
              {/* Muslo */}
              <line
                x1="82"
                y1="105"
                x2="94"
                y2="121"
                stroke="#0f172a"
                strokeWidth="7"
                strokeLinecap="round"
              />
              {/* Pantorrilla y bota */}
              <line
                x1="94"
                y1="121"
                x2="102"
                y2="135"
                stroke="#1e293b"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M98 135 L112 135 L114 138 L96 138 Z"
                fill="#92400e"
                stroke="#451a03"
                strokeWidth="1"
              />
            </g>

            {/* CABEZA, ROSTRO Y SOMBRERO MOCHILERO */}
            {/* Cuello */}
            <rect x="76" y="62" width="7" height="9" fill="#fbcfe8" rx="2" />
            {/* Cabeza */}
            <circle cx="80" cy="54" r="12" fill="#fed7aa" stroke="#f97316" strokeWidth="1" />
            {/* Gafas de explorador oscuras */}
            <rect x="80" y="49" width="12" height="6" rx="2.5" fill="#0f172a" />
            <line x1="78" y1="52" x2="80" y2="52" stroke="#0f172a" strokeWidth="1.5" />
            {/* Sonrisa alegre */}
            <path
              d="M82 59 Q87 63 91 59"
              fill="none"
              stroke="#9a3412"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Sombrero de explorador / safari con ala */}
            <ellipse cx="80" cy="45" rx="19" ry="5.5" fill="#ca8a04" stroke="#a16207" strokeWidth="1.5" />
            <path
              d="M68 45 C68 34 73 31 80 31 C87 31 92 34 92 45 Z"
              fill="#eab308"
              stroke="#a16207"
              strokeWidth="1.5"
            />
            {/* Cinta marrón del sombrero */}
            <path
              d="M69 43 Q80 46 91 43"
              fill="none"
              stroke="#78350f"
              strokeWidth="2.5"
            />

            {/* BRAZO DELANTERO Y BASTÓN DE SENDERISMO (Trekking Pole) */}
            <g
              style={{
                transformOrigin: '84px 74px',
                animation: 'backpacker-arm-pole 0.85s ease-in-out infinite',
              }}
            >
              {/* Brazo */}
              <line
                x1="84"
                y1="74"
                x2="98"
                y2="92"
                stroke="#fed7aa"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <circle cx="98" cy="92" r="3.5" fill="#fed7aa" />
              {/* Bastón de trekking (aluminio + empuñadura) */}
              <line
                x1="97"
                y1="78"
                x2="108"
                y2="138"
                stroke="#475569"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Mango del bastón */}
              <line
                x1="96"
                y1="78"
                x2="98"
                y2="90"
                stroke="#0f172a"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              {/* Roseta de la punta del bastón */}
              <circle cx="106" cy="133" r="3" fill="#0f172a" />
            </g>
          </g>
        </svg>
      </div>

      {/* MENSAJES Y DETALLE */}
      <div style={{ marginTop: '0.75rem' }}>
        <h3
          style={{
            fontSize: size === 'small' ? '0.9rem' : '1.08rem',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.01em',
            margin: 0,
          }}
        >
          {message}
        </h3>
        {submessage && (
          <p
            style={{
              fontSize: size === 'small' ? '0.75rem' : '0.82rem',
              color: '#64748b',
              marginTop: '0.25rem',
              fontWeight: 500,
              maxWidth: 320,
            }}
          >
            {submessage}
          </p>
        )}
      </div>
    </div>
  );
}
