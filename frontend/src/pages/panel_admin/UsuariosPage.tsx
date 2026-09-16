import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import RegisterUserModal from '../../components/admin/RegisterUserModal';

export default function UsuariosPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-8">
  
      <div className="flex items-center justify-between mb-6">
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
  );
}