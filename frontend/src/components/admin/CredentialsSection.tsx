import type { RegisterUserFormState, Rol } from '../../types/usuario.types';
import RoleSelector from './RoleSelector';

interface CredentialsSectionProps {
  form: RegisterUserFormState;
  errors: { email?: string; rol?: string };
  onChange: (field: keyof RegisterUserFormState, value: string | boolean | Rol) => void;
  onBlur: (field: keyof RegisterUserFormState) => void;
}

export default function CredentialsSection({
  form,
  errors,
  onChange,
  onBlur,
}: CredentialsSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0439D9]"></span>
        <h3 className="text-[#011140] font-bold text-xs tracking-wide">
          CREDENCIALES Y ACCESO
        </h3>
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1">
        <label className="text-[#011140] font-medium text-[0.70rem]">
          Correo Institucional *
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => onChange('email', e.target.value)}
          onBlur={() => onBlur('email')}
          placeholder="usuario@universidad.edu"
          className={`text-xs border rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 transition-colors ${
            errors.email
              ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]'
              : 'border-gray-300 focus:ring-[#E1ECFF]'
          }`}
        />
        <p className="text-gray-400 text-[0.60rem]">
          Dominio permitido: @universidad.edu
        </p>
        {errors.email && (
          <p className="text-[#B91C1C] text-[0.65rem]">⚠️ {errors.email}</p>
        )}
      </div>

      {/* Selector de Rol */}
      <RoleSelector
        value={form.rol}
        onChange={(rol) => onChange('rol', rol)}
        error={errors.rol}
      />

      {/* Toggles */}
      <div className="flex flex-col gap-3 mt-2">
        {/* Estado activo */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#011140] text-[0.70rem] font-semibold">
              Estado de cuenta Activo
            </p>
            <p className="text-gray-400 text-[0.60rem]">
              Permite acceso inmediato al sistema
            </p>
          </div>
          <button
            type="button"
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

        {/* Notificar por email */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#011140] text-[0.70rem] font-semibold">
              Notificar por email
            </p>
            <p className="text-gray-400 text-[0.60rem]">
              Enviar clave provisional de bienvenida
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange('notificarEmail', !form.notificarEmail)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              form.notificarEmail ? 'bg-[#0439D9]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                form.notificarEmail ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}