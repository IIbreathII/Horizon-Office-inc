import { useId } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

// Underlined fields with a floating label for the auth pages (same props as shared/ui/FormFields).
// The label sits on the line while the field is empty and moves up on focus or once there is a value.

type FieldProps = {
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
};

const CONTROL =
  'peer block w-full border-0 border-b border-gray-300 bg-transparent px-0 pt-5 pb-1.5 text-base text-gray-900 sm:text-sm outline-none transition-colors focus:border-[#228fff] aria-invalid:border-red-500';

const LABEL = 'pointer-events-none absolute left-0 text-gray-500 transition-all';
// label on the line → raised (peer-* need the label after the control)
const FLOATING =
  'top-5 text-base sm:text-sm peer-focus:top-0 peer-focus:text-xs peer-focus:text-[#228fff] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-autofill:top-0 peer-autofill:text-xs';
const RAISED = 'top-0 text-xs peer-focus:text-[#228fff]';

function Field({ error, children }: { error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">{children}</div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

export function AuthTextField({
  label,
  error,
  registration,
  type = 'text',
  autoComplete,
}: FieldProps & { type?: string; autoComplete?: string }) {
  const id = useId();
  return (
    <Field error={error}>
      {/* placeholder=" " drives :placeholder-shown for the floating label */}
      <input id={id} type={type} autoComplete={autoComplete} placeholder=" " aria-invalid={!!error} className={CONTROL} {...registration} />
      <label htmlFor={id} className={`${LABEL} ${FLOATING}`}>
        {label}
      </label>
    </Field>
  );
}

const PHONE_PREFIX = '+380';

/** Any input (typed, pasted, autofilled, 0XX… or 380…) → "+380 67 123 45 67"; only the prefix while empty. */
export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  // backspacing into the prefix ("+38") keeps it whole instead of reading "38" as the number
  let rest = '380'.startsWith(digits) ? '' : digits.startsWith('380') ? digits.slice(3) : digits;
  // a full number pasted after the prefix ("+380 +380 67…") brings its own 380
  if (rest.length > 9 && rest.startsWith('380')) rest = rest.slice(3);
  // after +380 a number never starts with 0: the local "0" of 0XX is dropped, typed or pasted
  rest = rest.replace(/^0+/, '');
  const groups = [rest.slice(0, 2), rest.slice(2, 5), rest.slice(5, 7), rest.slice(7, 9)].filter(Boolean);
  return [PHONE_PREFIX, ...groups].join(' ');
}

/** Ukrainian phone: "+380" appears on focus and stays, the number is grouped while typing.
 *  An untouched prefix is cleared on blur, so the field reads as empty again. */
export function AuthPhoneField({ label, error, registration }: FieldProps) {
  const id = useId();

  // writes the formatted value into the input, then lets react-hook-form read it
  function update(e: React.FocusEvent<HTMLInputElement> | React.ChangeEvent<HTMLInputElement>, value: string) {
    e.target.value = value;
    registration.onChange(e);
  }

  return (
    <Field error={error}>
      <input
        id={id}
        type="tel"
        autoComplete="tel"
        placeholder=" "
        aria-invalid={!!error}
        className={CONTROL}
        {...registration}
        onFocus={(e) => {
          if (!e.target.value) update(e, PHONE_PREFIX + ' ');
        }}
        onChange={(e) => update(e, formatPhone(e.target.value))}
        onBlur={(e) => {
          if (e.target.value.trim() === PHONE_PREFIX) update(e, '');
          registration.onBlur(e);
        }}
      />
      <label htmlFor={id} className={`${LABEL} ${FLOATING}`}>
        {label}
      </label>
    </Field>
  );
}

export function AuthSelectField({ label, error, registration, options }: FieldProps & { options: readonly { value: string; label: string }[] }) {
  const id = useId();
  return (
    <Field error={error}>
      <select id={id} aria-invalid={!!error} className={`${CONTROL} cursor-pointer`} defaultValue="" {...registration}>
        <option value="" disabled>
          Оберіть…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <label htmlFor={id} className={`${LABEL} ${RAISED}`}>
        {label}
      </label>
    </Field>
  );
}

export function AuthTextAreaField({ label, error, registration }: FieldProps) {
  const id = useId();
  return (
    <Field error={error}>
      <textarea id={id} rows={2} placeholder=" " aria-invalid={!!error} className={`${CONTROL} resize-none`} {...registration} />
      <label htmlFor={id} className={`${LABEL} ${FLOATING}`}>
        {label}
      </label>
    </Field>
  );
}
