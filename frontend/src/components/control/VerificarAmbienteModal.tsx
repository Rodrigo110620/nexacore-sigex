import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, LoaderCircle, X, Landmark, DoorOpen, Calendar, Clock, User, Pencil } from 'lucide-react';
import type { ContextoControlIngreso } from '../../types/controlIngreso';
import FotoEstudiante from '../estudiantes/FotoEstudiante';
import { registrarAmbienteIncorrecto, type IntentoIngreso } from '../../services/intentoIngresoService';
import { AMBIENTE_MAX, isNetworkError, isOffline, sanitizeAmbienteInput, validarAulaActual } from '../../utils/examFormUtils';

interface VerificarAmbienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportado: (registro: IntentoIngreso) => void;
  ctx: ContextoControlIngreso | null;
  aulaActualExamen?: string;
  usuarioNombre?: string;
}

const SIN_CONEXION = 'No se pudo registrar el reporte porque no hay conexión a Internet. El aula ingresada se conserva: vuelve a presionar "Reportar incidencia" cuando recuperes la conexión.';

function fechaCorta(fecha: Date): string {
  return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function horaCorta(fecha: Date): string {
  return fecha.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export const VerificarAmbienteModal: React.FC<VerificarAmbienteModalProps> = ({ isOpen, ctx, ...props }) => {
  if (!isOpen || !ctx) return null;
  return <ContenidoAmbienteModal ctx={ctx} {...props} />;
};

type ContenidoProps = Omit<VerificarAmbienteModalProps, 'isOpen' | 'ctx'> & { ctx: ContextoControlIngreso };

function ContenidoAmbienteModal({ onClose, onReportado, ctx, aulaActualExamen = "", usuarioNombre = "Personal TIS" }: ContenidoProps) {
  const [aulaActual, setAulaActual] = useState(aulaActualExamen);
  const [editandoAula, setEditandoAula] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [registro, setRegistro] = useState<IntentoIngreso | null>(null);
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    if (registro) return;
    const id = window.setInterval(() => setAhora(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [registro]);

  useEffect(() => {
    if (aulaActualExamen) {
      setAulaActual(aulaActualExamen);
    }
  }, [aulaActualExamen]);

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[2px] p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="relative w-full sm:max-w-[540px] max-h-[90vh] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] bg-white shadow-2xl border border-gray-100 p-6 sm:p-8">
        
        {/* Barra superior de arrastre para móviles */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />

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
          <h3 className="text-[18px] sm:text-[20px] font-extrabold text-[#111827] tracking-tight">
            {registro ? 'INCIDENCIA REGISTRADA' : 'AMBIENTE NO CORRESPONDE'}
          </h3>
        </div>

        {/* Tarjeta de información del estudiante */}
        <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3.5">
            <FotoEstudiante fotoUrl={ctx.fotoUrl} nombre={ctx.estudiante} iniciales={iniciales} className="w-12 h-12 rounded-xl shrink-0 grid place-items-center overflow-hidden bg-[#0439D9] text-white font-bold text-sm shadow-sm" />
            <div>
              <h4 className="font-bold text-[#111827] text-sm sm:text-base">{ctx.estudiante}</h4>
              <p className="text-xs text-[#0439D9] font-bold">Cód: {ctx.codigoSis}</p>
              <p className="text-xs text-[#4B5563]">Carrera: {ctx.carrera || 'Ingeniería de Sistemas'}</p>
            </div>
          </div>
        </div>

        {/* Bloque comparativo de Aulas */}
        <div className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] items-stretch sm:items-center gap-2.5 mb-4">
          
          {/* Aula Esperada */}
          <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-4 flex flex-col justify-between gap-2.5 h-full">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#065F46]">AULA ESPERADA</span>
            <div className="flex items-center gap-2.5">
              <Landmark className="w-5 h-5 sm:w-6 sm:h-6 text-[#0439D9]" />
              <span className="text-[24px] sm:text-[28px] font-black text-[#0439D9] tracking-tight leading-none">{aulaEsperada}</span>
            </div>
          </div>

          {/* Símbolo Diferente */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#E5E7EB] text-[#6B7280] font-bold flex items-center justify-center text-sm z-10 shrink-0 shadow-sm mx-auto my-0.5 sm:my-0 border-2 border-white sm:border-none">
            <span>≠</span>
          </div>

          {/* Aula Actual */}
          <div className={`bg-[#F8F9FB] border rounded-2xl p-4 flex flex-col justify-between gap-2.5 h-full ${intentado && errorAula ? 'border-red-400' : 'border-[#E5E7EB]'}`}>
            <div className="flex items-center justify-between w-full">
              <label htmlFor="aula-actual" className="text-[10px] font-extrabold uppercase tracking-wider text-[#B45309]">AULA ACTUAL</label>
              {!registro && (
                <button 
                  type="button"
                  onClick={() => setEditandoAula(!editandoAula)}
                  className="text-[11px] font-bold text-[#0439D9] flex items-center gap-1 hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  <Pencil className="w-3 h-3" />
                  {editandoAula ? 'Listo' : 'Editar'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <DoorOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#D97706] shrink-0" />
              {registro || editandoAula ? (
                <input
                  id="aula-actual"
                  value={aulaActual}
                  onChange={(e) => setAulaActual(sanitizeAmbienteInput(e.target.value))}
                  placeholder="Ej. 606"
                  maxLength={AMBIENTE_MAX}
                  autoComplete="off"
                  aria-invalid={intentado && !!errorAula}
                  aria-describedby="aula-actual-error"
                  className="w-full min-w-0 bg-transparent text-[24px] sm:text-[28px] font-black text-[#D97706] tracking-tight leading-none outline-none border-b border-[#D97706]/40 pb-0.5"
                />
              ) : (
                <span 
                  onClick={() => setEditandoAula(true)}
                  className="text-[24px] sm:text-[28px] font-black text-[#D97706] tracking-tight leading-none cursor-pointer"
                  title="Haz clic para editar"
                >
                  {aulaActual || aulaActualExamen || '—'}
                </span>
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
                {registro ? registro.motivo : `El estudiante (${ctx.estudiante}) se encuentra en un ambiente diferente al asignado para el examen.`}
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Auditoría */}
        <div className="bg-[#F3F4F6] border border-[#E5E7EB] rounded-2xl px-4 py-3.5 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-2 text-xs text-[#4B5563]">
          <div className="flex items-center gap-3 sm:gap-1.5 w-full sm:w-auto border-b sm:border-0 border-gray-200 pb-2 sm:pb-0">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#6B7280]" />
              <span>{fechaCorta(momento)}</span>
            </div>
            <span className="text-gray-400 hidden sm:inline">·</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#6B7280]" />
              <span>{horaCorta(momento)}{registro ? ' (hora oficial)' : ''}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#1F2937]" />
            <span className="font-extrabold text-[#1F2937] text-[11px] tracking-wide">AUTORIZADO POR: <span className="font-normal text-gray-900">{responsable || '—'}</span></span>
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

        {/* Botones de acción (Texto exacto en minúscula para el test: Reportar incidencia) */}
        {registro ? (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#0439D9] text-white font-bold text-sm shadow-md"
          >
            Cerrar
          </button>
        ) : (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="w-full sm:w-1/3 py-3.5 px-4 rounded-2xl bg-[#E5E7EB]/50 border border-[#D1D5DB] text-[#374151] font-bold text-sm hover:bg-[#E5E7EB] transition-colors disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void reportar()}
              disabled={guardando}
              className="w-full sm:w-2/3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white font-bold text-sm shadow-lg shadow-orange-500/25 hover:from-[#C2410C] hover:to-[#9A3412] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
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