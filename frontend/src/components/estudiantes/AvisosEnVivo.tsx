import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, CalendarPlus, Camera, CircleX, LifeBuoy, MapPin, X, type LucideIcon } from 'lucide-react'
import { alRecibirNotificacion } from '../../services/notificacionService'
import type { MiExamen, MiPerfilEstudiante } from '../../services/panelEstudianteService'

interface Aviso {
  id: number
  tipo: 'exito' | 'alerta' | 'info'
  Icono: LucideIcon
  titulo: string
  detalle?: string
}

const MS_VISIBLE = 9000
const ESTILO: Record<Aviso['tipo'], string> = {
  exito: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]',
  alerta: 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]',
  info: 'border-[#BFD2F5] bg-[#F1F6FF] text-[#1E3A8A]',
}

/** Lo que el estudiante ve de cada examen: si cambia, se le avisa. */
const clave = (e: MiExamen) => `${e.idExamen}`

/** Los avisos que corresponden a pasar de {@code antes} a {@code ahora}. */
function avisosEntre(antes: { examenes: MiExamen[]; perfil: MiPerfilEstudiante }, ahora: { examenes: MiExamen[]; perfil: MiPerfilEstudiante }): Omit<Aviso, 'id'>[] {
  const avisos: Omit<Aviso, 'id'>[] = []
  const previos = new Map(antes.examenes.map((e) => [clave(e), e]))
  for (const e of ahora.examenes) {
    const p = previos.get(clave(e))
    if (!p) {
      avisos.push({ tipo: 'info', Icono: CalendarPlus, titulo: `Te asociaron a ${e.materia}`, detalle: `Examen el ${e.fecha.split('-').reverse().join('/')}.` })
      continue
    }
    if (p.habilitado !== true && e.habilitado === true) {
      avisos.push({ tipo: 'exito', Icono: BadgeCheck, titulo: `¡Ya estás habilitado para ${e.materia}!`, detalle: 'Lleva tu QR el día del examen.' })
    } else if (p.habilitado !== false && e.habilitado === false) {
      avisos.push({ tipo: 'alerta', Icono: CircleX, titulo: `No estás habilitado para ${e.materia}`, detalle: e.motivoInhabilitacion ? `Razón: ${e.motivoInhabilitacion}.` : undefined })
    }
    if (!p.cruceHorario && e.cruceHorario) {
      avisos.push({ tipo: 'alerta', Icono: CalendarPlus, titulo: `${e.materia} se cruza con otro examen`, detalle: `Se cruza con ${e.cruceHorario}. Avisa a tus docentes o reclama en la mesa de ayuda.` })
    }
    if (p.aula && e.aula && p.aula !== e.aula) {
      avisos.push({ tipo: 'info', Icono: MapPin, titulo: `Cambió tu aula para ${e.materia}`, detalle: `Ahora es el aula ${e.aula} (antes ${p.aula}).` })
    } else if (!p.aula && e.aula) {
      avisos.push({ tipo: 'info', Icono: MapPin, titulo: `Ya tienes aula para ${e.materia}`, detalle: `Aula ${e.aula}.` })
    }
  }
  const fotoAntes = antes.perfil.solicitudFoto?.estado
  const fotoAhora = ahora.perfil.solicitudFoto?.estado
  if (fotoAntes === 'PENDIENTE' && fotoAhora === 'RECHAZADA') {
    avisos.push({ tipo: 'alerta', Icono: Camera, titulo: 'Tu foto nueva fue rechazada', detalle: 'Revisa el motivo y toma otra.' })
  } else if (fotoAntes === 'PENDIENTE' && !fotoAhora) {
    avisos.push({ tipo: 'exito', Icono: Camera, titulo: 'Tu foto nueva fue aprobada', detalle: 'El control de ingreso ya usa tu foto nueva.' })
  }
  return avisos
}

/**
 * Avisos en pantalla del portal del estudiante cuando, en vivo, lo habilitan o no, le cambian el aula,
 * lo asocian a un examen o le aprueban o rechazan la foto. La primera carga no avisa nada.
 */
export default function AvisosEnVivo({ examenes, perfil }: { examenes: MiExamen[] | null; perfil: MiPerfilEstudiante | null }) {
  const anterior = useRef<{ examenes: MiExamen[]; perfil: MiPerfilEstudiante } | null>(null)
  const siguienteId = useRef(1)
  const [avisos, setAvisos] = useState<Aviso[]>([])

  useEffect(() => {
    if (!examenes || !perfil) return
    const antes = anterior.current
    anterior.current = { examenes, perfil }
    if (!antes) return
    const nuevos = avisosEntre(antes, { examenes, perfil }).map((a) => ({ ...a, id: siguienteId.current++ }))
    if (nuevos.length === 0) return
    window.setTimeout(() => setAvisos((prev) => [...nuevos, ...prev].slice(0, 4)), 0)
    try { navigator.vibrate?.(60) } catch { /* sin vibración */ }
    window.setTimeout(() => setAvisos((prev) => prev.filter((a) => !nuevos.some((n) => n.id === a.id))), MS_VISIBLE)
  }, [examenes, perfil])

  // Notificaciones solo para él (p. ej. la mesa de ayuda respondió su consulta).
  useEffect(() => alRecibirNotificacion((n) => {
    const id = siguienteId.current++
    setAvisos((prev) => [{ id, tipo: 'info' as const, Icono: LifeBuoy, titulo: n.titulo, detalle: n.detalle ?? undefined }, ...prev].slice(0, 4))
    window.setTimeout(() => setAvisos((prev) => prev.filter((a) => a.id !== id)), MS_VISIBLE + 6000)
  }), [])

  if (avisos.length === 0) return null
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-3 top-3 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end">
      {avisos.map(({ id, tipo, Icono, titulo, detalle }) => (
        <div key={id} role="status"
          className={`sigex-aparece pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3 shadow-lg ${ESTILO[tipo]}`}>
          <Icono size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{titulo}</p>
            {detalle && <p className="mt-0.5 text-xs opacity-90">{detalle}</p>}
          </div>
          <button type="button" onClick={() => setAvisos((prev) => prev.filter((a) => a.id !== id))} aria-label="Cerrar aviso"
            className="grid size-7 shrink-0 place-items-center rounded-md hover:bg-black/5"><X size={15} aria-hidden="true" /></button>
        </div>
      ))}
    </div>
  )
}
