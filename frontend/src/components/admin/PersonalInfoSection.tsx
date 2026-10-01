import type { RegisterUserFormState } from '../../types/usuario.types';
import { FIELD_LIMITS, sanitizeNombreInput } from '../../utils/validators';

interface PersonalInfoSectionProps {
  form: RegisterUserFormState;
  errors: { nombre?: string; apellidos?: string; documento?: string };
  onChange: (field: keyof RegisterUserFormState, value: string) => void;
  onBlur: (field: keyof RegisterUserFormState) => void;
}

export default function PersonalInfoSection({
  form,
  errors,
  onChange,
  onBlur,
}: PersonalInfoSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="hidden items-center gap-2 sm:flex">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0439D9]"></span>
        <h3 className="text-[#011140] font-bold text-xs tracking-wide">
          INFORMACIÓN PERSONAL
        </h3>
      </div>

      {/* Nombres */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[#011140] font-medium text-xs">
            Nombres <span className="text-red-500">*</span>
          </label>
          <span
            className={`text-xs font-medium ${
              form.nombre.length >= FIELD_LIMITS.nombre.max
                ? 'text-red-500'
                : 'text-gray-400'
            }`}
          >
            {form.nombre.length}/{FIELD_LIMITS.nombre.max}
          </span>
        </div>
        <input
          type="text"
          value={form.nombre}
          onChange={(e) => onChange('nombre', sanitizeNombreInput(e.target.value))}
          onBlur={() => {
            onChange('nombre', sanitizeNombreInput(form.nombre, { trimEnds: true }))
            onBlur('nombre')
          }}
          placeholder="Ej. Roberto Carlos"
          maxLength={FIELD_LIMITS.nombre.max}
          autoComplete="given-name"
          autoCapitalize="words"
          className={`text-xs border rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 transition-colors ${
            errors.nombre
              ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]'
              : 'border-gray-300 focus:ring-[#E1ECFF]'
          }`}
        />
        <p className="hidden text-gray-600 text-xs sm:block">
          Formato: primera mayúscula · Máximo {FIELD_LIMITS.nombre.max} caracteres
        </p>
        {errors.nombre && (
          <p className="text-[#B91C1C] text-xs">⚠️ {errors.nombre}</p>
        )}
      </div>

      {/* Apellidos */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[#011140] font-medium text-xs">
            Apellidos Completos <span className="text-red-500">*</span>
          </label>
          <span
            className={`text-xs font-medium ${
              form.apellidos.length >= FIELD_LIMITS.apellidos.max
                ? 'text-red-500'
                : 'text-gray-400'
            }`}
          >
            {form.apellidos.length}/{FIELD_LIMITS.apellidos.max}
          </span>
        </div>
        <input
          type="text"
          value={form.apellidos}
          onChange={(e) => onChange('apellidos', sanitizeNombreInput(e.target.value))}
          onBlur={() => {
            onChange('apellidos', sanitizeNombreInput(form.apellidos, { trimEnds: true }))
            onBlur('apellidos')
          }}
          placeholder="Ej. Méndez Quispe"
          maxLength={FIELD_LIMITS.apellidos.max}
          autoComplete="family-name"
          autoCapitalize="words"
          className={`text-xs border rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 transition-colors ${
            errors.apellidos
              ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]'
              : 'border-gray-300 focus:ring-[#E1ECFF]'
          }`}
        />
        <p className="hidden text-gray-600 text-xs sm:block">
          Formato: primera mayúscula · Máximo {FIELD_LIMITS.apellidos.max} caracteres
        </p>
        {errors.apellidos && (
          <p className="text-[#B91C1C] text-xs">⚠️ {errors.apellidos}</p>
        )}
      </div>

      {/* Documento */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[#011140] font-medium text-xs">
            Documento de Identidad <span className="text-red-500">*</span>
          </label>
          <span
            className={`text-xs font-medium ${
              form.documento.length >= FIELD_LIMITS.documento.max
                ? 'text-red-500'
                : 'text-gray-400'
            }`}
          >
            {form.documento.length}/{FIELD_LIMITS.documento.max}
          </span>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center justify-center px-3 py-2.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-[#011140] font-medium min-w-[60px]">
            CI
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={form.documento}
            onChange={(e) => {
              const onlyNumbers = e.target.value.replace(/\D/g, '');
              onChange('documento', onlyNumbers);
            }}
            onBlur={() => onBlur('documento')}
            placeholder="8 dígitos"
            maxLength={FIELD_LIMITS.documento.max}
            className={`flex-1 text-xs border rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 transition-colors ${
              errors.documento
                ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]'
                : 'border-gray-300 focus:ring-[#E1ECFF]'
            }`}
          />
        </div>
        <p className="hidden text-gray-600 text-xs sm:block">
          Solo números · Máximo {FIELD_LIMITS.documento.max} caracteres
        </p>
        {errors.documento && (
          <p className="text-[#B91C1C] text-xs">⚠️ {errors.documento}</p>
        )}
      </div>
    </div>
  );
}