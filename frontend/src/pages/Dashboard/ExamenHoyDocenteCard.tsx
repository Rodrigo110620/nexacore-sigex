import { useEffect, useId, useState } from 'react'
import { ArrowRight, CircleCheck, Clock, Hourglass, Info, MapPin, ScanLine, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import useEnVivo from '../../hooks/useEnVivo'
import { obtenerResumenExamen, type ResumenEstudiantes } from '../../services/controlExamenService'
import type { ExamenDto } from '../../services/examenService'
import { addMinutes, etiquetaAulas, horaCorta, materiaYGrupo } from '../../utils/examenFormat'
import { aperturaControl, controlSinAbrir, type TiempoExamen } from '../../utils/tiempoExamen'

export const botonDocente = 'inline-flex min-h-10 min-[960px]:min-h-9 items-center justify-center gap-2 rounded-lg border border-[#ccdaf4] px-3 py-1.5 text-center text-xs font-semibold text-[#0439D9] transition-colors hover:bg-[#edf3ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]'

const metricas = [
  { label: 'Habilitados', icon: UsersRound, fondo: 'border-[#d8e4ff] bg-[#edf2fe]', color: 'text-[#0439D9]' },
  { label: 'Ingresados', icon: CircleCheck, fondo: 'border-[#c2efda] bg-[#eafbf2]', color: 'text-[#109d48]' },
  { label: 'Ausentes', icon: Hourglass, fondo: 'border-[#f9dfb6] bg-[#fdf6e6]', color: 'text-[#d97706]' },
]

export default function ExamenHoyDocenteCard({ examen, tiempo, horaActual, puedeControlar }: {
  examen: ExamenDto
  tiempo: TiempoExamen
  horaActual: string
  puedeControlar: boolean
}) {
  const gradiente = useId()
  const [resumen, setResumen] = useState<ResumenEstudiantes>()
  const [fallo, setFallo] = useState(false)
  const [recarga, setRecarga] = useState(0)
  useEnVivo((cambio) => cambio.idExamen === examen.idExamen, () => setRecarga((n) => n + 1))

  useEffect(() => {
    let vigente = true
    let timer: number
    const actualizar = async () => {
      try {
        const datos = await obtenerResumenExamen(examen.idExamen)
        if (vigente) {
          setResumen(datos)
          setFallo(false)
        }
      } catch {
        if (vigente) setFallo(true)
      } finally {
        if (vigente) timer = window.setTimeout(actualizar, 30_000)
      }
    }
    void actualizar()
    return () => {
      vigente = false
      window.clearTimeout(timer)
    }
  }, [examen.idExamen, recarga])

  const enCurso = tiempo.fase === 'en_curso'
  const finalizado = tiempo.fase === 'finalizado'
  const habilitados = resumen?.habilitados
  const ingresados = resumen?.ingresados
  const ausentes = resumen ? Math.max(0, resumen.habilitados - resumen.ingresados) : undefined
  const porcentaje = resumen && (resumen.habilitados
    ? Math.min(100, Math.round(resumen.ingresados * 100 / resumen.habilitados))
    : 0)
  const valores = [habilitados, ingresados, ausentes]
  // DASH-01: el expulsado sigue contando como ingresado (con su marca) y el trasladado cuenta en su aula nueva.
  const expulsados = resumen?.expulsados ?? 0
  const trasladados = resumen?.trasladados ?? 0
  const detalles = ['Asociados y habilitados',
    controlSinAbrir(tiempo) ? 'Aún no inicia' : expulsados ? `Incluye ${expulsados} ${expulsados === 1 ? 'expulsado' : 'expulsados'}` : 'Ingresos registrados',
    'Habilitados que no ingresaron']
  const marcas = [
    expulsados ? `${expulsados} ${expulsados === 1 ? 'expulsado: sigue' : 'expulsados: siguen'} contando como ingresado, con su marca.` : '',
    trasladados ? `${trasladados} ${trasladados === 1 ? 'trasladado' : 'trasladados'} de aula: ${trasladados === 1 ? 'cuenta' : 'cuentan'} en su aula nueva.` : '',
  ].filter(Boolean).join(' ')
  const apertura = aperturaControl(examen.fecha, examen.horaInicio)
  const aviso = fallo
    ? resumen ? 'Se muestran los últimos datos disponibles. Volveremos a intentar actualizarlos.' : 'No se pudieron cargar los contadores. Volveremos a intentarlo.'
    : controlSinAbrir(tiempo)
      ? `El control de ingreso abre a las ${apertura.hora}. Los contadores se actualizan solos.`
      : marcas
        ? marcas
      : resumen?.incidencias
        ? `${resumen.incidencias} ${resumen.incidencias === 1 ? 'incidencia registrada' : 'incidencias registradas'}. Consulta el panel del examen para ver el detalle.`
        : finalizado ? 'El examen finalizó. Puedes consultar sus resultados en el panel.' : 'Los contadores se actualizan sin recargar la página.'

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-[#e1e8f2] bg-white p-4 shadow-sm sm:p-[19px]">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap gap-1.5">
            <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${enCurso ? 'bg-[#d9fae7] text-[#087638]' : 'bg-[#eaf0f4] text-[#435166]'}`}>
              {enCurso ? 'En curso' : finalizado ? 'Finalizado' : 'No iniciado'}
            </span>
            {enCurso && !fallo && resumen && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d9fae7] px-2 py-1 text-[10px] font-semibold text-[#087638]">
                <span className="size-2 rounded-full bg-[#109d48]" /> En vivo <span className="hidden sm:inline">· {horaActual}</span>
              </span>
            )}
          </div>
          <h3 className="mb-1 break-words text-base font-bold leading-tight sm:text-lg">{materiaYGrupo(examen)}</h3>
          <p className="flex items-center gap-1.5 text-xs"><Clock size={14} className="shrink-0 text-[#42618e]" aria-hidden="true" />{horaCorta(examen.horaInicio)} – {addMinutes(examen.horaInicio, examen.duracionMinutos)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs"><MapPin size={14} className="shrink-0 text-[#42618e]" aria-hidden="true" />{etiquetaAulas(examen)}</p>
        </div>
        <div className="relative grid size-[64px] shrink-0 place-items-center sm:size-[88px]" aria-label={porcentaje === undefined ? 'Porcentaje pendiente' : `${porcentaje} % ingresó`}>
          <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
            <defs><linearGradient id={gradiente}><stop stopColor="#1bbf68" /><stop offset="1" stopColor="#0aa7da" /></linearGradient></defs>
            <circle cx="44" cy="44" r="38" fill="none" stroke="#eaf0f5" strokeWidth="11" />
            {!!porcentaje && <circle cx="44" cy="44" r="38" fill="none" stroke={`url(#${gradiente})`} strokeWidth="11" strokeLinecap="round" pathLength="100" strokeDasharray={`${porcentaje} 100`} />}
          </svg>
          <div className="text-center leading-tight" aria-hidden="true">
            <span className="block text-base font-extrabold sm:text-xl">{porcentaje === undefined ? '—' : `${porcentaje} %`}</span>
            <span className="block text-[10px] text-[#526e97]">Ingresó</span>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-1.5 sm:gap-3">
        {metricas.map(({ label, icon: Icon, fondo, color }, i) => (
          <div key={label} className={`min-w-0 rounded-xl border px-1.5 py-2 sm:p-3 min-[960px]:min-h-[110px] ${fondo}`}>
            <dt className="flex items-center gap-1 text-[clamp(0.5625rem,2.6vw,0.75rem)] font-semibold">
              <Icon size={14} className={`shrink-0 ${color}`} aria-hidden="true" />{label}
            </dt>
            <dd className={`text-xl font-bold leading-tight sm:text-[30px] ${color}`}>{valores[i] ?? '—'}</dd>
            <dd className="mt-1 hidden text-[10px] leading-tight text-[#526e97] sm:block">{detalles[i]}</dd>
          </div>
        ))}
      </dl>

      <div>
        <div className="flex justify-between gap-2 text-[11px] sm:text-xs">
          <span>{resumen ? `${ingresados} de ${habilitados} ingresaron` : fallo ? 'Contadores no disponibles' : 'Cargando contadores…'}</span>
          {resumen && <span className="text-[#526e97]">{ausentes} por ingresar</span>}
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#eaf0f5]" aria-hidden="true">
          <div className="h-full rounded-full bg-gradient-to-r from-[#1bbf68] to-[#0aa7da] transition-[width]" style={{ width: `${porcentaje ?? 0}%` }} />
        </div>
      </div>

      <p className="flex flex-1 items-start gap-2 rounded-lg bg-[#f2f5fa] p-2.5 text-[11px] leading-snug text-[#42618e] min-[960px]:min-h-[47px]">
        <Info size={15} className="shrink-0" aria-hidden="true" />{aviso}
      </p>
      <div className={`grid gap-2 ${puedeControlar ? 'min-[1100px]:grid-cols-[minmax(0,1fr)_auto]' : ''}`}>
        <Link to={`/dashboard/control/${examen.idExamen}`} className={`${botonDocente} !border-[#0439D9] !bg-[#0439D9] !text-white hover:!bg-[#032db0]`}>
          Ver panel del examen <ArrowRight size={16} aria-hidden="true" />
        </Link>
        {puedeControlar && !finalizado && <Link to={`/dashboard/control/${examen.idExamen}/identificar`} className={botonDocente}><ScanLine size={16} aria-hidden="true" /> Controlar ingreso</Link>}
      </div>
    </article>
  )
}

