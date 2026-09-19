import AuthLayout from '../../components/layout/AuthLayout';
import Login_Information from './Login_Information';
import Login_Sesion from './Login_Sesion';

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="mx-auto flex min-h-full w-full items-center justify-center p-7 sm:px-8 lg:px-8 lg:py-8">
        <div className="grid w-full grid-cols-1 items-stretch gap-8 lg:grid-cols-[1.6fr_0.7fr] lg:gap-12 ">
          <div className="flex min-h-0 w-full items-center justify-center lg:justify-end">
            <div className="flex w-full max-w-2xl flex-col items-center">
              <div className="flex flex-col items-center lg:hidden">
                <p className="rounded-full border border-[#D8E3F5] bg-[#F4F8FF] px-4 py-2 text-center text-[11px] font-bold text-[#0439D9]">
                  SISTEMA DE CONTROL &amp; INGRESO A EXÁMENES
                </p>
                <img src="/logo_app.png" alt="SIGEX" className="mt-7 h-15 w-48 object-contain" />
              </div>
              <Login_Sesion />
              <p className="mt-auto pt-12 text-center text-xs leading-5 text-[#627A9B] lg:hidden">
                NexaCore Arquitectura de Software S.R.L 2026<br />
                Laboratorio TIS – UMSS v0.1
              </p>
            </div>
          </div>

          <div className="hidden min-h-0 w-full lg:block pl-6">
            <Login_Information />
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}