import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
// Importamos el componente que acabamos de crear
//import EditUserModal from '../../components/usuarios/EditUserModal';
import EditUserModal, { Usuario } from '../../components/usuarios/EditUserModal';

export default function DashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  // Estado para controlar la visibilidad del modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  const usuarioDePrueba: Usuario = {
    id: 15,
    nombres: 'Fernando',
    apellidos: 'Pereira',
    dni: '9405730',
    email: 'ferndpereira321@gmail.com',
    rol: 'ADMIN',
    activo: true
  };
  return (
    <div className="min-h-screen bg-[#e9f1ff] flex flex-col items-center justify-center gap-6">
      <div className="bg-white rounded-xl shadow-lg p-10 text-center">
        <h1 className="text-2xl font-bold text-[#011140] mb-2">Dashboard</h1>
        <p className="text-gray-500 text-sm mb-6">Módulo en desarrollo — Sprint 2</p>
        
        <div className="flex gap-4 justify-center">
          {/* Botón temporal para probar nuestra HU#3 */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-sm px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Editar Usuario (Prueba)
          </button>

          <button
            onClick={handleLogout}
            className="text-sm px-6 py-2 bg-[#0439D9] text-white rounded-lg hover:bg-[#0027a2] transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Renderizamos el modal y le pasamos su estado y la función para cerrar */}
      <EditUserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        usuarioSeleccionado={usuarioDePrueba}
      />
    </div>
  );
}