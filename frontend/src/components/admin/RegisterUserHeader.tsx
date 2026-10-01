import { X, UserRoundPlus, Check } from 'lucide-react';

interface Props {
  step: 1 | 2;
  onClose: () => void;
}

export default function RegisterUserHeader({ step, onClose }: Props) {
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
                  Paso {step} de 2
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {step === 1
                  ? 'Completa los datos personales del nuevo usuario.'
                  : 'Asigna el correo y rol de acceso.'}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="mt-4 shrink-0 rounded-full bg-[#F1F6FF] p-2 text-[#627A9B] transition-colors hover:bg-gray-100 hover:text-gray-600 sm:mt-0 sm:rounded-lg sm:bg-transparent"
        >
          <X size={20} />
        </button>
      </div>

      <div className="grid shrink-0 grid-cols-2 border-b border-gray-100 px-4 pt-3 sm:px-6">
        <div className={`flex items-center gap-2 border-b-2 pb-3 ${step === 1 ? 'border-[#0439D9] text-[#011140]' : 'border-emerald-400 bg-emerald-50 text-emerald-700'}`}>
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${step === 1 ? 'bg-[#0439D9] text-white' : 'bg-emerald-500 text-white'}`}>
            {step === 2 ? <Check size={12} /> : '1'}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold">Información Personal</p>
            <p className="text-[11px] text-gray-500">{step === 1 ? 'EN CURSO' : 'PASO 1 COMPLETADO'}</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 border-b-2 pb-3 pl-3 ${step === 2 ? 'border-[#0439D9] text-[#011140]' : 'border-gray-200 text-gray-400'}`}>
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${step === 2 ? 'bg-[#0439D9] text-white' : 'bg-gray-200 text-gray-500'}`}>
            2
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold">Credenciales y Acceso</p>
            <p className="text-[11px] text-gray-500">{step === 2 ? 'EN CURSO' : 'Pendiente'}</p>
          </div>
        </div>
      </div>
    </>
  );
}