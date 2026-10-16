import { redirect } from 'next/navigation';

// TODO: redirect by role (/map for volunteers, /org for organizations) once auth exists (§5)
export default function Home() {
  redirect('/map');
}
