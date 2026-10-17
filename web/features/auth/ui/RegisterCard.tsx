import Image from 'next/image';
import Link from 'next/link';

type RegisterCardProps = {
  title: string;
  /** Link above the title, e.g. back to the role choice. */
  back?: { href: string; label: string };
  /** Picture in the circle: line art (blended into the circle) or a photo (fills it). */
  image: { src: string; width: number; height: number; photo?: boolean };
  caption?: string;
  /** «Вже є акаунт? Увійти» under the card (only before the account exists). */
  loginLink?: boolean;
  children: React.ReactNode;
};

// Registration card: the form on the left, a picture in a circle on the right (hidden on phones).
export function RegisterCard({ title, back, image, caption, loginLink, children }: RegisterCardProps) {
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6">
      <div className="grid w-full overflow-hidden rounded-2xl bg-white shadow-lg md:grid-cols-2">
        <section className="flex flex-col gap-6 px-6 py-8 sm:px-14 sm:py-10">
          <div className="flex flex-col gap-1">
            {back && (
              <Link href={back.href} className="self-start text-sm text-gray-500 hover:text-[#228fff]">
                {back.label}
              </Link>
            )}
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
          {children}
        </section>
        <aside className="hidden flex-col items-center justify-center gap-4 p-10 md:flex">
          <div className="relative flex size-56 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            <Image
              src={image.src}
              width={image.width}
              height={image.height}
              alt=""
              priority
              sizes={image.photo ? '14rem' : '12rem'}
              className={
                image.photo
                  ? 'absolute inset-0 size-full object-cover'
                  : // multiply: the white background of the PNG takes the circle's color
                    'h-44 w-auto mix-blend-multiply'
              }
            />
          </div>
          {caption && <p className="text-lg font-medium">{caption}</p>}
        </aside>
      </div>
      {loginLink && (
        <p className="text-sm text-white drop-shadow-md">
          Вже є акаунт?{' '}
          <Link href="/login" className="font-semibold underline-offset-2 hover:underline">
            Увійти
          </Link>
        </p>
      )}
    </div>
  );
}
