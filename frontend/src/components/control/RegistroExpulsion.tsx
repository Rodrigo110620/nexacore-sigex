import { useState } from 'react'
import type { ExpulsionResponse } from '../../services/expulsionService'
import { fechaHoraNumerica } from '../../utils/examenFormat'
import { GaleriaEvidencia } from './EvidenciaExpulsion'

export default function RegistroExpulsion({ registro }: { registro: ExpulsionResponse }) {
  // La evidencia se pide recién al abrir el registro.
  const [abierto, setAbierto] = useState(false)
  return (
    <details style={{ containerType: 'inline-size' }} onToggle={(e) => setAbierto(e.currentTarget.open)} className="mt-2 rounded-lg border border-[#D8E3F5] bg-[#F8FAFC] p-2 text-xs text-[#011140]">
      <summary className="cursor-pointer py-1 font-semibold text-[#0439D9]">Ver registro de expulsión</summary>
      <dl className="mt-2 grid gap-x-3 gap-y-1 [overflow-wrap:break-word] [@container(min-width:22rem)]:grid-cols-[minmax(0,auto)_minmax(0,1fr)] [&_dd]:mb-1">
        <dt className="font-bold">Motivo</dt><dd className="min-w-0 whitespace-pre-wrap">{registro.motivo}</dd>
        <dt className="font-bold">Responsable</dt><dd className="min-w-0">{registro.responsable}</dd>
        <dt className="font-bold">Fecha y hora oficial (Bolivia)</dt><dd>{fechaHoraNumerica(registro.fechaHora, true)}</dd>
        {registro.anuladaEn && (
          <>
            <dt className="font-bold text-[#15803D]">Anulada</dt>
            <dd>{fechaHoraNumerica(registro.anuladaEn, true)} · {registro.anuladaPor ?? '—'}</dd>
            <dt className="font-bold text-[#15803D]">Motivo de la anulación</dt><dd>{registro.motivoAnulacion}</dd>
          </>
        )}
      </dl>
      <p className="mt-2 font-bold">Evidencia</p>
      {abierto && <GaleriaEvidencia idExamen={registro.idExamen} idExpulsion={registro.idExpulsion} />}
      <p className="mt-2 text-[#627A9B]">Registro #{registro.idExpulsion} · Solo lectura</p>
    </details>
  )
}
