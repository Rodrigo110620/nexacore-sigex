import { GraduationCap, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import { useAuth } from '../../context/AuthContext'

/**
 * Inicio del rol ESTUDIANTE. Por ahora solo confirma que la cuenta está activa; el panel con sus
 * exámenes, su QR y su foto llega con CTA-02 y las siguientes historias del portal.
 */
export default function InicioEstudiantePage() {
  const { nombre, logout } = useAuth()
  const navigate = useNavigate()

  const cerrarSesion = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <AuthLayout>
      <div className="mx-auto flex min-h-full w-full items-center justify-center p-7 sm:px-8">
        <section className="w-full max-w-xl rounded-md border border-t-4 border-t-[#0439D9] bg-white px-8 py-10 text-center shadow-lg shadow-[#92aad2] sm:px-10">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#F1F6FF] text-[#0439D9]">
            <GraduationCap size={28} aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-extrabold text-[#092068]">Hola{nombre ? `, ${nombre}` : ''}</h1>
          <p className="mt-2 text-sm text-gray-500">Tu cuenta de estudiante está activa.</p>
          <p className="mt-1 text-sm text-gray-500">
            Muy pronto podrás ver aquí tus exámenes, tu QR de ingreso y registrar tu foto.
          </p>
          <button
            type="button"
            onClick={cerrarSesion}
            className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D8E3F5] px-6 text-sm font-semibold text-[#0439D9] transition-colors hover:bg-[#F1F6FF]"
          >
            <LogOut size={16} aria-hidden="true" />
            Cerrar sesión
          </button>
        </section>
      </div>
    </AuthLayout>
  )
}
