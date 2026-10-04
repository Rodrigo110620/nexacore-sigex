import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import { listarIntentosIngreso } from '../../services/intentoIngresoService'
import { obtenerHistorialControlExamen } from '../../services/controlIngresoService'

type HistorialItem = {
  idRegistro: number
  idEstudiante: number | null
  estudiante: string
  identificador: string
  resultado: string
  causa: string | null
  observaciones: string | null
  usuarioControl: string
  fechaHora: string
  tipo: 'CONTROL' | 'INTENTO'
}

export default function IntentosIngresoPage() {
  const idExamen = Number(useParams().idExamen)
  const [historial, setHistorial] = useState<HistorialItem[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!idExamen) return
    void Promise.all([obtenerHistorialControlExamen(idExamen), listarIntentosIngreso(idExamen)])
      .then(([controles, intentos]) => setHistorial([
        ...controles.map((registro): HistorialItem => ({ ...registro, tipo: 'CONTROL' })),
        ...intentos.map((intento): HistorialItem => ({ idRegistro: intento.idIntento, idEstudiante: intento.idEstudiante, tipo: 'INTENTO', resultado: 'INTENTO INCORRECTO', causa: intento.motivo, estudiante: intento.estudiante || intento.identificador, identificador: intento.identificador, observaciones: null, usuarioControl: intento.personalControl, fechaHora: intento.fechaHora })),
      ].sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())))
      .catch(() => setError('No se pudo cargar el historial del examen.'))
  }, [idExamen])
  return <PanelLayout compactDesktop title="HISTORIAL DE INGRESOS" description="Autorizaciones, denegaciones e intentos registrados del examen.">
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <Link to={`/dashboard/control/${idExamen}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#0439D9]"><ArrowLeft size={16}/>Volver al control</Link>
      <section className="mt-4 rounded-2xl border border-[#D8E3F5] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2"><TriangleAlert className="text-[#D97706]" size={20}/><h1 className="font-bold text-[#011140]">Historial de ingresos</h1></div>
        {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : !historial ? <p className="py-8 text-center text-sm text-gray-500">Cargando historial…</p> : historial.length === 0 ? <p className="py-8 text-center text-sm text-gray-500">No hay registros para este examen.</p> : <ul className="mt-4 divide-y divide-[#E6EDF8]">{historial.map((registro) => <li key={`${registro.tipo}-${registro.idRegistro}`} className="py-3 text-sm"><div className="flex items-center justify-between gap-2"><p className="font-semibold text-[#011140]">{registro.estudiante}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${registro.resultado === 'AUTORIZADO' ? 'bg-emerald-100 text-emerald-700' : registro.tipo === 'INTENTO' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{registro.resultado}</span></div><p className="text-[#45628D]">{registro.causa || registro.observaciones || 'Sin observaciones'}</p><p className="mt-1 text-xs text-[#627A9B]">{registro.identificador} · {registro.usuarioControl} · {new Date(registro.fechaHora).toLocaleString()}</p></li>)}</ul>}
      </section>
    </div>
  </PanelLayout>
}
