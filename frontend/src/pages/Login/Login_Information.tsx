import { ShieldCheck, Clock, Lock } from 'lucide-react';

export default function Login_Information() {
  return (
    <div className="bg-[#e9f1ff] rounded-lg p-6 flex flex-col shadow-sm h-full w-full shadow-[#6b88e0] ">

      <div className="flex justify-center gap-2 mb-6">
        <span className="w-2 h-2 rounded-full bg-[#0439D9]"></span>
        <span className="w-2 h-2 rounded-full bg-[#0439D9]/30"></span>
        <span className="w-2 h-2 rounded-full bg-[#0439D9]/30"></span>
      </div>

      <h2 className="text-lg font-bold text-[#0439D9] leading-tight mb-3">
        Sistema de Control & Fiscalización de Exámenes
      </h2>
      <p className="text-xs text-gray-600 mb-6 leading-relaxed">
        Plataforma oficial para la administración, control de acceso y verificación biométrica en jornadas evaluativas institucionales.
      </p>

      <div className="flex flex-col gap-5">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <ShieldCheck size={20} className="text-[#0439D9]" />
          </div>
          <div>
            <h3 className="text-[0.70rem] font-bold text-[#011140] tracking-wide">
              VERIFICACIÓN DE IDENTIDAD
            </h3>
            <p className="text-[0.70rem] text-gray-600 leading-relaxed">
              DNI, código de matrícula y validación biométrica en puerta.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <Clock size={20} className="text-[#0439D9]" />
          </div>
          <div>
            <h3 className="text-[0.70rem] font-bold text-[#011140] tracking-wide">
              AUDITORÍA EN TIEMPO REAL
            </h3>
            <p className="text-[0.70rem] text-gray-600 leading-relaxed">
              Registro inmutable de ingresos para docentes y comités evaluadores.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <Lock size={20} className="text-[#0439D9]" />
          </div>
          <div>
            <h3 className="text-[0.70rem] font-bold text-[#011140] tracking-wide">
              INTEGRIDAD DEL PROCESO
            </h3>
            <p className="text-[0.70rem] text-gray-600 leading-relaxed">
              Detección y bloqueo automático de duplicidad de credenciales.
            </p>
          </div>
        </div>

      </div>

      <div className="mt-auto pt-6">
        <div className="bg-white rounded-lg p-4 border-l-4 border-[#0439D9] shadow-sm">
          <p className="text-[0.70rem] text-gray-700 leading-relaxed">
            <span className="font-bold text-[#011140]">Nota para postulantes: </span>
            El acceso a este portal está reservado exclusivamente para personal académico y administrativo autorizado.
          </p>
        </div>
      </div>

    </div>
  );
}