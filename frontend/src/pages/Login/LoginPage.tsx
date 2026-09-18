import AuthLayout from '../../components/layout/AuthLayout';
import Login_Information from './Login_Information';
import Login_Sesion from './Login_Sesion';

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="mx-auto grid min-h-full w-full grid-cols-1 lg:h-full lg:max-w-6xl lg:grid-cols-[1.2fr_0.9fr] lg:gap-12 lg:px-8 lg:py-6">
        <div className="flex min-h-full items-center justify-center px-4 py-5 sm:px-8 lg:px-0 lg:py-0">
          <div className="flex w-full max-w-md flex-col lg:max-w-none">
            <div className="flex flex-col items-center lg:hidden">
              <p className="rounded-full border border-[#D8E3F5] bg-[#F4F8FF] px-4 py-2 text-center text-[11px] font-bold text-[#0439D9]">
                SISTEMA DE CONTROL &amp; INGRESO A EXÁMENES
              </p>
              <img src="/logo_app.png" alt="SIGEX" className="mt-7 h-16 w-48 object-contain" />
            </div>
            <Login_Sesion />
            <p className="mt-auto pt-12 text-center text-xs leading-5 text-[#627A9B] lg:hidden">
              NexaCore Arquitectura de Software S.R.L 2026<br />
              Laboratorio TIS – UMSS v0.1
            </p>
          </div>
        </div>

        <div className="hidden h-full min-h-0 w-full py-1 lg:block">
          <Login_Information />
        </div>

      </div>
    </AuthLayout>
  );
}
