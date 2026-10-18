import { ArrowRight, Crosshair, KeyRound } from 'lucide-react';

interface HeaderProps {
  /** Si se pasa, muestra el botón "Iniciar Sesión" (landing). */
  onIniciarSesion?: () => void;
}

export default function Header({ onIniciarSesion }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-gray-100 bg-white px-3 py-2 shadow-sm shadow-[#92aad2] sm:px-6 sm:py-1.5">
      <div className="min-w-0 flex flex-col items-start">
        <img src="/logo_app.png" alt="NexaCore" className="h-8" />
        <p className="hidden px-2 text-[0.65rem] font-semibold text-gray-600 sm:block">
          SISTEMA DE CONTROL & INGRESO A EXÁMENES
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-sm font-semibold text-[#011140] shadow-sm hover:bg-[#e9f1ff] sm:px-4"
          aria-label="Mesa de Ayuda"
        >
          <Crosshair className="h-6 w-6 text-[#0A2B99] rotate-45" aria-hidden="true" />
          <span className="hidden sm:inline text-[#011140]">Mesa de Ayuda</span>
        </button>

        {onIniciarSesion && (
          <button
            type="button"
            onClick={onIniciarSesion}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0439D9] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0027a2] sm:px-4"
          >
            <KeyRound size={16} aria-hidden="true" />
            Iniciar Sesión
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </header>
  );
}
