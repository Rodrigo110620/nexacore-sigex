import { useEffect, useState } from 'react'
import axios from 'axios'
import type { RegistroControlIngresoExamen } from '../../services/controlIngresoService'
import { anularExpulsion, listarExpulsionesExamen, type ExpulsionResponse } from '../../services/expulsionService'
import useEnVivo from '../../hooks/useEnVivo'
import { useAuth } from '../../context/AuthContext'
import { validarTextoLibre } from '../../utils/textoLibreValidators'
import RegistroExpulsion from './RegistroExpulsion'
import { tienePermiso } from '../../utils/permisos'

const MOTIVO_ANULACION = { campo: 'El motivo de la anulación', min: 10, max: 200 }

/** Anular una expulsión registrada por error: pide el motivo y avisa que el registro no se borra. */
function AnularExpulsion({ idExamen, registro, nombre, onAnulada }: {
  idExamen: number; registro: ExpulsionResponse; nombre: string; onAnulada: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const enviar = async () => {
    const invalido = validarTextoLibre(motivo, MOTIVO_ANULACION) ?? (motivo.trim() ? null : 'Indica por qué se anula la expulsión')
    if (invalido) return setError(invalido)
    setGuardando(true)
    setError('')
    try {
      await anularExpulsion(idExamen, registro.idExpulsion, motivo.trim())
      setAbierto(false)
      onAnulada()
    } catch (err) {
      const datos = axios.isAxiosError(err) ? (err.response?.data as { mensaje?: string } | undefined) : undefined
      setError(datos?.mensaje ?? 'No se pudo anular la expulsión. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="mt-2 min-h-10 w-full rounded-lg border border-[#B8CBEF] bg-white px-3 text-xs font-semibold text-[#0439D9] hover:bg-[#F1F6FF] sm:w-auto">
        Anular expulsión
      </button>
    )
  }
  return (
    <div role="group" aria-label={`Anular la expulsión de ${nombre}`} className="mt-2 rounded-lg border border-[#B8CBEF] bg-white p-3">
      <p className="text-xs text-[#334E7A]">
        Úsalo solo si la expulsión fue un error. <strong>No se borra</strong>: queda en el historial como anulada, con tu
        nombre, la hora y el motivo. El estudiante vuelve a figurar como ingresado y sigue con su examen.
      </p>
      <label htmlFor={`anular-${registro.idExpulsion}`} className="mt-2 block text-xs font-semibold text-[#011140]">Motivo de la anulación</label>
      <textarea id={`anular-${registro.idExpulsion}`} rows={2} maxLength={MOTIVO_ANULACION.max} value={motivo}
        onChange={(e) => { setMotivo(e.target.value); setError('') }} placeholder="Ej.: error del control, era otro estudiante"
        className="mt-1 w-full rounded-lg border border-[#B8CBEF] px-3 py-2 text-sm text-[#011140]" />
      {error && <p role="alert" className="mt-1 text-xs text-[#B91C1C]">{error}</p>}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <button type="button" onClick={() => { setAbierto(false); setMotivo(''); setError('') }} className="min-h-10 rounded-lg border px-3 text-xs font-semibold text-[#45628D]">
          Cancelar
        </button>
        <button type="button" disabled={guardando} onClick={() => void enviar()}
          className="min-h-10 rounded-lg bg-[#0439D9] px-3 text-xs font-semibold text-white disabled:opacity-50">
          {guardando ? 'Anulando…' : 'Confirmar anulación'}
        </button>
      </div>
    </div>
  )
}

interface Props {
  idExamen: number
  examen?: string
  controles: RegistroControlIngresoExamen[]
}

export default function ExpulsionesReporte({ idExamen, examen, controles }: Props) {
  // Anulan los mismos que pueden expulsar: ADMIN o el docente del examen (el servidor lo verifica).
  const auth = useAuth()
  const puedeAnular = tienePermiso(auth, 'EXPULSAR_TODOS', 'EXPULSAR_PROPIOS')
  const [recarga, setRecarga] = useState(0)
  const [resultado, setResultado] = useState<{ clave: string; registros?: ExpulsionResponse[]; error?: string }>()
  const clave = `${idExamen}|${recarga}`
  useEnVivo((cambio) => cambio.idExamen === idExamen, () => setRecarga((n) => n + 1))

  useEffect(() => {
    let vigente = true
    listarExpulsionesExamen(idExamen).then((registros) => {
      if (vigente) setResultado({ clave, registros: [...new Map(registros.map((r) => [r.idExpulsion, r])).values()] })
    }).catch(() => {
      if (vigente) setResultado({ clave, error: 'No se pudieron cargar las expulsiones de la sesión actual.' })
    })
    return () => { vigente = false }
  }, [idExamen, clave])

  const actual = resultado?.clave === clave ? resultado : undefined
  // El endpoint de controles ya está acotado al examen y puede omitir idExamen.
  const nombres = new Map(controles.filter((r) => r.idExamen == null || r.idExamen === idExamen).map((r) => [r.idEstudiante, r]))
  const titulo = (e: ExpulsionResponse) => {
    const r = nombres.get(e.idEstudiante)
    const nombre = e.estudiante?.trim() || r?.estudiante?.trim()
    const sis = e.codigoSis?.trim() || r?.codigoSis?.trim()
    return `${nombre || `Estudiante #${e.idEstudiante}`}${sis ? ` · SIS ${sis}` : ''}`
  }
  return (
    <section aria-label="Expulsiones de la sesión actual" className="my-4 rounded-xl border border-[#D8E3F5] bg-white p-3 sm:p-4">
      <h3 className="font-semibold text-[#B91C1C]">Expulsiones de la sesión actual ({actual?.registros?.length ?? '…'})</h3>
      {!actual && <p role="status" className="mt-2 text-sm text-[#627A9B]">Consultando expulsiones…</p>}
      {actual?.error && (
        <div role="alert" className="mt-2 text-sm text-[#B91C1C]">
          <p>{actual.error}</p>
          <button type="button" onClick={() => setRecarga((n) => n + 1)} className="mt-2 rounded-lg border px-3 py-2">
            Reintentar expulsiones
          </button>
        </div>
      )}
      {actual?.registros?.length === 0 && <p className="mt-2 text-sm text-[#627A9B]">No hay expulsiones en la sesión actual.</p>}
      {actual?.registros && actual.registros.length > 0 && (
        <ul className="mt-3 space-y-3">
          {actual.registros.map((registro) => (
            <li key={registro.idExpulsion} className={`rounded-lg border p-3 ${registro.anuladaEn ? 'border-[#D8E3F5] bg-[#F8FAFC]' : 'border-[#F1C4C9] bg-[#FFF8F8]'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold text-[#011140]">
                  {titulo(registro)}
                </h4>
                {registro.anuladaEn && (
                  <span className="rounded-full bg-[#ECFDF3] px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">Anulada · sigue con su examen</span>
                )}
              </div>
              <p className="mt-1 text-xs text-[#627A9B]">{examen ?? `Examen #${registro.idExamen}`}</p>
              <RegistroExpulsion registro={registro} />
              {puedeAnular && !registro.anuladaEn && (
                <AnularExpulsion idExamen={idExamen} registro={registro} nombre={titulo(registro)} onAnulada={() => setRecarga((n) => n + 1)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
