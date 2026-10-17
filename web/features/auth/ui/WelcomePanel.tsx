import Image from 'next/image';
import { AUTH_BACKGROUND } from '../images';

/** Login card picture: the sharp, static version of the page's background landscape.
 *  Phones: a banner above the form; md+: the right half of the card. */
export function WelcomePanel() {
  return (
    <aside className="relative order-first h-36 overflow-hidden bg-[#000000] sm:h-44 md:order-none md:h-auto">
      <Image
        src={AUTH_BACKGROUND.src}
        width={AUTH_BACKGROUND.width}
        height={AUTH_BACKGROUND.height}
        alt=""
        priority
        // md+: landscape picture cropped to the panel height, rendered wider than the panel
        sizes="(min-width: 768px) 55rem, 100vw"
        className="absolute inset-0 size-full object-cover"
      />
    </aside>
  );
}
