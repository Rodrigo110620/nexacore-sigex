import { VERSION_SIGEX } from '../../utils/version'

export default function Footer() {
  return (
    <footer className="border-t border-gray-300 bg-white px-4 py-2.5 text-center text-xs text-gray-500 shadow-[0_-3px_6px_-2px_rgba(146,170,210,0.25)] sm:px-8">
      <p className="leading-relaxed">
        <span className="hidden sm:inline">
          © 2026 NexaCore Arquitectura de Software S.R.L. · SIGEX v{VERSION_SIGEX} · Universidad Mayor de San Simón —{' '}
          <span className="text-blue-600">Facultad de Ciencias y Tecnología</span>
        </span>
        <span className="sm:hidden">© 2026 NexaCore · SIGEX v{VERSION_SIGEX} · UMSS</span>
      </p>
    </footer>
  );
}
