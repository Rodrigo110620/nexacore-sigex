import { ShieldCheck, Clock, FileLock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const CARACTERISTICAS: { icono: LucideIcon; titulo: string; texto: string }[] = [
  {
    icono: ShieldCheck,
    titulo: 'VERIFICACIÓN DE IDENTIDAD',
    texto: 'CI, código de matrícula y credencial QR en puerta.',
  },
  {
    icono: Clock,
    titulo: 'AUDITORÍA EN TIEMPO REAL',
    texto: 'Registro de cada ingreso para docentes y comités evaluadores.',
  },
  {
    icono: FileLock,
    titulo: 'INTEGRIDAD DEL PROCESO',
    texto: 'Detección y bloqueo automático de ingresos duplicados.',
  },
];

export default function Login_Information() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
        {CARACTERISTICAS.map(({ icono: Icono, titulo, texto }) => (
          <div
            key={titulo}
            className="flex gap-4 rounded-xl border border-white/70 bg-white/80 p-5 shadow-md shadow-[#b9c9e6] backdrop-blur-sm"
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-[#D8E3F5] bg-white">
              <Icono size={22} className="text-[#0439D9]" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide text-[#011140]">{titulo}</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{texto}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#BFD2F5] bg-[#E1ECFF]/80 px-5 py-3.5">
        <p className="text-sm leading-relaxed text-gray-700">
          <span className="font-bold text-[#011140]">Nota: </span>
          El acceso a este portal es solo para usuarios registrados por la institución. Si no tienes cuenta, consulta en Mesa de Ayuda.
        </p>
      </div>
    </div>
  );
}
