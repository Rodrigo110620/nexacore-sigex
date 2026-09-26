import AuthLayout from '../../components/layout/AuthLayout';
import Login_Information from './Login_Information';
import Login_Sesion from './Login_Sesion';
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice';

export default function LoginPage() {
  const isMobile = useIsMobileDevice();

  return (
    <AuthLayout>
      <div className={`mx-auto flex min-h-full w-full items-center justify-center p-7 sm:px-8 ${isMobile ? '' : 'lg:px-8 lg:py-8'}`}>
        <div
          className={`grid w-full items-stretch gap-8 ${
            isMobile ? 'grid-cols-1' : 'grid-cols-[minmax(0,1.6fr)_minmax(280px,0.7fr)] gap-6 xl:gap-10'
          }`}
        >
          <div className={`flex min-h-0 w-full items-center ${isMobile ? 'justify-center' : 'justify-end'}`}>
            <div className={`flex w-full flex-col items-center ${isMobile ? 'max-w-md' : 'max-w-2xl'}`}>
              {isMobile && (
                <div className="mb-6 flex flex-col items-center">
                  <p className="rounded-full border border-[#D8E3F5] bg-[#F4F8FF] px-4 py-2 text-center text-[11px] font-bold text-[#0439D9]">
                    SISTEMA DE CONTROL &amp; INGRESO A EXÁMENES
                  </p>
                  <img src="/logo_app.png" alt="SIGEX" className="mt-7 h-15 w-48 object-contain" />
                </div>
              )}
              <Login_Sesion isMobile={isMobile} />
              {isMobile && (
                <p className="mt-auto pt-12 text-center text-xs leading-5 text-[#627A9B]">
                  NexaCore Arquitectura de Software S.R.L 2026<br />
                  Laboratorio TIS – UMSS v0.1
                </p>
              )}
            </div>
          </div>

          {!isMobile && (
            <div className="min-h-0 w-full px-4 xl:px-7">
              <Login_Information />
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
