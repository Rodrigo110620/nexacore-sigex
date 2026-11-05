import { X, UserRoundPlus, Check } from 'lucide-react';
import type { PasoRegistro } from './useRegisterUserForm';

interface Props {
  step: PasoRegistro;
  /** Nombre del paso 3 según el rol: Materias (DOCENTE), Acceso (ADMIN) o Control. */
  pasoDelRol: string;
  onClose: () => void;
}

const DESCRIPCION: Record<PasoRegistro, string> = {
  1: 'Elige el rol: cada uno pide sus propios datos.',
  2: 'Completa los datos personales y el correo institucional.',
  3: 'Completa lo propio del rol elegido.',
  4: 'Revisa los datos y confirma el registro.',
};

/** Registro de usuario en 4 pasos: Rol · Datos · lo propio del rol · Confirmar. */
export default function RegisterUserHeader({ step, pasoDelRol, onClose }: Props) {
  const pasos = ['Rol', 'Datos', pasoDelRol, 'Confirmar'];
  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-2 sm:px-6 sm:pb-4 sm:pt-5">
        <div className="min-w-0 flex-1">
          <div aria-hidden="true" className="mx-auto mb-3 h-1 w-11 rounded-full bg-[#C4D2E7] sm:hidden" />
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]">
              <UserRoundPlus size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="register-user-title" className="text-sm font-bold text-[#011140] sm:text-sm">
                  Registrar Usuario
                </h2>
                <span className="rounded bg-[#E9F1FF] px-2 py-0.5 text-xs font-bold text-[#0439D9]">
                  Paso {step} de 4
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{DESCRIPCION[step]}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          onMouseDown={(e) => e.preventDefault()}
          aria-label="Cerrar"
          className="mt-4 shrink-0 rounded-full bg-[#F1F6FF] p-2 text-[#627A9B] transition-colors hover:bg-gray-100 hover:text-gray-600 sm:mt-0 sm:rounded-lg sm:bg-transparent"
        >
          <X size={20} />
        </button>
      </div>

      <ol aria-label="Pasos del registro" className="flex shrink-0 items-center gap-1.5 border-b border-gray-100 px-4 py-3 sm:gap-2 sm:px-6">
        {pasos.map((nombre, i) => {
          const num = (i + 1) as PasoRegistro;
          const hecho = num < step;
          const actual = num === step;
          return (
            <li key={nombre} aria-current={actual ? 'step' : undefined} className={`flex min-w-0 items-center gap-1.5 ${actual ? '' : 'max-sm:shrink-0'}`}>
              <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                actual ? 'bg-gradient-to-br from-[#2563EB] to-[#6D28D9] text-white' : hecho ? 'bg-[#0439D9] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
              }`}>
                {hecho ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : num}
              </span>
              <span className={`truncate text-[11px] font-semibold ${actual ? 'text-[#011140]' : hecho ? 'text-[#011140] max-sm:hidden' : 'text-[#94A3B8] max-sm:hidden'}`}>
                {nombre}
              </span>
              {i < pasos.length - 1 && <span aria-hidden="true" className={`h-0.5 w-4 shrink-0 rounded sm:w-6 ${hecho ? 'bg-[#0439D9]' : 'bg-[#E2E8F0]'}`} />}
            </li>
          );
        })}
      </ol>
    </>
  );
}
