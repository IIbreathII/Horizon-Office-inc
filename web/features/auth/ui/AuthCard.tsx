import { WelcomePanel } from './WelcomePanel';

// Login card: the form on the left, the landscape on the right (a banner above the form on phones).
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-lg md:min-h-[30rem] md:grid-cols-2">
      <section className="flex flex-col gap-6 px-6 py-8 sm:px-14 sm:py-10">
        <h1 className="text-center text-2xl font-semibold sm:text-3xl">{title}</h1>
        {children}
      </section>
      <WelcomePanel />
    </div>
  );
}
