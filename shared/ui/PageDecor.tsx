import { LineIcon, type LineIconName } from './LineIcon';

// Background decor for the volunteer pages: quest routes with a travelling marker, slowly turning
// topographic contours, drifting icons and rising rewards. Purely decorative, sits behind the content.
// All motion stops with prefers-reduced-motion.

const GOLD = '#d9bf8c';

// Keyframes live here: globals.css is shared with the map.
const KEYFRAMES = `
@keyframes decor-drift { 0%, 100% { translate: 0 0; rotate: var(--r); } 50% { translate: 0 -12px; rotate: calc(var(--r) + 8deg); } }
@keyframes decor-twinkle { 0%, 100% { opacity: .35; scale: .85; } 50% { opacity: 1; scale: 1.1; } }
@keyframes decor-spin { to { rotate: 360deg; } }
@keyframes decor-dash { to { stroke-dashoffset: -26; } }
@keyframes decor-rise { 0% { translate: 0 0; opacity: 0; } 15% { opacity: 1; } 100% { translate: 0 -140px; opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .decor-motion-only { display: none; } }
`;

type Floater = {
  icon: LineIconName;
  /** Position in % of the viewport. */
  top: number;
  left: number;
  size: number; // px
  rotate: number; // deg
  delay: number; // s, so icons don't move in sync
  /** Twinkles instead of drifting (stars, sparkles). */
  twinkle?: boolean;
  /** Shown on phones too; the rest only from lg up. */
  mobile?: boolean;
  gold?: boolean;
};

const FLOATERS: Floater[] = [
  // right side
  { icon: 'heart', top: 14, left: 88, size: 44, rotate: -12, delay: 0, mobile: true, gold: true },
  { icon: 'leaf', top: 36, left: 94, size: 36, rotate: 18, delay: 2.5 },
  { icon: 'star', top: 8, left: 62, size: 26, rotate: 10, delay: 1.2, gold: true, twinkle: true },
  { icon: 'paw', top: 58, left: 84, size: 40, rotate: -8, delay: 3.4 },
  { icon: 'coin', top: 76, left: 93, size: 30, rotate: 0, delay: 0.8, mobile: true, gold: true },
  { icon: 'trophy', top: 88, left: 70, size: 38, rotate: 6, delay: 4.1 },
  { icon: 'gift', top: 70, left: 52, size: 30, rotate: -14, delay: 1.9 },
  { icon: 'sparkle', top: 46, left: 66, size: 24, rotate: 0, delay: 2.9, gold: true, twinkle: true },
  // left side, between the nav rail and the content
  { icon: 'star', top: 6, left: 9, size: 22, rotate: -8, delay: 0.5, gold: true, twinkle: true },
  { icon: 'leaf', top: 30, left: 4, size: 32, rotate: -24, delay: 1.6 },
  { icon: 'sparkle', top: 68, left: 8, size: 22, rotate: 0, delay: 3.1, gold: true, twinkle: true },
  { icon: 'heart', top: 82, left: 3, size: 34, rotate: 14, delay: 2.2 },
  { icon: 'pin', top: 92, left: 30, size: 28, rotate: 0, delay: 3.8 },
];

/** Rewards that float up and fade, like loot in a game. */
const REWARDS: { text: string; coin?: boolean; top: number; left: number; delay: number }[] = [
  { text: '+50 XP', top: 62, left: 76, delay: 0 },
  { text: '+25', coin: true, top: 40, left: 90, delay: 3.5 },
  { text: '+40 XP', top: 84, left: 58, delay: 6 },
  { text: '+20', coin: true, top: 54, left: 6, delay: 2 },
  { text: '+60 XP', top: 90, left: 12, delay: 5 },
];

const RIGHT_ROUTE = 'M40 400 C 20 320, 140 330, 120 250 S 40 160, 140 120 S 260 90, 250 20';
const LEFT_ROUTE = 'M20 230 C 70 210, 20 150, 80 120 S 150 60, 120 15';

export function PageDecor() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <style>{KEYFRAMES}</style>

      <Contours className="-right-40 -bottom-40 size-[42rem]" duration={240} />
      <Contours className="-top-48 -left-56 hidden size-[30rem] lg:block" duration={300} reverse />

      <Route className="top-[18%] right-[4%] hidden h-[56vh] w-[30vw] min-w-80 md:block" viewBox="0 0 300 420" d={RIGHT_ROUTE} checkpoints={[[40, 400], [120, 250], [140, 120]]} finish={[250, 20]} />
      <Route className="top-[10%] left-[5%] hidden h-[30vh] w-44 2xl:block" viewBox="0 0 160 240" d={LEFT_ROUTE} checkpoints={[[20, 230], [80, 120]]} finish={[120, 15]} />

      {FLOATERS.map((f) => (
        <span
          key={`${f.icon}-${f.top}-${f.left}`}
          className={`absolute ${f.mobile ? '' : 'hidden lg:block'} ${f.gold ? 'text-[#d9bf8c]/[0.16]' : 'text-white/[0.08]'} ${
            f.twinkle ? 'motion-safe:animate-[decor-twinkle_4s_ease-in-out_infinite]' : 'motion-safe:animate-[decor-drift_9s_ease-in-out_infinite]'
          }`}
          style={{ top: `${f.top}%`, left: `${f.left}%`, width: f.size, height: f.size, rotate: `${f.rotate}deg`, animationDelay: `${f.delay}s`, ['--r' as string]: `${f.rotate}deg` }}
        >
          <LineIcon name={f.icon} className="size-full" />
        </span>
      ))}

      {REWARDS.map((r) => (
        <span
          key={r.text + r.left}
          className={`decor-motion-only absolute hidden items-center gap-1 text-sm font-semibold opacity-0 lg:flex motion-safe:animate-[decor-rise_8s_ease-out_infinite] ${
            r.coin ? 'text-[#e8c77f]/40' : 'text-emerald-200/35'
          }`}
          style={{ top: `${r.top}%`, left: `${r.left}%`, animationDelay: `${r.delay}s` }}
        >
          {r.text}
          {r.coin && <LineIcon name="coin" className="size-3.5" />}
        </span>
      ))}
    </div>
  );
}

/** Concentric organic rings, like elevation lines on a terrain map; turns very slowly. */
function Contours({ className, duration, reverse = false }: { className: string; duration: number; reverse?: boolean }) {
  return (
    <svg
      className={`absolute text-white/[0.06] motion-safe:animate-[decor-spin_var(--d)_linear_infinite] ${className}`}
      style={{ ['--d' as string]: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
      viewBox="-100 -100 200 200"
      fill="none"
    >
      {[1, 0.84, 0.69, 0.55, 0.42, 0.3, 0.19].map((scale) => (
        <path
          key={scale}
          transform={`scale(${scale}) rotate(${scale * 40})`}
          d="M0 -92 C 38 -96, 78 -70, 86 -30 C 95 12, 70 58, 30 80 C -8 100, -58 92, -80 58 C -100 26, -94 -22, -70 -56 C -52 -80, -30 -90, 0 -92 Z"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

type RouteProps = {
  className: string;
  viewBox: string;
  d: string;
  checkpoints: [number, number][];
  finish: [number, number];
};

/** Dashed quest route with checkpoints, a star at the finish and a marker walking along it. */
function Route({ className, viewBox, d, checkpoints, finish }: RouteProps) {
  const [fx, fy] = finish;
  return (
    <svg className={`absolute ${className}`} viewBox={viewBox} fill="none">
      <path
        d={d}
        stroke={GOLD}
        strokeOpacity="0.24"
        strokeWidth="1.5"
        strokeDasharray="4 9"
        strokeLinecap="round"
        className="motion-safe:animate-[decor-dash_3s_linear_infinite]"
      />
      {checkpoints.map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="7" stroke={GOLD} strokeOpacity="0.3" strokeWidth="1.2" />
          <circle cx={cx} cy={cy} r="2.2" fill={GOLD} fillOpacity="0.4" />
        </g>
      ))}
      <path
        transform={`translate(${fx - 250} ${fy - 20})`}
        d="m250 6 3.6 7.3 8 1.2-5.8 5.6 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.8-5.6 8-1.2z"
        stroke={GOLD}
        strokeOpacity="0.45"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* the walker: hidden with reduced motion */}
      <circle className="decor-motion-only" r="3.5" fill={GOLD} fillOpacity="0.7">
        <animateMotion dur="12s" repeatCount="indefinite" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
      </circle>
    </svg>
  );
}
