import { RequireAuth } from '@/features/auth/guards';
import { RoleSelect } from '@/features/auth/RoleSelect';

// Registration step 2 (signed in after step 1): volunteer → /map, organization → /register/organization.
export default function RegisterRolePage() {
  return (
    <RequireAuth>
      <RoleSelect />
    </RequireAuth>
  );
}
