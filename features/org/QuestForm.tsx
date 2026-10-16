'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import dynamic from 'next/dynamic';
import { useForm, useWatch } from 'react-hook-form';
import type { QuestInput } from '@/shared/api/dto';
import { CATEGORIES } from '@/shared/categories';
import type { Category, Quest } from '@/shared/types';
import { SelectField, TextAreaField, TextField } from '@/shared/ui/FormFields';
import { BUTTON } from '@/shared/ui/PageShell';
import { questSchema, type QuestValues } from './schemas';

// WebGL does not exist on the server (§4.7)
const CityMap = dynamic(() => import('@/features/map/CityMap').then((m) => m.CityMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-200" />,
});

const CATEGORY_OPTIONS = (Object.keys(CATEGORIES) as Category[]).map((c) => ({ value: c, label: CATEGORIES[c].label }));
const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

type QuestFormProps = {
  /** Existing quest when editing. */
  initial?: Quest;
  submitLabel: string;
  /** Throws on failure; the message is shown under the form. */
  onSubmit: (input: QuestInput) => Promise<void>;
};

/** Quest create / edit form; the location is picked on the city map or typed as lat / lng. */
export function QuestForm({ initial, submitLabel, onSubmit }: QuestFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<QuestValues>({
    resolver: zodResolver(questSchema),
    defaultValues: initial && {
      questName: initial.title,
      description: initial.description,
      category: initial.category,
      address: initial.address === 'Адресу не вказано' ? '' : initial.address,
      lat: initial.lat ?? undefined,
      lng: initial.lng ?? undefined,
      maxVolunteers: initial.slotsTotal,
      rewardXp: initial.xpReward,
      rewardCoins: initial.coinsReward,
    },
  });
  const [lat, lng, category] = useWatch({ control, name: ['lat', 'lng', 'category'] });
  const point = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  async function submit(values: QuestValues) {
    try {
      await onSubmit({
        ...values,
        description: values.description.trim() || null,
        address: values.address.trim() || null,
      });
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Не вдалося зберегти квест' });
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,24rem)_minmax(0,1fr)] gap-6">
      <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-3">
        <TextField label="Назва" registration={register('questName')} error={errors.questName?.message} />
        <SelectField label="Категорія" options={CATEGORY_OPTIONS} registration={register('category')} error={errors.category?.message} />
        <TextAreaField label="Опис" registration={register('description')} error={errors.description?.message} />
        <TextField label="Адреса" registration={register('address')} error={errors.address?.message} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Широта" type="number" step="any" registration={register('lat', { valueAsNumber: true })} error={errors.lat?.message} />
          <TextField label="Довгота" type="number" step="any" registration={register('lng', { valueAsNumber: true })} error={errors.lng?.message} />
        </div>
        <p className="text-xs text-gray-500">Клікніть на мапі, щоб поставити точку, або введіть координати.</p>
        <TextField
          label="Кількість волонтерів"
          type="number"
          registration={register('maxVolunteers', { valueAsNumber: true })}
          error={errors.maxVolunteers?.message}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Нагорода, XP" type="number" registration={register('rewardXp', { valueAsNumber: true })} error={errors.rewardXp?.message} />
          <TextField label="Нагорода, монети" type="number" registration={register('rewardCoins', { valueAsNumber: true })} error={errors.rewardCoins?.message} />
        </div>
        {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
        <button type="submit" disabled={isSubmitting} className={`mt-2 ${BUTTON}`}>
          {isSubmitting ? 'Зберігаємо…' : submitLabel}
        </button>
      </form>

      {/* relative: the map's zoom buttons and attribution are positioned inside this box */}
      <div className="relative h-[36rem] overflow-hidden rounded-lg border border-gray-200">
        <CityMap
          quests={[]}
          selectedId={null}
          panelOpen={false}
          onSelect={() => {}}
          onClose={() => {}}
          pick={{
            point,
            // the select starts empty ('') until a category is chosen
            category: category in CATEGORIES ? category : null,
            onPick: (p) => {
              setValue('lat', round6(p.lat), { shouldValidate: true });
              setValue('lng', round6(p.lng), { shouldValidate: true });
            },
          }}
        />
      </div>
    </div>
  );
}
