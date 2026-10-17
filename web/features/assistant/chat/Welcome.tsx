import { FAINT } from '@/shared/ui/surface';
import { Mascot } from '../Mascot';
import { ASSISTANT_NAME } from '../persona';
import { ActionIcon } from './ActionIcon';
import type { Suggestion } from './suggestions';

/** Empty chat: a hello and questions to start with, picked for the current page. */
export function Welcome({ suggestions, onPick }: { suggestions: Suggestion[]; onPick: (s: Suggestion) => void }) {
  return (
    <div className="flex flex-col items-center gap-3.5 pt-2 text-center animate-message-in">
      {/* on phones the owl already peeks over the sheet */}
      <div className="relative">
        <Mascot mood="wave" className="hidden size-16 sm:block animate-float" />
        <span className="hidden sm:flex absolute -bottom-1 -right-1 size-5 items-center justify-center rounded-full bg-amber-400 text-black shadow-md">
          <ActionIcon name="sparkle" className="size-3" />
        </span>
      </div>
      <div>
        <p className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
          Привіт! Я {ASSISTANT_NAME}
        </p>
        <p className={`mt-1 text-xs sm:text-sm ${FAINT} max-w-[280px]`}>
          Підкажу квести у Дніпрі, поясню нагороди та допоможу записатися!
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 pt-1">
        {suggestions.map((s) => (
          <button
            key={s.text}
            type="button"
            onClick={() => onPick(s)}
            className="group relative flex items-center gap-3 cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-left text-sm text-neutral-100 transition-all duration-200 hover:border-amber-300/70 hover:bg-white/[0.09] hover:translate-x-1 hover:shadow-[0_0_20px_-6px_rgba(252,211,77,0.4)]"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-300 ring-1 ring-amber-300/30 transition-transform duration-200 group-hover:scale-110 group-hover:bg-amber-300 group-hover:text-black">
              <ActionIcon name={s.icon} className="size-4" />
            </span>
            <span className="flex-1 font-medium text-xs sm:text-sm leading-tight text-neutral-200 group-hover:text-white">
              {s.text}
            </span>
            <svg
              className="size-4 shrink-0 text-neutral-500 transition-all duration-200 group-hover:text-amber-300 group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
