import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import Login_Information from './Login_Information';
import Login_Sesion from './Login_Sesion';
import { useIsMobileDevice } from '../../hooks/useIsMobileDevice';

const TRANSICION =
  'transition-[opacity,transform,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

/** Desvanece los bordes de la ilustración para que se funda con el fondo. */
const MASCARA_ILUSTRACION = 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 72%, transparent 100%)';

/**
 * Landing en "/" y formulario en "/login". Ambas rutas montan esta misma página,
 * así el cambio entre una y otra se anima (y el botón atrás del navegador vuelve a la landing).
 */
export default function LoginPage() {
  const isMobile = useIsMobileDevice();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const loginAbierto = pathname === '/login';
  const formRef = useRef<HTMLDivElement>(null);

  const abrirLogin = () => navigate('/login');

  useEffect(() => {
    if (!loginAbierto) return;
    // En móvil no enfocamos para no levantar el teclado de golpe.
    if (!isMobile) formRef.current?.querySelector('input')?.focus({ preventScroll: true });

    const cerrarConEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [loginAbierto, isMobile, navigate]);

  return (
    <AuthLayout onIniciarSesion={loginAbierto ? undefined : abrirLogin}>
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
            {/* Landing y formulario ocupan la misma celda y se cruzan al cambiar de ruta. */}
            <div className="grid">
              <section
                aria-hidden={loginAbierto}
                className={`[grid-area:1/1] self-center ${TRANSICION} ${
                  loginAbierto ? 'invisible -translate-x-10 opacity-0' : 'translate-x-0 opacity-100 delay-150'
                }`}
              >
                {isMobile && (
                  <img
                    src="/landing-ilustracion.webp"
                    alt=""
                    width={760}
                    height={442}
                    decoding="async"
                    className="mx-auto mb-6 w-full max-w-sm mix-blend-multiply"
                    style={{ maskImage: MASCARA_ILUSTRACION, WebkitMaskImage: MASCARA_ILUSTRACION }}
                  />
                )}
                <h1 className={`font-extrabold leading-tight text-[#011140] ${isMobile ? 'text-center text-[1.75rem]' : 'text-4xl xl:text-5xl'}`}>
                  Sistema de Control &amp; Fiscalización de Exámenes
                </h1>
                <p className={`mt-4 leading-relaxed text-[#1E2B4A] ${isMobile ? 'text-center text-base' : 'max-w-xl text-lg'}`}>
                  Plataforma oficial para la administración, control de acceso y verificación de identidad en jornadas evaluativas institucionales.
                </p>
                <button
                  type="button"
                  onClick={abrirLogin}
                  className="mt-8 inline-flex w-full max-w-sm items-center justify-center gap-3 rounded-xl bg-[#0439D9] px-8 py-4 text-base font-bold tracking-wide text-white shadow-lg shadow-[#0439D9]/25 transition-[background-color,transform] hover:bg-[#0027a2] active:scale-[0.98]"
                >
                  INICIAR SESIÓN
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </section>

              <section
                ref={formRef}
                aria-hidden={!loginAbierto}
                className={`[grid-area:1/1] mx-auto w-full max-w-lg self-center lg:mx-0 ${TRANSICION} ${loginAbierto ? 'translate-x-0 opacity-100 delay-150' : 'invisible translate-x-10 opacity-0'
                  }`}
              >
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0439D9] hover:text-[#0027a2]"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Volver
                </button>
                <Login_Sesion isMobile={isMobile} />
              </section>
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

          {/* grid-rows 1fr→0fr colapsa la altura de forma animable. */}
          <div
            aria-hidden={loginAbierto}
            className={`grid transition-[grid-template-rows,opacity,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              loginAbierto ? 'invisible grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
            }`}
          >
            <div className="-mx-3 min-h-0 overflow-hidden">
              {/* El relleno deja ver las sombras de las tarjetas pese al overflow-hidden. */}
              <div className="px-3 pb-4 pt-1">
                <Login_Information />
              </div>
            </div>
          </div>

          {isMobile && (
            <p className="mt-auto text-center text-xs leading-5 text-[#627A9B]">
              NexaCore Arquitectura de Software S.R.L 2026<br />
              Laboratorio TIS – UMSS v0.1
            </p>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
