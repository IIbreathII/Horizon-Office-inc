'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Role } from '@/shared/types';
import { OrganizationRegisterForm } from './OrganizationRegisterForm';
import { RoleSelect } from './RoleSelect';
import { AuthCard } from './ui/AuthCard';
import { VolunteerRegisterForm } from './VolunteerRegisterForm';

/** Registration: choose a role, then fill in that role's form (doc §5). */
export function RegisterFlow() {
  const [role, setRole] = useState<Role | null>(null);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {role === null ? (
        <>
          <h1 className="text-2xl font-semibold">Хто ви?</h1>
          <RoleSelect onSelect={setRole} />
        </>
      ) : (
        <AuthCard title={role === 'volunteer' ? 'Реєстрація волонтера' : 'Реєстрація організації'}>
          <button type="button" onClick={() => setRole(null)} className="self-start text-sm hover:underline">
            ← Змінити роль
          </button>
          {role === 'volunteer' ? <VolunteerRegisterForm /> : <OrganizationRegisterForm />}
        </AuthCard>
      )}
      <p className="text-sm">
        Вже є акаунт?{' '}
        <Link href="/login" className="underline">
          Увійти
        </Link>
      </p>
    </div>
  );
}
