import type { ExpulsionResponse } from '../../services/expulsionService'
import { fechaHoraNumerica } from '../../utils/examenFormat'

export default function RegistroExpulsion({ registro }: { registro: ExpulsionResponse }) {
  return (
    <details className="mt-2 rounded-lg border border-[#D8E3F5] bg-[#F8FAFC] p-2 text-xs text-[#011140]">
      <summary className="cursor-pointer py-1 font-semibold text-[#0439D9]">Ver registro de expulsión</summary>
      <dl className="mt-2 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3 gap-y-1 [overflow-wrap:anywhere] sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)]">
        <dt className="font-semibold">Motivo</dt><dd className="min-w-0 whitespace-pre-wrap">{registro.motivo}</dd>
        <dt className="font-semibold">Responsable</dt><dd className="min-w-0">{registro.responsable}</dd>
        <dt className="font-semibold">Fecha y hora oficial (Bolivia)</dt><dd>{fechaHoraNumerica(registro.fechaHora)}</dd>
        {registro.anuladaEn && (
          <>
            <dt className="font-semibold text-[#15803D]">Anulada</dt>
            <dd>{fechaHoraNumerica(registro.anuladaEn)} · {registro.anuladaPor ?? '—'}</dd>
            <dt className="font-semibold text-[#15803D]">Motivo de la anulación</dt><dd>{registro.motivoAnulacion}</dd>
          </>
        )}
      </dl>
      <p className="mt-2 text-[#627A9B]">Registro #{registro.idExpulsion} · Solo lectura</p>
    </details>
  )
}
