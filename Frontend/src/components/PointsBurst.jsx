// "+10" que sube y se desvanece sobre el botón que lo contiene (el padre debe ser `relative`).
export default function PointsBurst({ points }) {
  return (
    <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 animate-rise font-bold text-accent">
      +{points}
    </span>
  );
}
