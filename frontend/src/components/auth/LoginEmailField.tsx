import { CircleAlert, Mail } from 'lucide-react';
import { ALLOWED_EMAIL_DOMAIN, FIELD_LIMITS } from '../../utils/validators';

interface LoginEmailFieldProps {
  value: string;
  error: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

const DOMAIN_HINT_ID = 'login-email-domain';

/**
 * Campo de correo del login. Si el usuario no escribe '@', muestra el dominio
 * institucional como un botón clickeable que lo autocompleta.
 */
export default function LoginEmailField({ value, error, onChange, onBlur }: LoginEmailFieldProps) {
  const showDomain = !value.includes('@');

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="login-email" className="text-xs font-semibold text-[#011140]">CORREO ELECTRÓNICO</label>
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={17} aria-hidden="true" />
        <input
          id="login-email"
          type="text"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="usuario o código SIS"
          maxLength={FIELD_LIMITS.email.max}
          aria-invalid={Boolean(error)}
          aria-describedby={showDomain ? DOMAIN_HINT_ID : undefined}
          className={`w-full rounded-xl border border-[#CBD5E1] py-3 pl-11 ${showDomain ? 'pr-32' : 'pr-3'} text-sm focus:outline-none focus:ring-1 transition-colors ${
            error
              ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]'
              : 'border-[#D8E3F5] focus:ring-[#E1ECFF]'
          }`} />
        
        {/* 🆕 Ahora es un botón clickeable en lugar de un span estático */}
        {showDomain && (
          <button
            type="button"
            id={DOMAIN_HINT_ID}
            onMouseDown={(e) => {
              e.preventDefault(); // Evita que el input pierda el foco y salte un error prematuro
              onChange(`${value}@${ALLOWED_EMAIL_DOMAIN}`); // Autocompleta el valor
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-[#E1ECFF] px-2 py-1 text-[10px] font-bold text-[#0439D9] hover:bg-[#D0E2FF]"
          >
            @{ALLOWED_EMAIL_DOMAIN}
          </button>
        )}
      </div>
      {error && (
        <p className="text-[#B91C1C] text-[0.70rem] flex items-center gap-1">
          <CircleAlert size={12} /> {error}
        </p>
      )}
    </div>
  );
}