import { UserPlus, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RegisterUserModal from '../../components/admin/RegisterUserModal';

export default function UsuariosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Barra superior */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-8 py-3 flex items-center justify-between">
        <h1 className="text-[#011140] font-bold text-lg">Panel de Administración</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#0439D9] transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </header>

      {/* Contenido */}
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[#011140] font-semibold text-base">Gestión de Usuarios</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0439D9] text-white font-bold text-sm rounded-lg hover:bg-[#0027a2] transition-colors"
          >
            <UserPlus size={18} />
            Registrar Usuario
          </button>
        </div>

        <RegisterUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>

    </div>
  );
}