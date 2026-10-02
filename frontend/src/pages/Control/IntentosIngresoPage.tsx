import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import PanelLayout from '../../components/layout/PanelLayout'
import { listarIntentosIngreso, type IntentoIngreso } from '../../services/intentoIngresoService'

export default function IntentosIngresoPage() {
  const idExamen = Number(useParams().idExamen)
  const [intentos, setIntentos] = useState<IntentoIngreso[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { if (!idExamen) return; void listarIntentosIngreso(idExamen).then(setIntentos).catch(() => setError('No se pudo cargar los intentos.')) }, [idExamen])
  return <PanelLayout compactDesktop title="INTENTOS DE INGRESO" description="Historial de accesos a exámenes no correspondientes.">
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <Link to={`/dashboard/control/${idExamen}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[#0439D9]"><ArrowLeft size={16}/>Volver al control</Link>
      <section className="mt-4 rounded-2xl border border-[#D8E3F5] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2"><TriangleAlert className="text-[#D97706]" size={20}/><h1 className="font-bold text-[#011140]">Intentos de ingreso incorrecto</h1></div>
        {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : !intentos ? <p className="py-8 text-center text-sm text-gray-500">Cargando intentos…</p> : intentos.length === 0 ? <p className="py-8 text-center text-sm text-gray-500">No hay intentos registrados para este examen.</p> : <ul className="mt-4 divide-y divide-[#E6EDF8]">{intentos.map((i) => <li key={i.idIntento} className="py-3 text-sm"><p className="font-semibold text-[#011140]">{i.estudiante || i.identificador}</p><p className="text-[#45628D]">{i.motivo}</p><p className="mt-1 text-xs text-[#627A9B]">{i.identificador} · {i.personalControl} · {new Date(i.fechaHora).toLocaleString()}</p></li>)}</ul>}
      </section>
    </div>
  </PanelLayout>
}
