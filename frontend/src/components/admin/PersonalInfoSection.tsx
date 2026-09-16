import type { RegisterUserFormState } from '../../types/usuario.types';

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
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0439D9]"></span>
        <h3 className="text-[#011140] font-bold text-xs tracking-wide">
          INFORMACIÓN PERSONAL
        </h3>
      </div>

      {/* Nombres */}
      <div className="flex flex-col gap-1">
        <label className="text-[#011140] font-medium text-[0.70rem]">
          Nombres *
        </label>
        <input
          type="text"
          value={form.nombre}
          onChange={(e) => onChange('nombre', e.target.value)}
          onBlur={() => onBlur('nombre')}
          placeholder="Ej. Roberto Carlos"
          className={`text-xs border rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 transition-colors ${
            errors.nombre
              ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]'
              : 'border-gray-300 focus:ring-[#E1ECFF]'
          }`}
        />
        {errors.nombre && (
          <p className="text-[#B91C1C] text-[0.65rem]">⚠️ {errors.nombre}</p>
        )}
      </div>

      {/* Apellidos */}
      <div className="flex flex-col gap-1">
        <label className="text-[#011140] font-medium text-[0.70rem]">
          Apellidos Completos *
        </label>
        <input
          type="text"
          value={form.apellidos}
          onChange={(e) => onChange('apellidos', e.target.value)}
          onBlur={() => onBlur('apellidos')}
          placeholder="Ej. Méndez Quispe"
          className={`text-xs border rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 transition-colors ${
            errors.apellidos
              ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]'
              : 'border-gray-300 focus:ring-[#E1ECFF]'
          }`}
        />
        {errors.apellidos && (
          <p className="text-[#B91C1C] text-[0.65rem]">⚠️ {errors.apellidos}</p>
        )}
      </div>

      {/* Documento (solo CI) */}
      <div className="flex flex-col gap-1">
        <label className="text-[#011140] font-medium text-[0.70rem]">
          Documento de Identidad *
        </label>
        <div className="flex gap-2">
          <div className="flex items-center justify-center px-3 py-2.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-[#011140] font-medium min-w-[60px]">
            CI
          </div>
          <input
            type="text"
            value={form.documento}
            onChange={(e) => {
              const onlyNumbers = e.target.value.replace(/\D/g, '');
              onChange('documento', onlyNumbers);
            }}
            onBlur={() => onBlur('documento')}
            placeholder="8 dígitos"
            maxLength={8}
            className={`flex-1 text-xs border rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 transition-colors ${
              errors.documento
                ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]'
                : 'border-gray-300 focus:ring-[#E1ECFF]'
            }`}
          />
        </div>
        {errors.documento && (
          <p className="text-[#B91C1C] text-[0.65rem]">⚠️ {errors.documento}</p>
        )}
      </div>
    </div>
  );
}