import { levelFrameColor } from '@/shared/levels';

/** Avatar with a frame colored by level tier. */
export function LevelAvatar({ name, avatarUrl, level }: { name: string; avatarUrl: string | null; level: number }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 bg-gray-100 text-xl font-semibold"
      style={{ borderColor: levelFrameColor(level) }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user photos come from arbitrary hosts
        <img src={avatarUrl} alt={name} className="size-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}
