import type { UseFormRegisterReturn } from 'react-hook-form';

type FieldProps = {
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
};

const CONTROL = 'w-full rounded border border-gray-300 px-3 py-2 text-sm aria-invalid:border-red-500';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function TextField({
  label,
  error,
  registration,
  type = 'text',
  autoComplete,
  step,
}: FieldProps & { type?: string; autoComplete?: string; step?: string }) {
  return (
    <Field label={label} error={error}>
      <input type={type} step={step} autoComplete={autoComplete} aria-invalid={!!error} className={CONTROL} {...registration} />
    </Field>
  );
}

export function SelectField({ label, error, registration, options }: FieldProps & { options: readonly { value: string; label: string }[] }) {
  return (
    <Field label={label} error={error}>
      <select aria-invalid={!!error} className={CONTROL} defaultValue="" {...registration}>
        <option value="" disabled>
          Оберіть…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function TextAreaField({ label, error, registration }: FieldProps) {
  return (
    <Field label={label} error={error}>
      <textarea rows={3} aria-invalid={!!error} className={CONTROL} {...registration} />
    </Field>
  );
}
