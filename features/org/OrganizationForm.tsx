'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ORGANIZATION_TYPES } from '@/features/auth/schemas';
import { useMyOrganization, useSaveOrganization } from '@/shared/api/queries';
import type { Organization } from '@/shared/types';
import { SelectField, TextAreaField, TextField } from '@/shared/ui/FormFields';
import { BUTTON } from '@/shared/ui/PageShell';
import { organizationProfileSchema, type OrganizationProfileValues } from './schemas';

/** Known types plus the organization's current one if the backend has another value (so saving keeps it). */
function typeOptions(current: string | null | undefined) {
  const known = ORGANIZATION_TYPES.some((t) => t.value === current);
  return current && !known ? [...ORGANIZATION_TYPES, { value: current, label: current }] : ORGANIZATION_TYPES;
}

/** Create (POST /organizations) or edit (PATCH /organizations/me) the organization profile. */
export function OrganizationProfile() {
  const { data: org, isPending, isError } = useMyOrganization();

  if (isPending) return <p>Завантаження…</p>;
  if (isError) return <p>Не вдалося завантажити організацію</p>;
  // key: remount with fresh defaults once the profile is created
  return <OrganizationForm key={org?.id ?? 'new'} org={org} />;
}

function OrganizationForm({ org }: { org: Organization | null }) {
  const save = useSaveOrganization();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<OrganizationProfileValues>({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues: {
      organizationName: org?.name ?? '',
      types: org?.types ?? '',
      edrpou: org?.edrpou ?? '',
      contact: org?.contact.join('\n') ?? '',
      description: org?.description ?? '',
      logo: org?.logoUrl ?? '',
    },
  });

  async function submit(values: OrganizationProfileValues) {
    // the error is shown from save.error
    await save.mutateAsync({
      exists: org !== null,
      input: {
        organizationName: values.organizationName,
        types: values.types || null,
        edrpou: values.edrpou || null,
        contact: values.contact.split('\n').map((line) => line.trim()).filter(Boolean),
        description: values.description.trim() || null,
        logo: values.logo || null,
      },
    }).catch(() => {});
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex max-w-md flex-col gap-3">
      {!org && <p className="text-sm text-gray-500">Створіть профіль, щоб публікувати квести.</p>}
      <TextField label="Назва організації" registration={register('organizationName')} error={errors.organizationName?.message} />
      <SelectField label="Тип" options={typeOptions(org?.types)} registration={register('types')} error={errors.types?.message} />
      <TextField label="Код ЄДРПОУ (необов’язково)" registration={register('edrpou')} error={errors.edrpou?.message} />
      <TextAreaField label="Контакти (по одному в рядку)" registration={register('contact')} error={errors.contact?.message} />
      <TextAreaField label="Опис" registration={register('description')} error={errors.description?.message} />
      <TextField label="Логотип (URL)" type="url" registration={register('logo')} error={errors.logo?.message} />
      {save.error && <p className="text-sm text-red-600">{save.error.message}</p>}
      {isSubmitSuccessful && !save.error && <p className="text-sm text-green-700">Збережено</p>}
      <button type="submit" disabled={isSubmitting} className={`mt-2 ${BUTTON}`}>
        {org ? 'Зберегти' : 'Створити організацію'}
      </button>
    </form>
  );
}
