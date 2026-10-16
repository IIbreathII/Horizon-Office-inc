// Auth pages: centered on a light background, without the volunteer navigation.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-dvh items-center justify-center bg-gray-100 p-8 text-gray-900">{children}</main>;
}
