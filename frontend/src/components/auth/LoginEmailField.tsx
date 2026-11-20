import { CircleAlert, Mail } from 'lucide-react';
import { DOMINIOS_LOGIN, FIELD_LIMITS } from '../../utils/validators';

interface LoginEmailFieldProps {
  value: string;
  error: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

const DOMAIN_HINT_ID = 'login-email-domain';

/**
 * Campo de correo del login. Mientras no se escriba '@', debajo se ofrecen los dos dominios (personal y
 * estudiante) para completarlo: no se supone uno, para que el personal no entre con el de estudiante.
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
          className={`w-full rounded-xl border border-[#CBD5E1] py-3 pl-11 pr-3 text-sm focus:outline-none focus:ring-1 transition-colors ${
            error
              ? 'border-[#e5baba] bg-[#FEF2F2] focus:ring-[#FECACA]'
              : 'border-[#D8E3F5] focus:ring-[#E1ECFF]'
          }`} />
        

      </div>
      {showDomain && (
        <div id={DOMAIN_HINT_ID} className="grid grid-cols-2 items-center gap-1.5 sm:flex sm:flex-wrap">
          <span className="col-span-2 text-[11px] text-[#64748B]">Completar con:</span>
          {DOMINIOS_LOGIN.map(({ dominio, quien }) => (
            <button
              key={dominio}
              type="button"
              // mousedown sin foco: el campo no pierde el foco ni muestra un error antes de tiempo.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange(`${value.trim()}@${dominio}`)}
              aria-label={`Completar con @${dominio} (${quien.toLowerCase()})`}
              className="inline-flex min-h-8 flex-col items-center justify-center gap-0 rounded-md sm:flex-row sm:gap-1 bg-[#E1ECFF] px-2 py-1 text-[11px] font-bold text-[#0439D9] hover:bg-[#D0E2FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]/40"
            >
              @{dominio}
              <span className="text-[10px] font-medium text-[#45628D] sm:text-[11px]"><span className="hidden sm:inline">· </span>{quien}</span>
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="text-[0.8rem] font-bold text-[#7F1D1D] flex items-center gap-1">
          <CircleAlert size={12} className='text-[#7F1D1D]' strokeWidth={3} /> {error}
        </p>
      )}
    </div>
  );
}
