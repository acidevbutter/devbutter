type LogomarkProps = {
  width?: number;
  height?: number;
  className?: string;
};

// The flask (docs/design/assets/logomark.svg). Colors come from the tokens so
// the mark follows _tokens.scss instead of carrying its own hex values.
export default function Logomark({ width = 30, height = 34, className }: LogomarkProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 30 34"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M11 3h8M12 3v7l-6 15a2.5 2.5 0 0 0 2.4 3.5h13.2A2.5 2.5 0 0 0 24 25l-6-15V3z"
        style={{ fill: "var(--db-surface)", stroke: "var(--db-text-primary)" }}
        strokeWidth="1.6"
      />
      <path
        d="M8.5 21.5 Q15 18 22.5 21.5 L24.6 26.5 A2.5 2.5 0 0 1 22 28.5 H9 A2.5 2.5 0 0 1 6.6 26.5 Z"
        style={{ fill: "var(--db-green)" }}
      />
      <path
        d="M9.5 24.5 Q15 22 21.5 24.5 L22.8 27.5 A2 2 0 0 1 21 28.5 H10 A2 2 0 0 1 8.4 27.5 Z"
        style={{ fill: "var(--db-pink)" }}
      />
      <path
        d="M13 12l-1.6 2 1.6 2M17 12l1.6 2-1.6 2"
        style={{ stroke: "var(--db-green)" }}
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
