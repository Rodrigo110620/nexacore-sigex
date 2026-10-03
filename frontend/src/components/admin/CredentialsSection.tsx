import type { RegisterUserFormState, Rol } from '../../types/usuario.types';
import { FIELD_LIMITS } from '../../utils/validators';
import RoleSelector from './RoleSelector';

interface CredentialsSectionProps {
  form: RegisterUserFormState;
  onChange: (field: keyof RegisterUserFormState, value: string | boolean | Rol) => void;
  onBlur: (field: keyof RegisterUserFormState) => string;
  onFieldError?: (field: string, message: string) => void;
  showPasswordNotice?: boolean;
}

export default function CredentialsSection({
  form,
  onChange,
  onBlur,
  onFieldError,
  showPasswordNotice = true,
}: CredentialsSectionProps) {
  const handleBlurWithError = (field: keyof RegisterUserFormState) => {
    const error = onBlur(field);
    if (error) {
      onFieldError?.(field, error);
    }
  };

  /** Al presionar Enter, hace blur para validar */
  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    (e.target as HTMLInputElement).blur();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden items-center gap-2 sm:flex">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0439D9]"></span>
        <h3 className="text-[#011140] font-bold text-xs tracking-wide">
          CREDENCIALES Y ACCESO
        </h3>
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1">
        <label className="text-[#011140] font-medium text-xs">
          Correo Electrónico <span className="text-red-500">*</span>
        </label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={(e) => onChange('email', e.target.value)}
          onBlur={() => handleBlurWithError('email')}
          onKeyDown={handleEnter}
          placeholder="usuario@est.umss.edu"
          maxLength={FIELD_LIMITS.email.max}
          className="text-xs border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#E1ECFF] transition-colors"
        />
        <p className="hidden text-gray-600 text-xs sm:block">
          Dominio permitido: @est.umss.edu o @umss.edu.bo · Máximo {FIELD_LIMITS.email.max} caracteres
        </p>
      </div>

      {/* Selector de Rol */}
      <RoleSelector
        value={form.rol}
        onChange={(rol) => onChange('rol', rol)}
      />

      {/* Toggles */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#011140] text-xs font-semibold">
              Estado de cuenta Activo
            </p>
            <p className="text-gray-400 text-xs">
              Permite acceso inmediato al sistema
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Estado de cuenta activo"
            aria-checked={form.activo}
            onClick={() => onChange('activo', !form.activo)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              form.activo ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                form.activo ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {showPasswordNotice && (
          <div className="rounded-lg border border-[#DBEAFE] bg-[#F8FBFF] px-3 py-2.5">
            <p className="text-xs font-semibold text-[#011140]">
              Credenciales por correo
            </p>
            <p className="text-xs leading-relaxed text-gray-500">
              La contraseña provisional se envía automáticamente al correo institucional del usuario. No se muestra en pantalla.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}