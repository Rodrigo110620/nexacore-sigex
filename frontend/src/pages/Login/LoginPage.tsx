import { useEffect, useRef } from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import Login_Information from './Login_Information';
import Login_Sesion from './Login_Sesion';
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice';
import { PIE_CORTO } from '../../utils/version'

/** Desvanece los bordes de la ilustración para que se funda con el fondo. */
const MASCARA_ILUSTRACION = 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 72%, transparent 100%)';

/** '/' y '/login' muestran la misma pantalla pública. */
export default function LoginPage() {
  const isMobile = useIsMobileDevice();
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // En móvil no enfocamos para no levantar el teclado de golpe.
    if (!isMobile) formRef.current?.querySelector('input')?.focus({ preventScroll: true });
  }, [isMobile]);

  return (
    <AuthLayout>
      <div className="flex w-full flex-col bg-[#EEF4FC] bg-[url('/landing-fondo.webp')] bg-cover bg-center">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-8 px-4 py-8 sm:px-8 lg:px-10 lg:py-10">
          {isMobile && (
            <div className="flex flex-col items-center">
              <p className="rounded-full border border-[#D8E3F5] bg-[#F4F8FF] px-4 py-2 text-center text-[11px] font-bold text-[#0439D9]">
                SISTEMA DE CONTROL &amp; INGRESO A EXÁMENES
              </p>
              <img src="/logo_app.png" alt="SIGEX" className="mt-6 h-15 w-48 object-contain" />
            </div>
          )}

          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-12">
            <div ref={formRef} className="mx-auto w-full max-w-lg self-center lg:mx-0">
              <Login_Sesion isMobile={isMobile} />
            </div>

            <img
              src="/landing-ilustracion.webp"
              alt=""
              width={760}
              height={442}
              decoding="async"
              className={`mx-auto w-full max-w-xl mix-blend-multiply ${isMobile ? 'hidden' : 'hidden lg:block'}`}
              style={{ maskImage: MASCARA_ILUSTRACION, WebkitMaskImage: MASCARA_ILUSTRACION }}
            />
          </div>

          <Login_Information />

          {isMobile && (
            <p className="mt-auto text-center text-xs leading-5 text-[#627A9B]">
              © 2026 NexaCore Arquitectura de Software S.R.L.<br />
              {PIE_CORTO}
            </p>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
