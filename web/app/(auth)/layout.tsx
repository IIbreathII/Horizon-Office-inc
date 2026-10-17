import { AuthBackground } from '@/features/auth/ui/AuthBackground';

// Auth pages: centered over the blurred landscape, without the volunteer navigation.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center p-4 text-gray-900 sm:p-8">
      <AuthBackground />
      {children}
    </main>
  );
}
