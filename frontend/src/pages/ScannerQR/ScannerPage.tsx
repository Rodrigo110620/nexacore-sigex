import { useState } from 'react'
import { IconCheck, IconQr } from '../../components/PlasmaIcons'

const DEMO_STUDENT = {
  nombre: 'Camila Rojas',
  registro: '2021-18432',
  materia: 'Cálculo II',
  aula: 'A-204',
  paralelo: 'A',
}

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<typeof DEMO_STUDENT | null>(null)

  const simulateScan = () => {
    setResult(null)
    setScanning(true)
    window.setTimeout(() => {
      setScanning(false)
      setResult(DEMO_STUDENT)
    }, 1400)
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <h2 className="text-xl font-semibold">Lector de ingreso</h2>
        <p className="mt-1 text-sm text-[var(--plasma-muted)]">
          Apunta el código QR del estudiante. En este tema Plasma el visor queda como un plasmoid de cámara.
        </p>

        <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-2xl bg-[#0a1016]">
          <div className="absolute inset-6 rounded-xl border border-white/20" />
          <div className="absolute left-10 top-10 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-[var(--plasma-accent)]" />
          <div className="absolute right-10 top-10 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-[var(--plasma-accent)]" />
          <div className="absolute bottom-10 left-10 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-[var(--plasma-accent)]" />
          <div className="absolute bottom-10 right-10 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-[var(--plasma-accent)]" />
          {scanning && (
            <div className="scan-line absolute left-[12%] right-[12%] h-0.5 bg-[var(--plasma-accent)] shadow-[0_0_16px_var(--plasma-accent)]" />
          )}
          <div className="absolute inset-0 flex items-center justify-center text-[var(--plasma-muted)]">
            <IconQr className="h-16 w-16 opacity-30" />
          </div>
        </div>

        <button
          type="button"
          onClick={simulateScan}
          disabled={scanning}
          className="focus-ring mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'var(--plasma-accent)' }}
        >
          {scanning ? 'Leyendo código...' : 'Simular lectura QR'}
        </button>
      </section>

      <aside className="rounded-2xl border border-[var(--plasma-border)] bg-[var(--plasma-card)] p-5">
        <p className="text-sm text-[var(--plasma-muted)]">Último ingreso</p>
        {result ? (
          <div className="mt-4">
            <div className="mb-4 flex items-center gap-2 text-[var(--plasma-positive)]">
              <IconCheck className="h-5 w-5" />
              <span className="font-medium">Ingreso autorizado</span>
            </div>
            <p className="text-2xl font-semibold">{result.nombre}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--plasma-muted)]">Registro</dt>
                <dd>{result.registro}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--plasma-muted)]">Materia</dt>
                <dd>{result.materia}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--plasma-muted)]">Aula</dt>
                <dd>{result.aula}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--plasma-muted)]">Paralelo</dt>
                <dd>{result.paralelo}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--plasma-muted)]">
            Esperando un código. El resultado se mostrará aquí como una tarjeta Breeze.
          </p>
        )}
      </aside>
    </div>
  )
}
