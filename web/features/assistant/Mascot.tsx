import type { Direction } from './flightPath';
import type { MascotMood } from './persona';

// Transforms live on inner <g>s, never on the <svg>: callers may animate the <svg> itself
// (a CSS animation on an element overrides its inline transform), and the turn (scaleX) must
// not fight the body's bob for the same `transform` property.
const KEYFRAMES = `
@keyframes mascot-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes mascot-breathe { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.03, 0.96); } }
@keyframes mascot-blink { 0%, 92%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
@keyframes mascot-cheer { 0%, 100% { transform: rotate(0deg) translateY(0); } 25% { transform: rotate(-7deg) translateY(-5px); } 75% { transform: rotate(7deg) translateY(-5px); } }
@keyframes mascot-glide { 0%, 100% { transform: rotate(-3deg) translateY(0); } 50% { transform: rotate(3deg) translateY(-2px); } }
@keyframes wing-flap-left { 0%, 100% { transform: rotate(8deg); } 40% { transform: rotate(-55deg); } }
@keyframes wing-flap-right { 0%, 100% { transform: rotate(-8deg); } 40% { transform: rotate(55deg); } }
@keyframes wing-wave { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(16deg); } }
@keyframes scarf-flutter { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-14deg) skewX(6deg); } }
@keyframes feet-step-left { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-4px) rotate(-12deg); } 50% { transform: translateY(0); } }
@keyframes feet-step-right { 0%, 50%, 100% { transform: translateY(0); } 75% { transform: translateY(-4px) rotate(12deg); } }
`;

// raised wings (flying, waving); the right one mirrors the left around x = 60
const LEFT_WING_UP = 'M22 64 C6 44 14 28 20 28 C28 42 32 54 34 60 Z';
const LEFT_WING_DOWN = 'M24 58 C10 74 18 96 24 96 C30 84 34 72 34 62 Z';
const RIGHT_WING_UP = 'M98 64 C114 44 106 28 100 28 C92 42 88 54 86 60 Z';
const RIGHT_WING_OUT = 'M86 60 C110 56 118 46 116 46 C106 68 92 72 88 74 Z';
const RIGHT_WING_DOWN = 'M96 58 C110 74 102 96 96 96 C90 84 86 72 86 62 Z';

type MascotProps = {
  mood?: MascotMood;
  className?: string;
  isFlying?: boolean;
  isWalking?: boolean;
  direction?: Direction;
};

export function Mascot({ mood = 'idle', className = 'size-16', isFlying = false, isWalking = false, direction = 1 }: MascotProps) {
  const asleep = mood === 'sleep';
  const happy = mood === 'cheer' || mood === 'wave';
  const leftWing = isFlying || mood === 'wave' || mood === 'cheer' ? LEFT_WING_UP : LEFT_WING_DOWN;
  const rightWing = isFlying || mood === 'cheer' ? RIGHT_WING_UP : mood === 'point' ? RIGHT_WING_OUT : RIGHT_WING_DOWN;
  const waving = mood === 'wave' && !isFlying;

  const bodyMotion = isFlying
    ? 'motion-safe:animate-[mascot-glide_1.4s_ease-in-out_infinite]'
    : asleep
      ? 'motion-safe:animate-[mascot-breathe_4s_ease-in-out_infinite]'
      : mood === 'cheer'
        ? 'motion-safe:animate-[mascot-cheer_0.8s_ease-in-out_infinite]'
        : isWalking
          ? ''
          : 'motion-safe:animate-[mascot-bob_3.6s_ease-in-out_infinite]';

  return (
    <svg viewBox="0 0 120 120" aria-hidden className={`overflow-visible ${className}`}>
      <style>{KEYFRAMES}</style>
      <defs>
        <linearGradient id="owl-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c2854a" />
          <stop offset="1" stopColor="#7e4719" />
        </linearGradient>
        <linearGradient id="owl-beak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* turning to face the direction of travel */}
      <g
        style={{
          transformOrigin: '60px 60px',
          transform: direction === -1 ? 'scaleX(-1)' : 'none',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        <g className={bodyMotion} style={{ transformOrigin: '60px 108px' }}>
          {/* feet: tucked in flight, stepping in turn while walking */}
          <g style={{ transform: isFlying ? 'translateY(-4px) scaleY(0.7)' : 'none', transformOrigin: '60px 108px', transition: 'transform 0.25s' }}>
            <ellipse
              cx="48"
              cy="108"
              rx="6.5"
              ry="4"
              fill="#f59e0b"
              style={{ transformOrigin: '48px 108px', animation: isWalking ? 'feet-step-left 0.5s ease-in-out infinite' : undefined }}
            />
            <ellipse
              cx="72"
              cy="108"
              rx="6.5"
              ry="4"
              fill="#f59e0b"
              style={{ transformOrigin: '72px 108px', animation: isWalking ? 'feet-step-right 0.5s ease-in-out infinite' : undefined }}
            />
          </g>

          {/* ear tufts */}
          <path d="M34 32 C30 20 22 10 26 8 C32 14 42 22 46 26 Z" fill="#7e4719" />
          <path d="M86 32 C90 20 98 10 94 8 C88 14 78 22 74 26 Z" fill="#7e4719" />

          {/* wings hinge at the shoulders */}
          <g
            style={{
              transformOrigin: '30px 60px',
              animation: isFlying
                ? 'wing-flap-left 0.38s ease-in-out infinite'
                : waving
                  ? 'wing-wave 0.5s ease-in-out infinite'
                  : undefined,
            }}
          >
            <path d={leftWing} fill="#6b3a12" style={{ transition: 'd 0.25s' }} />
          </g>
          <g
            style={{
              transformOrigin: '90px 60px',
              animation: isFlying ? 'wing-flap-right 0.38s ease-in-out infinite' : undefined,
            }}
          >
            <path d={rightWing} fill="#6b3a12" style={{ transition: 'd 0.25s' }} />
          </g>

          {/* body + belly */}
          <ellipse cx="60" cy="66" rx="36" ry="42" fill="url(#owl-body)" />
          <ellipse cx="60" cy="80" rx="23" ry="24" fill="#faecd1" />
          <path
            d="M50 76 q4 4 8 0 M62 76 q4 4 8 0 M56 88 q4 4 8 0"
            stroke="#d9b679"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />

          {/* cheeks */}
          <circle cx="33" cy="58" r="5.5" fill="#fca5a5" opacity="0.4" />
          <circle cx="87" cy="58" r="5.5" fill="#fca5a5" opacity="0.4" />

          {/* eyes */}
          <g>
            <circle cx="44" cy="48" r="14.5" fill="#ffffff" />
            <circle cx="76" cy="48" r="14.5" fill="#ffffff" />
            {asleep || happy ? (
              <path
                d={asleep ? 'M36 50 q8 6 16 0 M68 50 q8 6 16 0' : 'M36 51 q8 -8 16 0 M68 51 q8 -8 16 0'}
                stroke="#2b1a0d"
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <g className="origin-[60px_48px] motion-safe:animate-[mascot-blink_4.5s_ease-in-out_infinite]">
                <circle cx={mood === 'think' ? 48 : 45} cy={mood === 'think' ? 44 : 49} r="6.5" fill="#1e140d" />
                <circle cx={mood === 'think' ? 80 : 77} cy={mood === 'think' ? 44 : 49} r="6.5" fill="#1e140d" />
                <circle cx={mood === 'think' ? 50 : 47.5} cy={mood === 'think' ? 42 : 46.5} r="2.2" fill="#ffffff" />
                <circle cx={mood === 'think' ? 82 : 79.5} cy={mood === 'think' ? 42 : 46.5} r="2.2" fill="#ffffff" />
                <circle cx={mood === 'think' ? 46 : 43} cy={mood === 'think' ? 46 : 51} r="1" fill="#ffffff" opacity="0.75" />
                <circle cx={mood === 'think' ? 78 : 75} cy={mood === 'think' ? 46 : 51} r="1" fill="#ffffff" opacity="0.75" />
              </g>
            )}
            {mood === 'sad' && <path d="M32 35 l14 5 M88 35 l-14 5" stroke="#2b1a0d" strokeWidth="3" strokeLinecap="round" />}
          </g>

          {/* beak */}
          <path d="M54 57 C54 55 66 55 66 57 C66 63 62 70 60 71 C58 70 54 63 54 57 Z" fill="url(#owl-beak)" />
          <ellipse cx="60" cy="58" rx="3.5" ry="1.2" fill="#fde68a" opacity="0.6" />

          {/* volunteer scarf: blue with a yellow stripe, its tail flutters in flight */}
          <path d="M27 92 C58 108 62 108 93 92 L93 100 C62 116 58 116 27 100 Z" fill="#2563eb" />
          <path d="M28 96 C58 112 62 112 92 96" stroke="#facc15" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path
            d="M78 98 L86 118 L94 114 L88 96 Z"
            fill="#2563eb"
            style={{ transformOrigin: '78px 98px', animation: isFlying ? 'scarf-flutter 0.45s ease-in-out infinite' : undefined }}
          />
        </g>
      </g>

      {/* not mirrored: thoughts and sleep rise to the upper right */}
      {mood === 'think' && (
        <g fill="#fde68a">
          <circle cx="100" cy="20" r="4" className="motion-safe:animate-pulse" />
          <circle cx="110" cy="10" r="3" className="motion-safe:animate-pulse [animation-delay:200ms]" />
          <circle cx="117" cy="2" r="2" className="motion-safe:animate-pulse [animation-delay:400ms]" />
        </g>
      )}
      {asleep && (
        <g fill="#fde68a" fontWeight="800" fontFamily="ui-monospace, monospace">
          <text x="92" y="22" fontSize="16" className="[transform-box:fill-box] motion-safe:animate-sleep-z">
            z
          </text>
          <text x="100" y="14" fontSize="12" className="[transform-box:fill-box] motion-safe:animate-sleep-z [animation-delay:1s] [animation-fill-mode:backwards]">
            Z
          </text>
        </g>
      )}
    </svg>
  );
}
