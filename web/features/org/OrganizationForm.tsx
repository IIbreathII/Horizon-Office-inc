'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ORGANIZATION_TYPES } from '@/features/auth/schemas';
import { useMyOrganization, useSaveOrganization } from '@/shared/api/queries';
import type { Organization } from '@/shared/types';
import { SelectField, TextAreaField, TextField } from '@/shared/ui/FormFields';
import { LineIcon } from '@/shared/ui/LineIcon';
import { BUTTON_PRIMARY, FAINT, PANEL } from '@/shared/ui/surface';
import { organizationProfileSchema, type OrganizationProfileValues } from './schemas';

/** Known types plus the organization's current one if the backend has another value (so saving keeps it). */
function typeOptions(current: string | null | undefined) {
  const known = ORGANIZATION_TYPES.some((t) => t.value === current);
  return current && !known ? [...ORGANIZATION_TYPES, { value: current, label: current }] : ORGANIZATION_TYPES;
}

/** Create (POST /organizations) or edit (PATCH /organizations/me) the organization profile. */
export function OrganizationProfile() {
  const { data: org, isPending, isError } = useMyOrganization();

  if (isPending) return <p className={`text-sm ${FAINT}`}>Завантаження…</p>;
  if (isError) return <p className={`p-5 text-sm text-rose-300 ${PANEL}`}>Не вдалося завантажити організацію. Оновіть сторінку</p>;
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
    <form onSubmit={handleSubmit(submit)} noValidate className={`flex max-w-2xl flex-col gap-4 p-6 sm:p-7 ${PANEL}`}>
      {!org && (
        <p className="flex items-center gap-2 rounded-xl bg-amber-300/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-300/40">
          <LineIcon name="building" className="size-4" />
          Створіть профіль, щоб публікувати квести.
        </p>
      )}
      <TextField label="Назва організації" registration={register('organizationName')} error={errors.organizationName?.message} />
      <SelectField label="Тип" options={typeOptions(org?.types)} registration={register('types')} error={errors.types?.message} />
      <TextField label="Код ЄДРПОУ (необов’язково)" registration={register('edrpou')} error={errors.edrpou?.message} />
      <TextAreaField label="Контакти (по одному в рядку)" registration={register('contact')} error={errors.contact?.message} />
      <TextAreaField label="Опис" registration={register('description')} error={errors.description?.message} />
      <TextField label="Логотип (URL)" type="url" registration={register('logo')} error={errors.logo?.message} />
      {save.error && <p className="text-sm text-rose-300">{save.error.message}</p>}
      {isSubmitSuccessful && !save.error && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-300">
          <LineIcon name="check" className="size-4" />
          Збережено
        </p>
      )}
      <button type="submit" disabled={isSubmitting} className={`mt-2 self-start ${BUTTON_PRIMARY}`}>
        {org ? 'Зберегти' : 'Створити організацію'}
      </button>
    </form>
  );
}
