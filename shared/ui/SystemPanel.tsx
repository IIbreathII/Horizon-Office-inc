import { PANEL } from './surface';

const CORNER = 'pointer-events-none absolute size-4 border-[#d9bf8c]/70';

/**
 * Key panel with fine champagne corner marks.
 * Reserved for the key surfaces (profile header, dialogs) so the marks keep their weight.
 */
export function SystemPanel({ className = '', children, ...rest }: React.ComponentProps<'div'>) {
  return (
    <div {...rest} className={`${PANEL} ${className}`}>
      <span aria-hidden className={`${CORNER} top-2.5 left-2.5 rounded-tl-md border-t border-l`} />
      <span aria-hidden className={`${CORNER} right-2.5 bottom-2.5 rounded-br-md border-r border-b`} />
      {children}
    </div>
  );
}
