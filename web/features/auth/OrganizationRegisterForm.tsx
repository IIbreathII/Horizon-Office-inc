'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useSaveOrganization } from '@/shared/api/queries';
import { BUTTON_PRIMARY } from '@/shared/ui/PageShell';
import { ORGANIZATION_TYPES, organizationSchema, type OrganizationValues } from './schemas';
import { AuthPhoneField, AuthSelectField, AuthTextAreaField, AuthTextField } from './ui/AuthFields';

/** Last registration step for organizations: the account exists, this creates its organization profile. */
export function OrganizationRegisterForm() {
  const router = useRouter();
  const save = useSaveOrganization();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationValues>({ resolver: zodResolver(organizationSchema), defaultValues: { description: '' } });

  async function onSubmit(values: OrganizationValues) {
    try {
      // POST /organizations — from now on the Express API treats this user as an organization
      await save.mutateAsync({
        exists: false,
        input: {
          organizationName: values.organization_name,
          types: values.types,
          edrpou: values.edrpou,
          contact: [values.contact.replace(/\s/g, '')],
          description: values.description.trim() || null,
        },
      });
      router.push('/org');
    } catch {
      // shown from save.error
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <AuthTextField
        label="Назва організації"
        autoComplete="organization"
        registration={register('organization_name')}
        error={errors.organization_name?.message}
      />
      <AuthSelectField label="Тип" options={ORGANIZATION_TYPES} registration={register('types')} error={errors.types?.message} />
      <AuthTextField label="Код ЄДРПОУ" registration={register('edrpou')} error={errors.edrpou?.message} />
      <AuthPhoneField label="Телефон організації" registration={register('contact')} error={errors.contact?.message} />
      <AuthTextAreaField label="Опис (необов’язково)" registration={register('description')} error={errors.description?.message} />
      <button type="submit" disabled={isSubmitting} className={`mt-3 ${BUTTON_PRIMARY}`}>
        {isSubmitting ? 'Створення…' : 'Створити організацію'}
      </button>
      {save.error && (
        <p role="alert" className="text-sm text-red-600">
          {save.error.message}
        </p>
      )}
    </form>
  );
}
