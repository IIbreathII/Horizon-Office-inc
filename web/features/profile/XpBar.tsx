'use client';

import { useEffect, useState } from 'react';
import { levelFrameColor, levelTitle } from '@/shared/levels';
import { DISPLAY } from '@/shared/ui/fonts';
import { LineIcon } from '@/shared/ui/LineIcon';
import { FAINT, MUTED } from '@/shared/ui/surface';
import { SystemPanel } from '@/shared/ui/SystemPanel';

const LEVEL_UP_MS = 2400;

type XpBarProps = {
  userId: string;
  level: number;
  current: number;
  required: number; // 0 = max level
};

/**
 * XP progress to the next level. When the level is higher than the one this browser saw last time,
 * the bar fills up and a «Новий рівень!» card pops up before settling on the new progress.
 */
export function XpBar({ userId, level, current, required }: XpBarProps) {
  const [levelUp, setLevelUp] = useState(false);

  useEffect(() => {
    const key = `horizon:last-seen-level:${userId}`;
    let last: number | null = null;
    try {
      const stored = localStorage.getItem(key);
      last = stored === null ? null : Number(stored);
    } catch {
      // storage unavailable: no animation
    }
    const remember = () => {
      try {
        localStorage.setItem(key, String(level));
      } catch {}
    };
    if (last === null || level <= last) {
      remember();
      return;
    }
    // remember only after the animation, so a remount (e.g. StrictMode) still plays it
    const start = requestAnimationFrame(() => setLevelUp(true));
    const end = setTimeout(() => {
      setLevelUp(false);
      remember();
    }, LEVEL_UP_MS);
    return () => {
      cancelAnimationFrame(start);
      clearTimeout(end);
    };
  }, [userId, level]);

  const maxLevel = required === 0;
  const percent = maxLevel ? 100 : Math.min(100, (current / required) * 100);

  return (
    <div>
      <p className="mb-2.5 flex items-baseline justify-between gap-2 text-sm">
        <span className={MUTED}>
          {maxLevel ? (
            'Максимальний рівень'
          ) : (
            <>
              До рівня {level + 1}: <span className="font-semibold text-white">{required - current} XP</span>
            </>
          )}
        </span>
        <span className={`text-xs tabular-nums ${FAINT}`}>
          {maxLevel ? '' : `${current} / ${required}`}
        </span>
      </p>
      <div
        role="progressbar"
        aria-label="Досвід до наступного рівня"
        aria-valuemin={0}
        aria-valuemax={maxLevel ? 1 : required}
        aria-valuenow={maxLevel ? 1 : current}
        className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${
            levelUp
              ? 'bg-[#fcd34d]'
              : 'bg-linear-to-r from-amber-200 to-amber-400'
          }`}
          style={{ width: `${levelUp ? 100 : percent}%` }}
        />
      </div>

      {levelUp && <LevelUpWindow level={level} />}
    </div>
  );
}

function LevelUpWindow({ level }: { level: number }) {
  const color = levelFrameColor(level);

  return (
    <SystemPanel
      role="status"
      className={`fixed! top-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 bg-[#111113]/95! px-6 py-4 motion-safe:transition motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:-translate-y-6 motion-safe:starting:opacity-0`}
    >
      <span
        className={`flex size-14 items-center justify-center rounded-full text-2xl font-semibold text-white ${DISPLAY}`}
        style={{ border: `1px solid ${color}`, backgroundColor: `${color}1f` }}
      >
        {level}
      </span>
      <span className="text-left">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-300">
          <LineIcon name="sparkle" className="size-4" /> Новий рівень!
        </span>
        <span className={`block text-lg font-semibold text-white ${DISPLAY}`}>{levelTitle(level)}</span>
      </span>
    </SystemPanel>
  );
}
