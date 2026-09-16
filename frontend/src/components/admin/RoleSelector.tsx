import { Shield, BookOpen, Eye } from 'lucide-react';
import { ROLES_OPTIONS, type Rol } from '../../types/usuario.types';

interface RoleSelectorProps {
  value: Rol;
  onChange: (value: Rol) => void;
  error?: string;
}

const ICONS = {
  ADMIN: Shield,
  DOCENTE: BookOpen,
  CONTROL: Eye,
};

export default function RoleSelector({ value, onChange, error }: RoleSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[#011140] font-medium text-[0.70rem]">
        Rol Asignado en Plataforma *
      </label>

      <div className="grid grid-cols-3 gap-3">
        {ROLES_OPTIONS.map((rol) => {
          const Icon = ICONS[rol.value];
          const isSelected = value === rol.value;

          return (
            <button
              key={rol.value}
              type="button"
              onClick={() => onChange(rol.value)}
              className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'border-[#0439D9] bg-[#E1ECFF] shadow-sm'
                  : 'border-gray-200 bg-white hover:border-[#0439D9]/50'
              }`}
            >
              <Icon
                size={20}
                className={isSelected ? 'text-[#0439D9]' : 'text-gray-400'}
              />
              <span
                className={`text-[0.70rem] font-bold ${
                  isSelected ? 'text-[#0439D9]' : 'text-[#011140]'
                }`}
              >
                {rol.titulo}
              </span>
              <span
                className={`text-[0.55rem] font-semibold tracking-wider ${
                  rol.value === 'ADMIN'
                    ? 'text-[#0439D9]'
                    : rol.value === 'DOCENTE'
                    ? 'text-green-600'
                    : 'text-orange-500'
                }`}
              >
                {rol.subtitulo}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-[#B91C1C] text-[0.65rem]">⚠️ {error}</p>}
    </div>
  );
}