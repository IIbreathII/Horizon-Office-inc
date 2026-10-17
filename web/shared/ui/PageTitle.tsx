import Link from 'next/link';
import { DISPLAY } from './fonts';
import { LineIcon } from './LineIcon';

type PageTitleProps = {
  title: string;
  subtitle?: string;
  /** Shown to the right of the title (e.g. a primary action or a balance). */
  actions?: React.ReactNode;
  /** Optional "back" link above the title. */
  back?: { href: string; label: string };
};

/** Page heading used by the volunteer and organization pages. */
export function PageTitle({ title, subtitle, actions, back }: PageTitleProps) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <Link
            href={back.href}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg text-sm text-neutral-400 transition-colors outline-none hover:text-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <LineIcon name="arrowLeft" className="size-4" />
            {back.label}
          </Link>
        )}
        <h1 className={`text-3xl font-semibold tracking-tight text-white sm:text-4xl ${DISPLAY}`}>{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-neutral-300">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}
