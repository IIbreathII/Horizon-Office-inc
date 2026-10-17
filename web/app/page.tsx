import { HomeRedirect } from '@/features/auth/HomeRedirect';

// Entry point: signed out → /login, organizations → /org, volunteers → /map.
export default function Home() {
  return <HomeRedirect />;
}
