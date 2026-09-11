import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { usePlasma } from '../context/PlasmaContext'
import PlasmaPanel from './PlasmaPanel'
import PlasmaWindow from './PlasmaWindow'

const WINDOW_TITLES: Record<string, string> = {
  '/scanner': 'Escáner QR — Control de ingreso',
  '/reportes': 'Reportes de asistencia',
  '/apariencia': 'Apariencia — Look and Feel Plasma',
}

export default function PlasmaDesktop() {
  const { user, appearance } = usePlasma()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const windowTitle = WINDOW_TITLES[location.pathname]
  const wallpaperClass =
    appearance.wallpaper === 'nexacore'
      ? 'wallpaper-nexacore'
      : appearance.wallpaper === 'night'
        ? 'wallpaper-night'
        : 'wallpaper-aurora'

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div className={`wallpaper ${wallpaperClass}`}>
        <div className="aurora-shift" />
      </div>

      <main className="absolute inset-0 px-4 pb-[76px] pt-4">
        {windowTitle ? (
          <PlasmaWindow title={windowTitle}>
            <Outlet />
          </PlasmaWindow>
        ) : (
          <Outlet />
        )}
      </main>

      <PlasmaPanel />
    </div>
  )
}
