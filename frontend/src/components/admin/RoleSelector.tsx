import { Shield, BookOpen, Eye, Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { ROLES_OPTIONS, type Rol } from '../../types/usuario.types';
import { useRoles } from '../../hooks/useRoles';

interface RoleSelectorProps {
  value: Rol;
  onChange: (value: Rol) => void;
  error?: string;
}

const ROLES_PRINCIPALES = new Set(['ADMIN', 'DOCENTE', 'CONTROL']);

const ICONS: Record<string, typeof Shield> = {
  ADMIN: Shield,
  DOCENTE: BookOpen,
  CONTROL: Eye,
};

export default function RoleSelector({ value, onChange, error }: RoleSelectorProps) {
  const { roles, cargando, crearRol } = useRoles()
  const [nuevoRol, setNuevoRol] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorRol, setErrorRol] = useState('')

  const rolesExtra = roles.filter(r => !ROLES_PRINCIPALES.has(r.value))

  const handleAgregarRol = async () => {
    const nombre = nuevoRol.trim().toUpperCase()
    if (!nombre) return
    if (!/^[A-Z_]+$/.test(nombre)) {
      setErrorRol('Solo letras mayúsculas y guiones bajos')
      return
    }
    setGuardando(true)
    setErrorRol('')
    try {
      await crearRol(nombre)
      setNuevoRol('')
      onChange(nombre)
    } catch {
      setErrorRol('Ese rol ya existe o hubo un error')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-[#011140] font-medium text-[0.70rem]">Rol Asignado en Plataforma *</label>
        <div className="h-20 rounded-lg border border-gray-200 bg-gray-50 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[#011140] font-medium text-[0.70rem]">
        Rol Asignado en Plataforma *
      </label>

      {/* Tarjetas principales — siempre los 3 fijos */}
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
              <Icon size={20} className={isSelected ? 'text-[#0439D9]' : 'text-gray-400'} />
              <span className={`text-[0.70rem] font-bold ${isSelected ? 'text-[#0439D9]' : 'text-[#011140]'}`}>
                {rol.titulo}
              </span>
              <span className={`text-[0.55rem] font-semibold tracking-wider ${
                rol.value === 'ADMIN' ? 'text-[#0439D9]'
                : rol.value === 'DOCENTE' ? 'text-green-600'
                : 'text-orange-500'
              }`}>
                {rol.subtitulo}
              </span>
            </button>
          )
        })}
      </div>

      {/* Roles adicionales — aparecen solo si existen en la BD */}
      {rolesExtra.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          <p className="text-gray-400 text-[0.60rem] font-medium tracking-wide">ROLES ADICIONALES</p>
          <div className="flex flex-wrap gap-2">
            {rolesExtra.map((rol) => {
              const isSelected = value === rol.value
              return (
                <button
                  key={rol.value}
                  type="button"
                  onClick={() => onChange(rol.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[0.70rem] font-semibold transition-all ${
                    isSelected
                      ? 'border-[#0439D9] bg-[#E1ECFF] text-[#0439D9]'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-[#0439D9]/50'
                  }`}
                >
                  <Shield size={12} />
                  {rol.value}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Agregar rol nuevo */}
      <div className="flex flex-col gap-1 mt-1">
        <p className="text-gray-400 text-[0.60rem] font-medium tracking-wide">AGREGAR ROL</p>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={nuevoRol}
            onChange={e => { setNuevoRol(e.target.value.toUpperCase()); setErrorRol('') }}
            onKeyDown={e => e.key === 'Enter' && handleAgregarRol()}
            placeholder="Ej: SUPERVISOR"
            maxLength={30}
            className="flex-1 text-xs border border-gray-200 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-[#E1ECFF] uppercase"
          />
          <button
            type="button"
            onClick={handleAgregarRol}
            disabled={guardando || !nuevoRol.trim()}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#0439D9] text-white text-xs font-semibold rounded-md hover:bg-[#0027a2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {guardando
              ? <Loader2 size={12} className="animate-spin" />
              : <Plus size={12} />
            }
            Agregar
          </button>
        </div>
        {errorRol && <p className="text-[#B91C1C] text-[0.65rem]">⚠️ {errorRol}</p>}
      </div>

      {error && <p className="text-[#B91C1C] text-[0.65rem]">⚠️ {error}</p>}
    </div>
  );
}