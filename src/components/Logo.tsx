/**
 * Το λογότυπο: μια τούρτα με τρία κεράκια.
 *
 * Είναι inline SVG και όχι emoji, ώστε να δείχνει το ίδιο σε κάθε
 * συσκευή και να παίρνει τα χρώματα της εφαρμογής. Η φλόγα τρεμοπαίζει
 * διακριτικά — και σταματά αν ο χρήστης έχει ζητήσει λιγότερη κίνηση.
 */
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      className="logo"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Γενεθλιολόγιο"
    >
      {/* κεράκια */}
      <g className="candles">
        <rect x="13" y="14" width="2.4" height="9" rx="1.2" fill="var(--candle)" />
        <rect x="22.8" y="11" width="2.4" height="12" rx="1.2" fill="var(--candle-2)" />
        <rect x="32.6" y="14" width="2.4" height="9" rx="1.2" fill="var(--candle)" />
      </g>

      {/* φλόγες */}
      <g className="flames" fill="var(--flame)">
        <ellipse cx="14.2" cy="11" rx="1.9" ry="2.9" />
        <ellipse cx="24" cy="8" rx="1.9" ry="2.9" />
        <ellipse cx="33.8" cy="11" rx="1.9" ry="2.9" />
      </g>

      {/* πάνω στρώση */}
      <path
        d="M8 26c0-2.2 1.8-4 4-4h24c2.2 0 4 1.8 4 4v3H8v-3z"
        fill="var(--icing)"
      />
      {/* σταγόνες γλάσου */}
      <path
        d="M8 29h32v2.4c-2.7 0-2.7 2.2-5.3 2.2s-2.7-2.2-5.4-2.2-2.7 2.2-5.3 2.2-2.7-2.2-5.3-2.2S16 33.8 13.3 33.8 10.7 31.4 8 31.4V29z"
        fill="var(--icing)"
      />
      {/* κάτω στρώση */}
      <path
        d="M9 33h30c1.7 0 3 1.3 3 3v4c0 1.7-1.3 3-3 3H9c-1.7 0-3-1.3-3-3v-4c0-1.7 1.3-3 3-3z"
        fill="var(--cake)"
      />
      {/* ζαχαρωτά */}
      <circle cx="15" cy="38" r="1.4" fill="var(--sprinkle-a)" />
      <circle cx="24" cy="39.5" r="1.4" fill="var(--sprinkle-b)" />
      <circle cx="33" cy="38" r="1.4" fill="var(--sprinkle-c)" />
    </svg>
  );
}
