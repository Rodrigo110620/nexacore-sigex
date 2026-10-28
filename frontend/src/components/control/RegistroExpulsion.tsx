import type { ExpulsionResponse } from '../../services/expulsionService'
import { fechaHoraNumerica } from '../../utils/examenFormat'

export default function RegistroExpulsion({ registro }: { registro: ExpulsionResponse }) {
  return (
    <details className="mt-2 rounded-lg border border-[#D8E3F5] bg-[#F8FAFC] p-2 text-xs text-[#011140]">
      <summary className="cursor-pointer font-semibold text-[#0439D9]">Ver registro de expulsión</summary>
      <dl className="mt-2 space-y-1 break-words">
        <dt className="font-semibold">Motivo</dt><dd>{registro.motivo}</dd>
        <dt className="font-semibold">Responsable</dt><dd>{registro.responsable}</dd>
        <dt className="font-semibold">Fecha y hora oficial (Bolivia)</dt><dd>{fechaHoraNumerica(registro.fechaHora, true)}</dd>
      </dl>
      <p className="mt-2 text-[#627A9B]">Registro #{registro.idExpulsion} · Solo lectura</p>
    </details>
  )
}
