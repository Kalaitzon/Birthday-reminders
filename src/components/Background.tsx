import { useMemo } from 'react';

/**
 * Το φόντο: τουρτίτσες, κεράκια και κομφετί που ανεβαίνουν αργά.
 *
 * Τρεις αποφάσεις που κρατούν το εφέ διακριτικό αντί για κουραστικό:
 *  · Κινείται μόνο το `transform` (και το opacity), οπότε η δουλειά
 *    γίνεται στην κάρτα γραφικών και δεν "κολλάει" το scroll.
 *  · Οι θέσεις υπολογίζονται μία φορά με useMemo — αλλιώς κάθε
 *    πληκτρολόγηση στη φόρμα θα ξαναπετούσε τα στοιχεία από την αρχή.
 *  · `aria-hidden` και `pointer-events: none`: είναι διακόσμηση,
 *    δεν πρέπει να διαβάζεται ούτε να μπλοκάρει κλικ.
 *
 * Με `prefers-reduced-motion` το CSS σταματά την κίνηση εντελώς.
 */

const GLYPHS = ['🎂', '🕯️', '🎉', '✨', '🧁', '🎈', '🎊', '🍰'];
const COUNT = 18;

export default function Background() {
  const bits = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        glyph: GLYPHS[i % GLYPHS.length],
        left: (i * 37 + 5) % 96,          // απλωμένα οριζόντια, ντετερμινιστικά
        delay: -(i * 2.9) % 34,           // αρνητικό: ξεκινούν ήδη σκορπισμένα
        duration: 30 + ((i * 7) % 22),    // διαφορετική ταχύτητα το καθένα
        size: 15 + ((i * 5) % 16),
        drift: i % 2 === 0 ? 1 : -1,
      })),
    []
  );

  return (
    <div className="bg-scene" aria-hidden="true">
      <div className="bg-pearl" />
      {bits.map((b, i) => (
        <span
          key={i}
          className="bg-bit"
          style={{
            left: `${b.left}%`,
            fontSize: `${b.size}px`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            ['--drift' as string]: `${b.drift * 40}px`,
          }}
        >
          {b.glyph}
        </span>
      ))}
    </div>
  );
}
