import Image from 'next/image';
import Link from 'next/link';
import { ROLE_ORDER, ROLES } from './roles';

/** /register/role: the account exists, pick a role; each card leads to that role's next step. */
export function RoleSelect() {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-8">
      <h1 className="text-3xl font-semibold text-white drop-shadow-md">Хто ви?</h1>
      <div className="grid w-full gap-6 sm:grid-cols-2 sm:gap-8">
        {ROLE_ORDER.map((role) => {
          const { label, next, image } = ROLES[role];
          return (
            // the role is not stored: an organization becomes one by creating its profile on the next step
            <Link
              key={role}
              href={next}
              className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-lg ring-1 ring-transparent transition hover:-translate-y-0.5 hover:ring-[#228fff] focus-visible:ring-2 focus-visible:ring-[#228fff] focus-visible:outline-none"
            >
              <Image
                src={image.src}
                width={image.width}
                height={image.height}
                alt=""
                priority
                sizes="16rem"
                className="h-40 w-auto contrast-125 sm:h-60"
              />
              <span className="text-xl font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
