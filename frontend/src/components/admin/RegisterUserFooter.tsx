import { Check, Dot, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  step: 1 | 2;
  loading: boolean;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
}

export default function RegisterUserFooter({ step, loading, onClose, onBack, onNext }: Props) {
  return (
    <div className="shrink-0 border-t border-[#e3eaf1] bg-white px-4 py-3 sm:bg-[#f8fbff] sm:px-6 sm:py-4">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="hidden text-[10px] text-gray-400 sm:flex sm:items-center">
          <span className="text-[#3B82F6]"><Dot /></span> Campos con (*) son mandatorios
        </p>
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={step === 1 ? onClose : onBack}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-[#C9D7EC] px-4 py-2 text-sm font-semibold text-[#45628D] transition-colors hover:bg-gray-100 disabled:opacity-50 sm:w-auto sm:px-5 sm:py-2.5"
          >
            {step === 1 ? 'Cancelar' : (
              <>
                <ChevronLeft size={16} aria-hidden="true" />
                Atrás
              </>
            )}
          </button>
          {step === 1 ? (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-lg bg-[#0439D9] px-4 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#0027a2] sm:w-auto sm:px-6 sm:py-2.5"
            >
              Siguiente paso
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-5 sm:py-2.5"
            >
              {loading ? 'Registrando...' : (
                <>
                  <span className="sm:hidden">+ Registrar Usuario</span>
                  <span className="hidden sm:flex sm:items-center gap-2">
                    <Check size={18} strokeWidth={4} aria-hidden="true" className="shrink-0" />
                    Guardar y Registrar usuario
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}