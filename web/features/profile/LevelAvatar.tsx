import { levelFrameColor } from '@/shared/levels';
import { DISPLAY } from '@/shared/ui/fonts';

// Ring geometry (SVG units, viewBox 160 × 160).
const RADIUS = 72;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 452.4; the starting:[stroke-dashoffset:453] class below matches it

type LevelAvatarProps = {
  name: string;
  avatarUrl: string | null;
  level: number;
  /** XP inside the current level and XP needed for the next one (0 = max level). */
  current: number;
  required: number;
};

/** Avatar inside a fine XP ring that fills up to the progress toward the next level. */
export function LevelAvatar({ name, avatarUrl, level, current, required }: LevelAvatarProps) {
  const frame = levelFrameColor(level);
  const progress = required === 0 ? 1 : Math.min(1, current / required);
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative size-40 shrink-0">
      <svg viewBox="0 0 160 160" aria-hidden className="absolute inset-0 -rotate-90 overflow-visible">
        <defs>
          <linearGradient id="xp-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx="80"
          cy="80"
          r={RADIUS}
          fill="none"
          stroke="url(#xp-ring)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          style={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-out motion-safe:starting:[stroke-dashoffset:453]"
        />
      </svg>

      {/* inner frame keeps the level-tier color from shared/levels.ts */}
      <div
        className="absolute inset-3 flex items-center justify-center overflow-hidden rounded-full border bg-linear-to-br from-[#262629] to-[#0a0a0b] text-4xl font-semibold text-white"
        style={{ borderColor: `${frame}80` }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user photos come from arbitrary hosts
          <img src={avatarUrl} alt={name} className="size-full object-cover" />
        ) : (
          <span className={DISPLAY}>{initials}</span>
        )}
      </div>

      <span
        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-[#fbbf24]/50 bg-[#050505] px-3 py-0.5 text-xs font-semibold whitespace-nowrap text-amber-300 ${DISPLAY}`}
      >
        Рівень {level}
      </span>
    </div>
  );
}
