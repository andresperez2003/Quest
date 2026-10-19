import { useId } from 'react';
import { medalOf } from '../lib/medals.js';

const CX = 50;
const CY = 76;

function starPoints(outer, inner) {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(CX + r * Math.cos(a)).toFixed(1)},${(CY + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

// Medalla semanal en SVG. `tier` 0 es una semana sin medalla: un hueco punteado, sin mensaje negativo.
// `shine` hace pasar un destello (hoy hubo actividad); `dim` la apaga un poco (hoy todavía no).
export default function Medal({ tier, size = 64, shine = false, dim = false, label }) {
  const id = useId();
  const m = medalOf(tier);
  const name = label ?? (m ? `Medalla de ${m.name}` : 'Sin medalla');

  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 100 120"
      role="img"
      aria-label={name}
      className={`shrink-0 ${dim && m ? 'opacity-70 saturate-50' : ''}`}
    >
      {!m ? (
        <circle cx={CX} cy={CY} r="30" fill="none" stroke="var(--color-border)" strokeWidth="4" strokeDasharray="8 7" />
      ) : (
        <>
          <defs>
            <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={m.light} />
              <stop offset="0.5" stopColor={m.base} />
              <stop offset="1" stopColor={m.dark} />
            </linearGradient>
            <clipPath id={`${id}-disk`}>
              <circle cx={CX} cy={CY} r="32" />
            </clipPath>
          </defs>
          <path d="M72 2 H56 L40 48 H56 Z" fill={m.ribbon} />
          <path d="M72 2 H56 L40 48 H56 Z" fill="#000" opacity="0.25" />
          <path d="M28 2 H44 L60 48 H44 Z" fill={m.ribbon} />
          <circle cx={CX} cy={CY} r="32" fill={`url(#${id}-metal)`} stroke={m.dark} strokeWidth="3" />
          <circle cx={CX} cy={CY} r="24" fill="none" stroke={m.light} strokeWidth="2" opacity="0.7" />
          {tier === 5 ? (
            <path d={`M${CX - 13} ${CY - 5} L${CX - 7} ${CY - 12} H${CX + 7} L${CX + 13} ${CY - 5} L${CX} ${CY + 13} Z`} fill={m.dark} opacity="0.8" />
          ) : (
            <polygon points={starPoints(14, 6)} fill={m.dark} opacity="0.75" />
          )}
          {shine && (
            <g clipPath={`url(#${id}-disk)`}>
              <rect x="-10" y="30" width="14" height="95" fill="#fff" opacity="0.5" className="animate-shine" />
            </g>
          )}
        </>
      )}
    </svg>
  );
}
