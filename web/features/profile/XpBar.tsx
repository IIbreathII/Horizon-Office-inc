'use client';

import { useEffect, useState } from 'react';

const LEVEL_UP_MS = 1600;

type XpBarProps = {
  userId: string;
  level: number;
  current: number;
  required: number; // 0 = max level
};

/**
 * XP progress to the next level. When the level is higher than the one this browser saw last time,
 * the bar fills up and shows «+1 рівень» before settling on the new progress.
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

  const percent = required === 0 ? 100 : Math.min(100, (current / required) * 100);

  return (
    <div>
      <p className="mb-1 flex justify-between text-sm">
        <span>
          Рівень {level} {levelUp && <strong className="animate-bounce">+1 рівень!</strong>}
        </span>
        <span>{required === 0 ? 'Максимальний рівень' : `${current} / ${required} XP`}</span>
      </p>
      <div className="h-2 overflow-hidden rounded bg-gray-200">
        <div
          className={`h-full transition-[width] duration-700 ${levelUp ? 'bg-amber-400' : 'bg-gray-800'}`}
          style={{ width: `${levelUp ? 100 : percent}%` }}
        />
      </div>
    </div>
  );
}
