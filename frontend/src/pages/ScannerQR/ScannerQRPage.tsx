import { FormEvent, useMemo, useState } from 'react'

type ScanResult = {
  code: string
  at: string
  status: 'Admitido' | 'No encontrado' | 'Duplicado'
}

function classify(code: string, previous: ScanResult[]): ScanResult['status'] {
  if (previous.some((item) => item.code === code)) return 'Duplicado'
  if (/^\d{4}-\d{5}$/.test(code) || /^SIGEX-[A-Z0-9]{4}$/.test(code)) return 'Admitido'
  return 'No encontrado'
}

export default function ScannerQRPage() {
  const [code, setCode] = useState('')
  const [scans, setScans] = useState<ScanResult[]>([])
  const [message, setMessage] = useState('Apunta el código o ingrésalo a mano para simular el ingreso.')

  const last = scans[0]
  const admitted = useMemo(() => scans.filter((item) => item.status === 'Admitido').length, [scans])

  function register(raw: string) {
    const trimmed = raw.trim().toUpperCase()
    if (!trimmed) return
    const status = classify(trimmed, scans)
    const entry: ScanResult = {
      code: trimmed,
      at: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status,
    }
    setScans((current) => [entry, ...current].slice(0, 8))
    setMessage(
      status === 'Admitido'
        ? `${trimmed} admitido. Puedes continuar con el siguiente.`
        : status === 'Duplicado'
          ? `${trimmed} ya fue leído en esta mesa.`
          : `${trimmed} no coincide con el padrón de esta mesa.`,
    )
    setCode('')
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    register(code)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="plasma-glass rounded-3xl p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-plasma-mist">Mesa de ingreso</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Escáner QR Plasma</h1>
        <p className="mt-2 text-sm text-plasma-mist">
          Marco de lectura con barrido luminoso. En esta personalización el ingreso se simula con el
          código del estudiante.
        </p>
        <div className="relative mx-auto mt-8 aspect-square max-w-sm overflow-hidden rounded-[2rem] border border-accent/40 bg-plasma-void/80 shadow-plasma">
          <div className="absolute inset-6 rounded-3xl border-2 border-accent/70" />
          <div className="absolute left-10 top-10 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-white" />
          <div className="absolute right-10 top-10 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-white" />
          <div className="absolute bottom-10 left-10 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-white" />
          <div className="absolute bottom-10 right-10 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-white" />
          <div className="absolute inset-x-12 top-0 h-1/2 bg-gradient-to-b from-accent/40 to-transparent animate-scan-line" />
          <p className="absolute inset-x-0 bottom-8 text-center text-xs uppercase tracking-[0.3em] text-plasma-mist">
            Listo para leer
          </p>
        </div>
        <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
          <input
            className="plasma-input"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="2024-18421 o SIGEX-A9K2"
            aria-label="Código del estudiante"
          />
          <button className="plasma-btn sm:w-40" type="submit">
            Validar
          </button>
        </form>
        <p className="mt-4 text-sm text-plasma-mist">{message}</p>
      </section>
      <section className="plasma-glass rounded-3xl p-6">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Lecturas de la mesa</h2>
          <p className="text-sm text-plasma-mist">{admitted} admitidos</p>
        </div>
        {last ? (
          <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/10 p-4">
            <p className="text-xs uppercase tracking-widest text-plasma-mist">Último código</p>
            <p className="mt-1 font-display text-2xl">{last.code}</p>
            <p className="text-sm text-plasma-mist">
              {last.status} · {last.at}
            </p>
          </div>
        ) : null}
        <ul className="mt-4 space-y-3">
          {scans.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-accent/25 px-4 py-8 text-center text-sm text-plasma-mist">
              Todavía no hay lecturas. Prueba con 2024-18421.
            </li>
          ) : (
            scans.map((scan, index) => (
              <li
                key={`${scan.code}-${scan.at}-${index}`}
                className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{scan.code}</p>
                  <p className="text-xs text-plasma-mist">{scan.at}</p>
                </div>
                <span
                  className={`text-sm ${
                    scan.status === 'Admitido'
                      ? 'text-emerald-300'
                      : scan.status === 'Duplicado'
                        ? 'text-amber-300'
                        : 'text-rose-300'
                  }`}
                >
                  {scan.status}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
