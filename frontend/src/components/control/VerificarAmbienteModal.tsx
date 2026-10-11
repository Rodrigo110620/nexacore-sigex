import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Landmark, DoorOpen, Calendar, Clock, User, CheckCircle2, LoaderCircle } from 'lucide-react';
import type { ContextoControlIngreso } from '../../types/controlIngreso';
import FotoEstudiante from '../estudiantes/FotoEstudiante';
import { registrarAmbienteIncorrecto, type IntentoIngreso } from '../../services/intentoIngresoService';
import { AMBIENTE_MAX, isNetworkError, isOffline, sanitizeAmbienteInput, validarAulaActual } from '../../utils/examFormUtils';

interface VerificarAmbienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Se llama cuando el servidor guardó el reporte: la pantalla debe impedir la autorización. */
  onReportado: (registro: IntentoIngreso) => void;
  ctx: ContextoControlIngreso | null;
  usuarioNombre: string;
}

const SIN_CONEXION = 'No se pudo registrar el reporte porque no hay conexión a Internet. El aula ingresada se conserva: vuelve a presionar "Reportar incidencia" cuando recuperes la conexión.';

function fechaCorta(fecha: Date): string {
  return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function horaCorta(fecha: Date): string {
  return fecha.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export const VerificarAmbienteModal: React.FC<VerificarAmbienteModalProps> = ({ isOpen, ctx, ...props }) => {
  // Se monta solo mientras está abierta: cada apertura empieza con el formulario limpio.
  if (!isOpen || !ctx) return null;
  return <ContenidoAmbienteModal ctx={ctx} {...props} />;
};

type ContenidoProps = Omit<VerificarAmbienteModalProps, 'isOpen' | 'ctx'> & { ctx: ContextoControlIngreso };

function ContenidoAmbienteModal({ onClose, onReportado, ctx, usuarioNombre }: ContenidoProps) {
  const [aulaActual, setAulaActual] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [registro, setRegistro] = useState<IntentoIngreso | null>(null);
  const [ahora, setAhora] = useState(() => new Date());

  // Reloj mientras no se haya guardado; después se muestra la hora oficial del servidor.
  useEffect(() => {
    if (registro) return;
    const id = window.setInterval(() => setAhora(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [registro]);

  const aulaEsperada = ctx.ambiente || '';
  const errorAula = validarAulaActual(aulaActual, aulaEsperada);
  const momento = registro ? new Date(registro.fechaHora) : ahora;
  const responsable = registro ? registro.personalControl : usuarioNombre;
  const iniciales = ctx.estudiante.split(' ').slice(0, 2).map((n) => n[0]).join('');

  const reportar = async () => {
    setIntentado(true);
    setErrorEnvio('');
    if (errorAula) return;
    if (isOffline()) {
      setErrorEnvio(SIN_CONEXION);
      return;
    }
    setGuardando(true);
    try {
      const guardado = await registrarAmbienteIncorrecto({
        idExamen: ctx.idExamen,
        idEstudiante: ctx.idEstudiante,
        aulaActual,
      });
      setRegistro(guardado);
      onReportado(guardado);
    } catch (err) {
      const mensaje = (err as { response?: { data?: { mensaje?: string } } }).response?.data?.mensaje;
      setErrorEnvio(isNetworkError(err) ? SIN_CONEXION : mensaje ?? 'No se pudo registrar el reporte. Inténtalo nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-[2px] p-4" role="dialog" aria-modal="true" aria-label="Verificar ambiente de ingreso">
      <div className="relative w-full max-w-[540px] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[32px] bg-white shadow-2xl border border-gray-100 p-6 sm:p-8">

        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icono superior */}
        <div className="flex flex-col items-center text-center mb-6">
          {registro ? (
            <div className="w-16 h-16 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#087F59] mb-4 border border-[#A7F3D0]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#FEF3C7] flex items-center justify-center text-[#D97706] mb-4 shadow-[0_8px_25px_rgba(251,191,36,0.25)] border border-[#FDE68A]">
              <AlertTriangle className="w-8 h-8 fill-[#D97706] text-[#FEF3C7]" />
            </div>
          )}
          <h3 className="text-[20px] font-extrabold text-[#111827] tracking-tight">
            {registro ? 'INCIDENCIA REGISTRADA' : 'AMBIENTE NO CORRESPONDE'}
          </h3>
        </div>

        {/* Tarjeta de información del estudiante */}
        <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3.5">
            <FotoEstudiante fotoUrl={ctx.fotoUrl} nombre={ctx.estudiante} iniciales={iniciales} className="w-12 h-12 rounded-xl shrink-0 grid place-items-center overflow-hidden bg-[#0439D9] text-white font-bold text-sm shadow-sm" />
            <div>
              <h4 className="font-bold text-[#111827] text-base">{ctx.estudiante}</h4>
              <p className="text-xs text-[#0439D9] font-bold">Cód: {ctx.codigoSis}</p>
              <p className="text-xs text-[#4B5563]">Carrera: {ctx.carrera || 'No registrada'}</p>
            </div>
          </div>
        </div>

        {/* Bloque comparativo de Aulas */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 mb-4">
          {/* Aula Esperada */}
          <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-4 flex flex-col justify-between h-full">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#065F46]">AULA ESPERADA</span>
            <div className="flex items-center gap-2.5 mt-3 min-w-0">
              <Landmark className="w-6 h-6 shrink-0 text-[#0439D9]" />
              <span className="truncate text-[24px] font-black text-[#0439D9] tracking-tight leading-none">{aulaEsperada || '—'}</span>
            </div>
          </div>

          {/* Símbolo Diferente */}
          <div className="w-9 h-9 rounded-full bg-[#E5E7EB] text-[#6B7280] font-bold flex items-center justify-center text-sm z-10 shrink-0 shadow-sm">
            ≠
          </div>

          {/* Aula Actual: la indica el personal de control */}
          <div className={`bg-[#F8F9FB] border rounded-2xl p-4 flex flex-col justify-between h-full ${intentado && errorAula ? 'border-red-400' : 'border-[#E5E7EB]'}`}>
            <label htmlFor="aula-actual" className="text-[10px] font-extrabold uppercase tracking-wider text-[#B45309]">AULA ACTUAL</label>
            <div className="flex items-center gap-2.5 mt-3 min-w-0">
              <DoorOpen className="w-6 h-6 shrink-0 text-[#D97706]" />
              {registro ? (
                <span className="truncate text-[24px] font-black text-[#D97706] tracking-tight leading-none">{aulaActual}</span>
              ) : (
                <input
                  id="aula-actual"
                  value={aulaActual}
                  onChange={(e) => setAulaActual(sanitizeAmbienteInput(e.target.value))}
                  placeholder="Ej. 691B"
                  maxLength={AMBIENTE_MAX}
                  autoComplete="off"
                  aria-invalid={intentado && !!errorAula}
                  aria-describedby="aula-actual-error"
                  className="w-full min-w-0 bg-transparent text-[24px] font-black text-[#D97706] tracking-tight leading-none outline-none placeholder:text-[#F3C98B]"
                />
              )}
            </div>
          </div>
        </div>
        {intentado && errorAula && !registro && (
          <p id="aula-actual-error" className="-mt-2 mb-4 text-xs text-red-600" role="alert">{errorAula}</p>
        )}

        {/* Motivo */}
        <div className="bg-[#FFFDF8] border border-[#FEF3C7] rounded-2xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#D97706] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
              <span className="font-bold text-xs">!</span>
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase text-[#9A3412] tracking-wider mb-1">MOTIVO</p>
              <p className="text-xs text-[#9A3412] leading-relaxed font-medium">
                {registro
                  ? registro.motivo
                  : `El estudiante (${ctx.estudiante}) se encuentra en un ambiente diferente al asignado para el examen.`}
              </p>
            </div>
          </div>
        </div>

        {/* Auditoría: hora del dispositivo hasta guardar; luego, la hora oficial del servidor */}
        <div className="bg-[#F3F4F6] border border-[#E5E7EB] rounded-2xl px-4 py-3.5 mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#4B5563]">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#6B7280]" />
            <span>{fechaCorta(momento)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#6B7280]" />
            <span>{horaCorta(momento)}{registro ? ' (hora oficial)' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#1F2937]" />
            <span className="font-extrabold text-[#1F2937] text-[11px] tracking-wide">REPORTADO POR: <span className="font-normal text-gray-900">{responsable || '—'}</span></span>
          </div>
        </div>

        {errorEnvio && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{errorEnvio}</p>
        )}
        {registro && (
          <p className="mb-4 rounded-xl bg-[#ECFDF5] p-3 text-xs text-[#087F59]">
            El reporte quedó guardado en el historial de intentos del examen. El ingreso no puede autorizarse mientras el estudiante no esté en el aula asignada.
          </p>
        )}

        {/* Botones de acción */}
        {registro ? (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#0439D9] text-white font-bold text-sm shadow-md"
          >
            Cerrar
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="w-1/3 py-3.5 px-4 rounded-2xl bg-[#E5E7EB]/50 border border-[#D1D5DB] text-[#374151] font-bold text-sm hover:bg-[#E5E7EB] transition-colors disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void reportar()}
              disabled={guardando}
              className="w-2/3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white font-bold text-sm shadow-lg shadow-orange-500/25 hover:from-[#C2410C] hover:to-[#9A3412] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {guardando ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              {guardando ? 'Registrando…' : 'Reportar incidencia'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
