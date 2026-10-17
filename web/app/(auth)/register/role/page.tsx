import { RoleSelect } from '@/features/auth/RoleSelect';

// Registration step 2 (signed in after step 1; proxy.ts checks): volunteer → /map, organization → /register/organization.
export default function RegisterRolePage() {
  return <RoleSelect />;
}
