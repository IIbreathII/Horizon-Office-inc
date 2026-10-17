'use client';

import { createContext, useContext } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

type FieldProps = {
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
};

// Fields render light by default (auth pages); wrap a section in <FieldTone tone="dark"> for the dark areas.
type Tone = 'light' | 'dark';
const ToneContext = createContext<Tone>('light');

export function FieldTone({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <ToneContext value={tone}>{children}</ToneContext>;
}

const STYLES: Record<Tone, { control: string; label: string; error: string }> = {
  light: {
    control: 'w-full rounded border border-gray-300 px-3 py-2 text-sm aria-invalid:border-red-500',
    label: '',
    error: 'text-xs text-red-600',
  },
  dark: {
    control:
      'w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm text-white scheme-dark outline-none transition-colors placeholder:text-neutral-500 hover:border-white/25 focus:border-amber-300/80 focus:ring-2 focus:ring-amber-300/25 aria-invalid:border-rose-400/80',
    label: 'font-medium text-neutral-300',
    error: 'text-xs text-rose-300',
  },
};

function useStyles() {
  return STYLES[useContext(ToneContext)];
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className={styles.label}>{label}</span>
      {children}
      {error && <span className={styles.error}>{error}</span>}
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
  const styles = useStyles();
  return (
    <Field label={label} error={error}>
      <input type={type} step={step} autoComplete={autoComplete} aria-invalid={!!error} className={styles.control} {...registration} />
    </Field>
  );
}

export function SelectField({ label, error, registration, options }: FieldProps & { options: readonly { value: string; label: string }[] }) {
  const styles = useStyles();
  return (
    <Field label={label} error={error}>
      <select aria-invalid={!!error} className={styles.control} defaultValue="" {...registration}>
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
  const styles = useStyles();
  return (
    <Field label={label} error={error}>
      <textarea rows={3} aria-invalid={!!error} className={styles.control} {...registration} />
    </Field>
  );
}
