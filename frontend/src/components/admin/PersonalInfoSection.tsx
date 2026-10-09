import type { FormErrors,RegisterUserFormState } from '../../types/usuario.types';
import { FIELD_LIMITS, sanitizeNombreInput } from '../../utils/validators';

interface PersonalInfoSectionProps {
  form: RegisterUserFormState;
  errors?: FormErrors;
  onChange: (field: keyof RegisterUserFormState, value: string) => void;
  onBlur: (field: keyof RegisterUserFormState) => string;
  onFieldError?: (field: string, message: string) => void;
}

export default function PersonalInfoSection({
  form,
  errors,
  onChange,
  onBlur,
  onFieldError,
}: PersonalInfoSectionProps) {
  const handleBlurWithError = (field: keyof RegisterUserFormState) => {
    const error = onBlur(field);
    if (error) {
      onFieldError?.(field, error);
    }
  };

  /** Al presionar Enter, pasa al siguiente campo */
  const handleEnter = (currentField: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const fieldOrder = ['nombre', 'apellidos', 'documento'];
    const currentIndex = fieldOrder.indexOf(currentField);
    const nextField = fieldOrder[currentIndex + 1];

    if (nextField) {
      const input = document.querySelector(`[name="${nextField}"]`) as HTMLInputElement;
      if (input) input.focus();
    } else {
      // Es el último campo: hacer blur para validar
      (e.target as HTMLInputElement).blur();
    }
  };

  /** Cuando el documento llegue a 8 dígitos, hacer blur automático */
  const handleDocumentoChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, '');
    onChange('documento', onlyNumbers);

    if (onlyNumbers.length === FIELD_LIMITS.documento.max) {
      setTimeout(() => {
        const input = document.querySelector('[name="documento"]') as HTMLInputElement;
        if (input) input.blur();
      }, 100);
    }
  };

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
          name="nombre"
          type="text"
          value={form.nombre}
          onChange={(e) => onChange('nombre', sanitizeNombreInput(e.target.value))}
          onBlur={() => {
            onChange('nombre', sanitizeNombreInput(form.nombre, { trimEnds: true }));
            handleBlurWithError('nombre');
          }}
          onKeyDown={handleEnter('nombre')}
          placeholder="Ej. Roberto Carlos"
          maxLength={FIELD_LIMITS.nombre.max}
          autoComplete="given-name"
          autoCapitalize="words"
          autoFocus
          className="text-xs border border-gray-300 rounded-md py-2.5 px-3 transition-colors focus:border-[#0439D9] focus:outline-none focus:ring-2 focus:ring-[#DCE7FF]"
        />
        <p className=" text-gray-600 text-xs">
          Formato: primera mayúscula · Máximo {FIELD_LIMITS.nombre.max} caracteres
        </p>
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
          name="apellidos"
          type="text"
          value={form.apellidos}
          onChange={(e) => onChange('apellidos', sanitizeNombreInput(e.target.value))}
          onBlur={() => {
            onChange('apellidos', sanitizeNombreInput(form.apellidos, { trimEnds: true }));
            handleBlurWithError('apellidos');
          }}
          onKeyDown={handleEnter('apellidos')}
          placeholder="Ej. Méndez Quispe"
          maxLength={FIELD_LIMITS.apellidos.max}
          autoComplete="family-name"
          autoCapitalize="words"
          className="text-xs border border-gray-300 rounded-md py-2.5 px-3 transition-colors focus:border-[#0439D9] focus:outline-none focus:ring-2 focus:ring-[#DCE7FF]"
        />
        <p className=" text-gray-600 text-xs">
          Formato: primera mayúscula · Máximo {FIELD_LIMITS.apellidos.max} caracteres
        </p>
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
            name="documento"
            type="text"
            inputMode="numeric"
            value={form.documento}
            onChange={(e) => handleDocumentoChange(e.target.value)}
            onBlur={() => handleBlurWithError('documento')}
            onKeyDown={handleEnter('documento')}
            placeholder="8 dígitos"
            maxLength={FIELD_LIMITS.documento.max}
            className="flex-1 text-xs border border-gray-300 rounded-md py-2.5 px-3 transition-colors focus:border-[#0439D9] focus:outline-none focus:ring-2 focus:ring-[#DCE7FF]"
          />
        </div>
        
        {errors?.documento ? (
        <p className="text-red-500 text-xs mt-1 font-medium">
          {errors.documento}
        </p>
      ) : (
        <p className="hidden text-gray-600 text-xs sm:block">
          Solo números · Máximo {FIELD_LIMITS.documento.max} caracteres
        </p>
      )}
    </div>
  </div>
  );
}