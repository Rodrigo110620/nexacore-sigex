import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import PanelLayout from '../../components/layout/PanelLayout';
import RegisterUserModal from '../../components/admin/RegisterUserModal';

export default function UsuariosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <PanelLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[#011140] font-bold text-lg">Gestión de Usuarios</h2>
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
    </PanelLayout>
  );
}