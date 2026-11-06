import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarDays, Clock3, GraduationCap, KeyRound, MapPin, ShieldCheck } from 'lucide-react'
import type { PerfilDelRol as Datos } from '../../services/profileService'
import { addMinutes, formatFecha, horaCorta } from '../../utils/examenFormat'

const CATEGORIA: Record<string, string> = { INTERINO: 'Interino', TITULAR: 'Titular', INVITADO: 'Invitado', AUXILIAR: 'Auxiliar' }

function Tarjeta({ icono, titulo, detalle, children }: { icono: ReactNode; titulo: string; detalle?: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="mt-5 rounded-2xl border border-[#D8E3F5] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E9F1FF] text-[#0439D9]">{icono}</span>
        <div>
          <h2 className="text-base font-bold text-[#011140]">{titulo}</h2>
          {detalle && <p className="mt-1 text-sm text-gray-600">{detalle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#627A9B]">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm font-medium text-[#011140]">{valor || <span className="text-[#94A3B8]">Sin registrar</span>}</dd>
    </div>
  )
}

/**
 * Mi perfil, lo propio de cada rol: los datos y las materias (con sus grupos) del DOCENTE, los exámenes asignados al
 * CONTROL y, para todos, lo que pueden hacer en el sistema según sus permisos.
 */
export default function PerfilDelRol({ datos, esAdmin }: { datos: Datos; esAdmin: boolean }) {
  const porModulo = datos.permisos.reduce<Record<string, string[]>>((acc, p) => {
    (acc[p.modulo] ??= []).push(p.descripcion)
    return acc
  }, {})

  return (
    <>
      {datos.docente && (
        <Tarjeta icono={<GraduationCap size={18} aria-hidden="true" />} titulo="Datos del docente">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Dato etiqueta="Título" valor={datos.docente.titulo} />
            <Dato etiqueta="Especialidad" valor={datos.docente.especialidad} />
            <Dato etiqueta="Categoría" valor={datos.docente.categoria ? CATEGORIA[datos.docente.categoria] ?? datos.docente.categoria : null} />
          </dl>
          <h3 className="mt-5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#45628D]"><BookOpen size={14} aria-hidden="true" />Mis materias</h3>
          {datos.docente.materias.length === 0 ? (
            <p className="mt-2 text-sm text-[#627A9B]">Aún no tienes materias asignadas. Pídeselas al administrador.</p>
          ) : (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2" aria-label="Mis materias">
              {datos.docente.materias.map((m) => (
                <li key={m.idMateria} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFF] px-3 py-2.5">
                  <p className="text-sm font-semibold text-[#011140]">{m.nombre}</p>
                  <p className="mt-0.5 text-xs text-[#45628D]">
                    {m.sigla}{m.grupos.length > 0 ? ` · Grupos: ${m.grupos.join(', ')}` : ' · Sin grupos asignados'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      )}

      {datos.examenesAsignados && (
        <Tarjeta icono={<CalendarDays size={18} aria-hidden="true" />} titulo="Mis exámenes asignados"
          detalle="Los exámenes de hoy en adelante donde eres personal de control.">
          {datos.examenesAsignados.length === 0 ? (
            <p className="text-sm text-[#627A9B]">Aún no te asignaron exámenes. El administrador o el docente te asigna desde el detalle del examen.</p>
          ) : (
            <ul className="divide-y divide-[#EEF2F7]" aria-label="Mis exámenes asignados">
              {datos.examenesAsignados.map((x) => (
                <li key={x.idExamen} className="py-2.5">
                  <Link to={`/dashboard/control/${x.idExamen}`} className="block rounded-md hover:bg-[#F8FAFF]">
                    <p className="text-sm font-semibold text-[#011140]">{x.materia}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#45628D]">
                      <span className="inline-flex items-center gap-1"><CalendarDays size={13} aria-hidden="true" />{formatFecha(x.fecha)}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 size={13} aria-hidden="true" />{horaCorta(x.horaInicio)} – {addMinutes(x.horaInicio, x.duracionMinutos)}</span>
                      {x.aula && <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{x.aula}</span>}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      )}

      <Tarjeta icono={esAdmin ? <ShieldCheck size={18} aria-hidden="true" /> : <KeyRound size={18} aria-hidden="true" />}
        titulo="Lo que puedes hacer" detalle={esAdmin ? 'Como administrador tienes acceso total al sistema.' : 'Según los permisos de tu rol.'}>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(porModulo).map(([modulo, acciones]) => (
            <div key={modulo} className="rounded-lg border border-[#E2E8F0] px-3 py-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#0439D9]">{modulo}</h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-[#011140]">
                {acciones.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Tarjeta>
    </>
  )
}
