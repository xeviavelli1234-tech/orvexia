type InputFieldProps = {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  /** Show green success state (icon only, no text) */
  valid?: boolean;
  disabled?: boolean;
};

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      className="w-3 h-3 shrink-0"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function InputField({
  id,
  name,
  label,
  type = "text",
  placeholder,
  autoComplete,
  value,
  onChange,
  onBlur,
  error,
  valid,
  disabled,
}: InputFieldProps) {
  const hasError = !!error;
  const hasSuccess = valid && !hasError;

  const borderCls = hasError
    ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
    : hasSuccess
    ? "border-[#22C55E] focus:border-[#22C55E] focus:ring-[#22C55E]/20"
    : "border-[#E2E8F0] focus:border-[#2563EB] focus:ring-[#2563EB]/20";

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-[#0F172A]">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`p-3 pr-10 rounded-[10px] block bg-[#F8FAFC] text-[#0F172A] w-full border placeholder-[#94A3B8] focus:outline-none focus:ring-2 transition-all duration-200 ${borderCls} disabled:opacity-60`}
        />

        {hasSuccess && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#22C55E] pointer-events-none">
            <CheckIcon />
          </span>
        )}
        {hasError && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#EF4444] pointer-events-none">
            <XIcon />
          </span>
        )}
      </div>

      {hasError && (
        <p
          id={`${id}-error`}
          role="alert"
          aria-live="polite"
          className="text-xs text-[#EF4444] flex items-center gap-1 field-msg"
        >
          <ErrorIcon />
          {error}
        </p>
      )}
    </div>
  );
}
