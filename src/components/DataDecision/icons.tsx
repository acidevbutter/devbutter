// Line icons used by the "Da informação à decisão" storyboard, traced from the
// Claude Design source. All inherit `currentColor` so the scene logic can recolor
// them by writing to the parent's `color`.

import type { IconName } from "./storyboard";

type Props = { size?: number; strokeWidth?: number };

const frame = (size: number, strokeWidth: number) =>
  ({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  }) as const;

const PATHS: Record<IconName, React.ReactNode> = {
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5v13c0 1.6 3.6 3 8 3s8-1.4 8-3v-13" />
      <path d="M4 12c0 1.6 3.6 3 8 3s8-1.4 8-3" />
    </>
  ),
  graph: (
    <>
      <circle cx="5" cy="7" r="2" />
      <circle cx="19" cy="10" r="2" />
      <circle cx="10" cy="18" r="2" />
      <path d="M6.7 8 17 9.5M8.4 16.2 11 8.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c0-4 3.6-6 7.5-6s7.5 2 7.5 6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
    </>
  ),
  fork: <path d="M12 4v16M6 8h12M6 8l-3 6a3 3 0 0 0 6 0zM18 8l-3 6a3 3 0 0 0 6 0z" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  link: <path d="M9.5 14.5l5-5M8 12l-2 2a3 3 0 0 0 4.2 4.2l2-2M16 12l2-2a3 3 0 0 0-4.2-4.2l-2 2" />,
  brain: (
    <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 4.5A2.6 2.6 0 0 0 12 20V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-2 4.5A2.6 2.6 0 0 1 12 20" />
  ),
  people: (
    <>
      <circle cx="8" cy="9" r="2.4" />
      <circle cx="16" cy="9" r="2.4" />
      <path d="M3.5 19c0-2.6 2-4 4.5-4s4.5 1.4 4.5 4M12 18.5c.4-2.2 2.1-3.5 4.4-3.5 2.4 0 4.1 1.4 4.1 4" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </>
  ),
  cube: (
    <>
      <path d="M12 2 21 7v10l-9 5-9-5V7z" />
      <path d="M12 12 21 7M12 12v10M12 12 3 7" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </>
  ),
};

export default function Icon({
  name,
  size = 20,
  strokeWidth = 1.6,
}: Props & { name: IconName }) {
  return (
    <svg {...frame(size, strokeWidth)} aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
