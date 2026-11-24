import { useCallback, useEffect, useState } from 'react'
import { CalendarRange, CircleAlert, CircleCheck, LoaderCircle, Plus } from 'lucide-react'
import { activarPeriodo, crearPeriodo, listarPeriodos, type PeriodoDto } from '../../services/periodoService'
import { formatFecha } from '../../utils/examenFormat'

const FORMATO = /^(I|II|VERANO|INVIERNO)-\d{4}$/

function mensajeDe(err: unknown, porDefecto: string): string {
  const data = (err as { response?: { data?: { mensaje?: string; errores?: Record<string, string> } } }).response?.data
  return data?.errores ? Object.values(data.errores)[0] : data?.mensaje ?? porDefecto
}

/**
 * Configuración → Periodos académicos (solo ADMIN, V61). El periodo activo es el de los grupos y exámenes nuevos;
 * los anteriores quedan como historial y se consultan eligiéndolos en Exámenes.
 */
export default function PeriodosAcademicos() {
  const [periodos, setPeriodos] = useState<PeriodoDto[]>([])
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
  const [form, setForm] = useState({ nombre: '', fechaInicio: '', fechaFin: '', activar: false })
  const [guardando, setGuardando] = useState(false)
  const [activando, setActivando] = useState<number | null>(null)

  const cargar = useCallback(() => {
    listarPeriodos()
      .then(setPeriodos)
      .catch(() => setAviso({ ok: false, texto: 'No se pudieron cargar los periodos.' }))
      .finally(() => setCargando(false))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const nombre = form.nombre.trim().toUpperCase()
  const errorNombre = nombre && !FORMATO.test(nombre) ? 'Usa el formato I-2027, II-2027, VERANO-2027 o INVIERNO-2027.' : ''
  const errorFechas = form.fechaInicio && form.fechaFin && form.fechaFin <= form.fechaInicio
    ? 'La fecha de fin debe ser posterior a la de inicio.' : ''
  const completo = nombre && form.fechaInicio && form.fechaFin && !errorNombre && !errorFechas

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!completo || guardando) return
    setGuardando(true)
    setAviso(null)
    try {
      const nuevo = await crearPeriodo({ ...form, nombre })
      setAviso({ ok: true, texto: `Periodo ${nuevo.nombre} creado${nuevo.activo ? ' y activado' : ''}.` })
      setForm({ nombre: '', fechaInicio: '', fechaFin: '', activar: false })
      cargar()
    } catch (err) {
      setAviso({ ok: false, texto: mensajeDe(err, 'No se pudo crear el periodo.') })
    } finally {
      setGuardando(false)
    }
  }

  const activar = async (p: PeriodoDto) => {
    if (!window.confirm(`¿Activar ${p.nombre}? Desde ahora los grupos y exámenes nuevos serán de ese periodo.`)) return
    setActivando(p.idPeriodo)
    setAviso(null)
    try {
      await activarPeriodo(p.idPeriodo)
      setAviso({ ok: true, texto: `${p.nombre} es ahora el periodo activo.` })
      cargar()
    } catch (err) {
      setAviso({ ok: false, texto: mensajeDe(err, 'No se pudo activar el periodo.') })
    } finally {
      setActivando(null)
    }
  }

  const campo = 'h-11 w-full rounded-lg border border-[#B8CBEF] bg-white px-3 text-sm text-[#011140] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0439D9]/30'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#011140]">Periodos académicos</h2>
        <p className="text-sm text-[#627A9B]">
          Cada grupo, con sus inscritos y exámenes, pertenece a un periodo. Al empezar un semestre, crea su periodo y
          actívalo: los grupos se vuelven a armar y lo del semestre anterior queda como historial.
        </p>
      </div>

      {aviso && (
        <p role={aviso.ok ? 'status' : 'alert'}
          className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${aviso.ok ? 'bg-[#ECFDF3] text-[#05603A]' : 'bg-[#FEF3F2] text-[#B42318]'}`}>
          {aviso.ok ? <CircleCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
          {aviso.texto}
        </p>
      )}

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#D8E3F5]">
        <h3 className="mb-3 text-sm font-bold text-[#011140]">Periodos</h3>
        {cargando ? (
          <p className="flex items-center gap-2 text-sm text-[#627A9B]"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Cargando…</p>
        ) : (
          <ul className="divide-y divide-[#EEF2F8]">
            {periodos.map((p) => (
              <li key={p.idPeriodo} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <CalendarRange size={18} className="shrink-0 text-[#45628D]" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#011140]">{p.nombre}</p>
                    <p className="text-xs text-[#627A9B]">{formatFecha(p.fechaInicio)} al {formatFecha(p.fechaFin)}</p>
                  </div>
                </div>
                {p.activo ? (
                  <span className="rounded-full bg-[#ECFDF3] px-2.5 py-1 text-xs font-semibold text-[#05603A]">Activo</span>
                ) : (
                  <button type="button" onClick={() => void activar(p)} disabled={activando !== null}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#B8CBEF] px-3 text-xs font-semibold text-[#0439D9] hover:bg-[#F1F6FF] disabled:opacity-50">
                    {activando === p.idPeriodo && <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />}
                    Activar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={(e) => void crear(e)} noValidate className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#D8E3F5]">
        <h3 className="mb-3 text-sm font-bold text-[#011140]">Nuevo periodo</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="periodo-nombre" className="mb-1 block text-xs font-medium text-[#011140]">Nombre</label>
            <input id="periodo-nombre" value={form.nombre} placeholder="I-2027" maxLength={20}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              aria-invalid={Boolean(errorNombre)} className={campo} />
          </div>
          <div>
            <label htmlFor="periodo-inicio" className="mb-1 block text-xs font-medium text-[#011140]">Inicio</label>
            <input id="periodo-inicio" type="date" value={form.fechaInicio}
              onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))} className={campo} />
          </div>
          <div>
            <label htmlFor="periodo-fin" className="mb-1 block text-xs font-medium text-[#011140]">Fin</label>
            <input id="periodo-fin" type="date" value={form.fechaFin}
              onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))}
              aria-invalid={Boolean(errorFechas)} className={campo} />
          </div>
        </div>
        {(errorNombre || errorFechas) && <p className="mt-2 text-xs text-[#B42318]">{errorNombre || errorFechas}</p>}
        <label className="mt-3 flex items-center gap-2 text-sm text-[#011140]">
          <input type="checkbox" checked={form.activar} onChange={(e) => setForm((f) => ({ ...f, activar: e.target.checked }))} />
          Activarlo al crearlo
        </label>
        <button type="submit" disabled={!completo || guardando}
          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0439D9] px-4 text-sm font-semibold text-white hover:bg-[#0027a2] disabled:opacity-50">
          {guardando ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          Crear periodo
        </button>
      </form>
    </div>
  )
}
