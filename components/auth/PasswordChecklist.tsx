type Requirement = {
  label: string;
  met: boolean;
};

function getRequirements(password: string): Requirement[] {
  return [
    { label: "Mínimo 8 caracteres", met: password.length >= 8 },
    { label: "Una letra mayúscula (A–Z)", met: /[A-Z]/.test(password) },
    { label: "Un número (0–9)", met: /[0-9]/.test(password) },
    { label: "Un carácter especial (!@#$%...)", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function PasswordChecklist({ password }: { password: string }) {
  const requirements = getRequirements(password);

  return (
    <div
      className="mt-2 space-y-1 px-1"
      aria-label="Requisitos de contraseña"
      role="list"
    >
      {requirements.map((req) => (
        <div
          key={req.label}
          role="listitem"
          className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
            req.met ? "text-[#22C55E]" : "text-[#94A3B8]"
          }`}
        >
          <span
            className={`shrink-0 w-3.5 h-3.5 flex items-center justify-center ${
              req.met ? "check-pop" : ""
            }`}
          >
            {req.met ? (
              <svg
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
            )}
          </span>
          {req.label}
        </div>
      ))}
    </div>
  );
}
