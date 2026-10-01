import { Building2, GraduationCap, Mail, X } from 'lucide-react'
import type { EstudianteListItem } from '../../types/estudiante'

interface Props {
  open: boolean
  estudiante: EstudianteListItem | null
  onClose: () => void
}

function getInitials(nombre: string, apellidos: string): string {
  const n = nombre?.charAt(0)?.toUpperCase() ?? ''
  const a = apellidos?.charAt(0)?.toUpperCase() ?? ''
  return `${n}${a}` || 'E'
}

export default function FichaEstudianteModal({ open, estudiante, onClose }: Props) {
  if (!open || !estudiante) return null

  const carreraPrincipal = estudiante.carreras?.[0]

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-[#011140]/25 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:z-50 sm:items-center sm:bg-black/45 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ficha-estudiante-title"
    >
      <div className="flex h-[90dvh] max-h-[750px] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[#D8E3F5] bg-white shadow-2xl sm:h-auto sm:max-h-[min(92dvh,900px)] sm:rounded-2xl">

        {/* ===== HEADER ===== */}
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#EDF1F7] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-start gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="ficha-estudiante-title" className=" px-2 text-base font-bold text-[#011140] sm:text-lg">
                  Ficha del Estudiante
                </h2>
                <span className="inline-flex items-center gap-1 rounded bg-[#F1F6FF] px-3 py-0.5 text-[10px] font-bold tracking-wide text-[#627A9B]">
                  MODO SOLO LECTURA
                </span>
              </div>
              <p className="text-[11px] px-2 text-[#627A9B] sm:text-xs">
                Información registrada en el padrón central de SIGEX.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-full bg-[#F1F6FF] p-2 text-[#627A9B] transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={16} />
          </button>
        </header>

        {/* ===== CONTENIDO ===== */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {/* Avatar */}
          <div className="mb-5 mx-auto flex items-center justify-center gap-3 p-3">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#0439D9] text-lg font-bold text-white sm:h-20 sm:w-24 sm:text-xl">
              {getInitials(estudiante.nombre, estudiante.apellidos)}
            </span>
          </div>

          {/* 1. INFORMACIÓN PERSONAL */}
          <section className="mb-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#334155] text-[10px] font-bold text-white">
                1
              </span>
              <h3 className="text-[10px] font-bold tracking-wide text-[#334155] sm:text-[12px]">
                INFORMACIÓN PERSONAL DEL ESTUDIANTE
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[#E8EEF7] bg-white p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Nombre completo
                </dt>
                <dd className="mt-1 truncate text-[12px] font-semibold text-[#011140] sm:text-sm">
                  {estudiante.nombre || '—'}
                </dd>
              </div>

              <div className="rounded-lg border border-[#E8EEF7] bg-white p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Apellidos completos
                </dt>
                <dd className="mt-1 truncate text-[12px] font-semibold text-[#011140] sm:text-sm">
                  {estudiante.apellidos || '—'}
                </dd>
              </div>

              <div className="rounded-lg border border-[#E8EEF7] bg-white p-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Documento de Identidad (CI)
                </dt>
                <dd className="mt-1 flex items-center gap-2 truncate text-[12px] font-semibold text-[#011140] sm:text-sm">
                  <span className="rounded bg-[#E9F1FF] px-1.5 py-0.5 text-[12px] font-bold text-[#0439D9] sm:text-sm">
                    CI
                  </span>
                  {estudiante.ci || '—'}
                </dd>
              </div>

              <div className="rounded-lg border border-[#E8EEF7] bg-white p-3">
                <div className="flex items-center justify-between">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Correo Electrónico Institucional
                  </dt>
                  <Mail size={14} className="text-[#687182]" />
                </div>
                <dd className="mt-1 truncate text-[12px] font-semibold text-[#1b41b4] sm:text-sm">
                  {estudiante.email || '—'}
                </dd>
              </div>
            </div>
          </section>

          {/* 2. INFORMACIÓN ACADÉMICA */}
          <section className="mb-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#334155] text-[11px] font-bold text-white">
                2
              </span>
              <h3 className="text-[10px] font-bold tracking-wide text-[#334155] sm:text-[12px]">
                INFORMACIÓN ACADÉMICA
              </h3>
            </div>

            <div className="mb-3 rounded-lg border border-[#E8EEF7] bg-white p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Código Universitario / Matrícula
              </dt>
              <dd className="mt-1 truncate text-[12px] font-semibold text-[#0439D9] sm:text-sm">
                {estudiante.codigoSis || '—'}
              </dd>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[#E8EEF7] bg-white p-3">
                <div className="flex items-center justify-between">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Facultad
                  </dt>
                  <Building2 size={16} className="text-[#848b96]" />
                </div>
                <dd className="mt-1 truncate text-[12px] font-semibold text-[#011140] sm:text-sm">
                  {carreraPrincipal?.nombreFacultad || '—'}
                </dd>
              </div>

              <div className="rounded-lg border border-[#E8EEF7] bg-white p-3">
                <div className="flex items-center justify-between">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Carrera
                  </dt>
                  <GraduationCap size={16} className="text-[#848b96]" />
                </div>
                <dd className="mt-1 truncate text-[12px] font-semibold text-[#011140] sm:text-sm">
                  {carreraPrincipal?.nombreCarrera || '—'}
                </dd>
              </div>
            </div>
          </section>
        </div>

        {/* ===== FOOTER ===== */}
        <footer className="shrink-0 border-t border-[#D8E3F5] bg-white px-4 py-3 sm:px-10 sm:py-3">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#0439D9] px-6 py-2.5 text-[13px] font-bold text-white shadow-md transition-colors hover:bg-[#0027a2] sm:w-auto sm:text-sm"
            >
              Cerrar Ficha
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}