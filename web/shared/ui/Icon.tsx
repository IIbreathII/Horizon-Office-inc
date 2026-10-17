/** Icon from public/icons (paths in shared/icons.ts). Decorative: buttons get their name from text or aria-label. */
export function Icon({ src, className = 'size-5' }: { src: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- plain static icons, no optimization needed
  return <img src={src} alt="" aria-hidden className={`inline-block shrink-0 ${className}`} />;
}
