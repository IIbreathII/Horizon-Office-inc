// Two-panel auth card: the form on the left, a welcome panel with an image on the right.
const WELCOME_IMAGE = '/images/auth/welcome.png';

export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid w-full max-w-4xl grid-cols-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <section className="flex flex-col gap-4 p-10">
        <h1 className="text-center text-2xl font-semibold">{title}</h1>
        {children}
      </section>
      <aside className="flex flex-col items-center justify-center gap-6 bg-gray-800 p-10 text-white">
        <p className="text-2xl font-semibold">Ласкаво просимо</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- placeholder asset, styles later */}
        <img src={WELCOME_IMAGE} alt="" className="max-h-64 w-full object-contain" />
      </aside>
    </div>
  );
}
