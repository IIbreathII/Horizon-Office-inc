// Custom line icons for the volunteer pages; they take currentColor.

const PATHS = {
  xp: <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" />,
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M14.5 9.5c-.4-.8-1.3-1.2-2.5-1.2-1.5 0-2.5.7-2.5 1.8 0 2.6 5.2 1.3 5.2 3.9 0 1.1-1.1 1.9-2.7 1.9-1.3 0-2.3-.5-2.7-1.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5M15.5 5.6a3.2 3.2 0 0 1 0 5.8M18 14.8c1.6.7 2.6 2.4 3 4.7" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  gift: (
    <>
      <rect x="3.5" y="8.5" width="17" height="4" rx="1.2" />
      <path d="M5 12.5v7.5h14v-7.5M12 8.5V20M12 8.5C10.5 4.5 6.5 4.6 7 7c.3 1.5 5 1.5 5 1.5zM12 8.5c1.5-4 5.5-3.9 5-1.5-.3 1.5-5 1.5-5 1.5z" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z" />
      <path d="M7.5 6H4.5c0 3 1.3 4.5 3.3 4.7M16.5 6h3c0 3-1.3 4.5-3.3 4.7M12 13.5V17M8.5 20h7M9.5 17h5" />
    </>
  ),
  sparkle: <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7zM19 16c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5z" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
      <path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  ticket: (
    <>
      <path d="M3.5 8.5V6.5a1.5 1.5 0 0 1 1.5-1.5h14a1.5 1.5 0 0 1 1.5 1.5v2a3.5 3.5 0 0 0 0 7v2a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-2a3.5 3.5 0 0 0 0-7z" />
      <path d="M14 5v2.5M14 11v2M14 16.5V19" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />,
  leaf: (
    <>
      <path d="M5 19c0-8 5-13 14-14 0 9-5 14-12 14z" />
      <path d="M5 19c3-4 6-6.5 9.5-8.5" />
    </>
  ),
  paw: (
    <>
      <path d="M12 12.5c-2.6 0-5 2.6-5 4.6 0 1.5 1.2 2.4 2.6 2.4 1 0 1.6-.5 2.4-.5s1.4.5 2.4.5c1.4 0 2.6-.9 2.6-2.4 0-2-2.4-4.6-5-4.6z" />
      <circle cx="6" cy="10" r="1.7" />
      <circle cx="9.5" cy="6" r="1.7" />
      <circle cx="14.5" cy="6" r="1.7" />
      <circle cx="18" cy="10" r="1.7" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pencil: (
    <>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6M9 7V4.5h6V7" />
      <path d="M6 7l1 13h10l1-13" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  building: (
    <>
      <rect x="4.5" y="3.5" width="11" height="17" rx="1.5" />
      <path d="M15.5 9.5h3a1 1 0 0 1 1 1v10h-4M8 7.5h1M11 7.5h1M8 11h1M11 11h1M8 14.5h1M11 14.5h1M9 20.5v-3h2v3" />
    </>
  ),
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
} as const;

export type LineIconName = keyof typeof PATHS;

/** Decorative icon (aria-hidden); the surrounding text names the control. */
export function LineIcon({ name, className = 'size-5' }: { name: LineIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`inline-block shrink-0 ${className}`}
    >
      {PATHS[name]}
    </svg>
  );
}
