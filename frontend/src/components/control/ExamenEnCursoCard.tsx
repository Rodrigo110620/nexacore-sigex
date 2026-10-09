import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarDays, CircleCheck, Clock, Hourglass, MapPin, Play, UserRound } from 'lucide-react'
import { obtenerResumenExamen, type ResumenEstudiantes } from '../../services/controlExamenService'
import type { ExamenDto } from '../../services/examenService'
import { addMinutes, formatFecha, horaCorta } from '../../utils/examenFormat'

/** Examen en curso con su aforo en vivo: el resumen se vuelve a pedir cada vez que cambia `ahora` (cada 30 s). */
export default function ExamenEnCursoCard({ examen, ahora }: { examen: ExamenDto; ahora: Date }) {
  const [resumen, setResumen] = useState<ResumenEstudiantes>()

  useEffect(() => {
    let vigente = true
    obtenerResumenExamen(examen.idExamen)
      .then((datos) => {
        if (vigente) setResumen(datos)
      })
      .catch(() => undefined) // se conserva el último avance mostrado
    return () => {
      vigente = false
    }
  }, [examen.idExamen, ahora])

  const habilitados = resumen?.habilitados ?? 0
  const ingresados = resumen?.ingresados ?? 0
  const porcentaje = habilitados > 0 ? Math.round((ingresados / habilitados) * 1000) / 10 : 0

  return (
    <article
      aria-label={`Examen en curso: ${examen.asignatura}`}
      className="grid gap-3 rounded-2xl border border-[#D8E3F5] bg-white p-3 shadow-sm sm:gap-4 sm:p-5 lg:grid-cols-[1fr_1fr_auto] lg:items-center"
    >
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#011140] sm:text-lg">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0439D9] text-white">
            <BookOpen size={18} aria-hidden="true" />
          </span>
          {examen.asignatura}
        </h3>
        {examen.sigla && <p className="ml-11 text-[10px] text-[#627A9B] sm:hidden">Código: {examen.sigla}</p>}
        <div className="mt-2 space-y-1 rounded-lg bg-[#F4F5F7] p-2 text-[10px] text-[#627A9B] sm:mt-3 sm:bg-[#F1F6FF] sm:p-3 sm:text-xs">
          <p className="flex items-center gap-1.5 font-semibold text-[#011140]">
            <MapPin size={14} aria-hidden="true" /> {examen.ambienteNombre}
          </p>
          <p className="flex flex-wrap items-center gap-1.5">
            <CalendarDays size={14} aria-hidden="true" /> {formatFecha(examen.fecha)}
            <Clock size={14} aria-hidden="true" />
            <span className="font-semibold text-[#011140]">
              {horaCorta(examen.horaInicio)} - {addMinutes(examen.horaInicio, examen.duracionMinutos)}
            </span>
          </p>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-[#627A9B] sm:text-xs">
          <UserRound size={14} aria-hidden="true" /> Docente: {examen.docente}
        </p>
      </div>

      <div className="border-t border-[#EDF1F7] pt-2 sm:border-0 sm:pt-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#627A9B]">Aforo y registro en vivo</p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p>
            <span className="text-2xl font-bold text-[#011140]">{ingresados}</span>
            <span className="text-sm text-[#627A9B]"> / {habilitados} habilitados</span>
          </p>
          <p className="text-right text-sm font-bold text-[#0439D9]">
            {porcentaje}%<span className="block text-[10px] font-normal text-[#627A9B]">completado</span>
          </p>
        </div>
        <div className="mt-2 h-2 rounded-full bg-[#E9F1FF]">
          <div className="h-2 rounded-full bg-[#0439D9]" style={{ width: `${Math.min(porcentaje, 100)}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <p className="flex items-center gap-2 rounded-lg bg-[#DCFCE7] p-2 text-[#166534]">
            <CircleCheck size={16} aria-hidden="true" />
            <span><span className="block text-base font-bold">{ingresados}</span>Ingresaron al aula</span>
          </p>
          <p className="flex items-center gap-2 rounded-lg bg-[#F1F6FF] p-2 text-[#627A9B]">
            <Hourglass size={16} aria-hidden="true" />
            <span><span className="block text-base font-bold text-[#011140]">{Math.max(habilitados - ingresados, 0)}</span>Faltan por ingresar</span>
          </p>
        </div>
      </div>

      <Link
        to={`/dashboard/control/${examen.idExamen}`}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#032db0] sm:rounded-xl sm:py-3 sm:text-sm"
      >
        <Play size={16} aria-hidden="true" />
        Iniciar Control de Ingreso
      </Link>
    </article>
  )
}
