import React from 'react';
import { AlertTriangle, X, Landmark, DoorOpen, Calendar, Clock, User } from 'lucide-react';
import type { ContextoControlIngreso } from '../../types/controlIngreso';

interface VerificarAmbienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportIncident: () => void;
  ctx: ContextoControlIngreso | null;
  aulaActual?: string;
  usuarioNombre?: string;
}

export const VerificarAmbienteModal: React.FC<VerificarAmbienteModalProps> = ({
  isOpen,
  onClose,
  onReportIncident,
  ctx,
  aulaActual = "302",
  usuarioNombre = "María Zanches"
}) => {
  if (!isOpen || !ctx) return null;

  const aulaEsperada = ctx.ambiente || "204";
  const fechaActual = "05/10/2026";
  const horaActual = "14:35:22";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-[2px] p-4" role="dialog" aria-modal="true" aria-label="Verificar ambiente de ingreso">
      <div className="relative w-full max-w-[540px] rounded-[32px] bg-white shadow-2xl overflow-hidden border border-gray-100 p-6 sm:p-8">
        
        {/* Botón Cerrar */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icono de advertencia superior */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#FEF3C7] flex items-center justify-center text-[#D97706] mb-4 shadow-[0_8px_25px_rgba(251,191,36,0.25)] border border-[#FDE68A]">
            <AlertTriangle className="w-8 h-8 fill-[#D97706] text-[#FEF3C7]" />
          </div>
          <h3 className="text-[20px] font-extrabold text-[#111827] tracking-tight">
            AMBIENTE NO CORRESPONDE
          </h3>
        </div>

        {/* Tarjeta de información del estudiante */}
        <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#0439D9] flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
              {ctx.estudiante.split(' ').slice(0, 2).map(n => n[0]).join('')}
            </div>
            <div>
              <h4 className="font-bold text-[#111827] text-base">{ctx.estudiante}</h4>
              <p className="text-xs text-[#0439D9] font-bold">Cód: {ctx.codigoSis}</p>
              <p className="text-xs text-[#4B5563]">Carrera: {ctx.carrera || 'Ingeniería de Sistemas'}</p>
            </div>
          </div>
        </div>

        {/* Bloque comparativo de Aulas */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 mb-4">
          {/* Aula Esperada */}
          <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-4 flex flex-col justify-between h-full">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#065F46]">AULA ESPERADA</span>
            <div className="flex items-center gap-2.5 mt-3">
              <Landmark className="w-6 h-6 text-[#0439D9]" />
              <span className="text-[28px] font-black text-[#0439D9] tracking-tight leading-none">{aulaEsperada}</span>
            </div>
          </div>

          {/* Símbolo Diferente */}
          <div className="w-9 h-9 rounded-full bg-[#E5E7EB] text-[#6B7280] font-bold flex items-center justify-center text-sm z-10 shrink-0 shadow-sm">
            ≠
          </div>

          {/* Aula Actual */}
          <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#B45309]">AULA ACTUAL</span>
              <span className="text-[11px] font-bold text-[#0439D9] flex items-center gap-1 cursor-pointer hover:underline">
                ✎ Editable
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-3">
              <DoorOpen className="w-6 h-6 text-[#D97706]" />
              <span className="text-[28px] font-black text-[#D97706] tracking-tight leading-none">{aulaActual}</span>
            </div>
          </div>
        </div>

        {/* Cuadro de Motivo Exacto a la referencia */}
        <div className="bg-[#FFFDF8] border border-[#FEF3C7] rounded-2xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#D97706] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
              <span className="font-bold text-xs">!</span>
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase text-[#9A3412] tracking-wider mb-1">MOTIVO</p>
              <p className="text-xs text-[#9A3412] leading-relaxed font-medium">
                El estudiante ({ctx.estudiante}) se encuentra en un ambiente diferente al asignado para el examen.
              </p>
            </div>
          </div>
        </div>

        {/* Barra inferior de auditoría idéntica a la referencia */}
        <div className="bg-[#F3F4F6] border border-[#E5E7EB] rounded-2xl px-4 py-3.5 mb-6 flex flex-wrap items-center justify-between gap-2 text-xs text-[#4B5563]">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#6B7280]" />
            <span>{fechaActual}</span>
            <span className="text-gray-400 mx-0.5">·</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#6B7280]" />
            <span>{horaActual}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#1F2937]" />
            <span className="font-extrabold text-[#1F2937] text-[11px] tracking-wide">AUTORIZADO POR: <span className="font-normal text-gray-900">{usuarioNombre}</span></span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3.5 px-4 rounded-2xl bg-[#E5E7EB]/50 border border-[#D1D5DB] text-[#374151] font-bold text-sm hover:bg-[#E5E7EB] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onReportIncident}
            className="w-2/3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white font-bold text-sm shadow-lg shadow-orange-500/25 hover:from-[#C2410C] hover:to-[#9A3412] transition-all flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" /> Reportar Incidencia
          </button>
        </div>

      </div>
    </div>
  );
};