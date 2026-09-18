import React, { useState } from 'react';
import { X, Shield, BookOpen, Users as UsersIcon, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useRoles } from '../../hooks/useRoles';

interface User {
  id?: string | number;
  nombre?: string;
  apellidos?: string;
  ci?: string;
  email?: string;
  rol?: string;
  estado?: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onSaveSuccess?: (updatedUser: unknown) => void;
}

function buildFormFromUser(user?: User | null) {
  return {
    nombres: user?.nombre || '',
    apellidos: user?.apellidos || '',
    ci: user?.ci || '',
    email: user?.email || '',
    rol: user?.rol || 'DOCENTE',
    activo: user?.estado === 'activo',
  };
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSaveSuccess }) => {
  const { roles } = useRoles();
  // El padre remonta este modal con key={user.id} al abrir otro usuario.
  const [formData, setFormData] = useState(() => buildFormFromUser(user));
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [modalState, setModalState] = useState<'form' | 'success' | 'error'>('form');

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { [key: string]: string } = {};
    if (!formData.nombres.trim()) newErrors.nombres = 'El nombre es obligatorio';
    if (!formData.apellidos.trim()) newErrors.apellidos = 'Los apellidos son obligatorios';
    if (!formData.ci.trim()) newErrors.ci = 'El documento es obligatorio';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) newErrors.email = 'El formato del correo no es válido';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await api.put(`/usuarios/${user?.id}`, {
        nombre: formData.nombres,
        apellidos: formData.apellidos,
        ci: formData.ci,
        email: formData.email,
        rol: formData.rol,
        activo: formData.activo,
        notificarEmail: false,
      });
      setModalState('success');
    } catch {
      setModalState('error');
    }
  };

  const handleFinishSuccess = () => {
    if (onSaveSuccess) {
      onSaveSuccess(formData);
    }
    setModalState('form');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      
      {/* 1. FORMULARIO PRINCIPAL */}
      {modalState === 'form' && (
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100 my-auto max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex justify-between items-start shrink-0">
            <div>
              <h2 className="text-xl font-bold text-[#011140]">Editar Datos del Usuario</h2>
              <p className="text-xs text-gray-500 mt-0.5">Modifica los datos del usuario para mantener actualizada su información y sus roles de acceso.</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>

          {/* Form Scrollable */}
          <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Columna Izquierda: Información Personal */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0439D9]">
                  <span className="w-2 h-2 rounded-full bg-[#0439D9]"></span>
                  Información Personal
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombres *</label>
                  <input
                    type="text"
                    name="nombres"
                    value={formData.nombres}
                    onChange={handleChange}
                    className={`w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#0439D9] focus:outline-none bg-gray-50/50 ${errors.nombres ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.nombres && <span className="text-[10px] text-red-500 mt-1 block">{errors.nombres}</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Apellidos Completos *</label>
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleChange}
                    className={`w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#0439D9] focus:outline-none bg-gray-50/50 ${errors.apellidos ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.apellidos && <span className="text-[10px] text-red-500 mt-1 block">{errors.apellidos}</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Documento de Identidad *</label>
                  <input
                    type="text"
                    name="ci"
                    value={formData.ci}
                    onChange={handleChange}
                    placeholder="12345678"
                    className={`w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#0439D9] focus:outline-none bg-gray-50/50 ${errors.ci ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.ci && <span className="text-[10px] text-red-500 mt-1 block">{errors.ci}</span>}
                </div>
              </div>

              {/* Columna Derecha: Credenciales y Acceso */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0439D9]">
                  <span className="w-2 h-2 rounded-full bg-[#0439D9]"></span>
                  Credenciales y Acceso
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Correo Institucional *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#0439D9] focus:outline-none bg-gray-50/50 ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Dominio permitido: @umss.edu.bo</span>
                  {errors.email && <span className="text-[10px] text-red-500 mt-1 block">{errors.email}</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Rol Asignado en Plataforma *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {roles.map((role) => {
                      const icons: Record<string, React.ElementType> = { ADMIN: Shield, DOCENTE: BookOpen, CONTROL: UsersIcon };
                      const activeClasses: Record<string, string> = {
                        ADMIN: 'border-blue-600 bg-blue-50/60 text-blue-700 ring-1 ring-blue-600',
                        DOCENTE: 'border-emerald-600 bg-emerald-50/60 text-emerald-700 ring-1 ring-emerald-600',
                        CONTROL: 'border-amber-500 bg-amber-50/60 text-amber-700 ring-1 ring-amber-500',
                      };
                      const IconComponent = icons[role.value] ?? UsersIcon;
                      const isSelected = formData.rol === role.value;
                      return (
                        <button
                          type="button"
                          key={role.value}
                          onClick={() => setFormData({ ...formData, rol: role.value })}
                          className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all ${
                            isSelected
                              ? (activeClasses[role.value] ?? 'border-[#0439D9] bg-[#E9F1FF] text-[#0439D9] ring-1 ring-[#0439D9]')
                              : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                          }`}
                        >
                          <IconComponent size={16} className="mb-1" />
                          <span className="text-xs font-bold">{role.titulo}</span>
                          <span className="text-[9px] text-gray-400">{role.subtitulo}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Estado de cuenta */}
                <div className="pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50">
                    <div>
                      <span className="text-xs font-bold text-gray-800 block">Estado de cuenta Activo</span>
                      <span className="text-[10px] text-gray-500">Permite acceso inmediato al sistema</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                        type="checkbox"
                        checked={formData.activo}
                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0439D9]"></div>
                    </label>
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-6 px-4 py-3 bg-[#E9F1FF]/60 rounded-xl flex items-center gap-3 text-xs text-[#011140]">
              <Info size={18} className="text-[#0439D9] shrink-0" />
              <span>Los cambios se aplicarán inmediatamente. Toda acción queda auditada bajo la norma de seguridad académica institucional.</span>
            </div>
          </form>

          {/* Footer fijo */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
            <span className="text-[11px] text-gray-400">* Campos con (*) son mandatorios</span>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-[#0439D9] text-white rounded-xl hover:bg-[#0c41e1] text-xs font-semibold transition-colors shadow-sm shadow-blue-500/20"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL DE EDICIÓN EXITOSA */}
      {modalState === 'success' && (
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 p-6 text-center select-none animate-in fade-in zoom-in duration-200">
          <CheckCircle2 className="mx-auto text-[#0439D9] mb-3 select-none" size={48} />
          <h3 className="text-lg font-bold text-[#011140] select-none">Actualización exitosa</h3>
          <p className="text-xs text-gray-600 mt-2 mb-6 px-4 select-none">
            La información y los roles de acceso del usuario fueron actualizados correctamente.
          </p>
          <button
            type="button"
            onClick={handleFinishSuccess}
            className="w-full py-2.5 bg-[#0439D9] text-white rounded-xl hover:bg-[#0c41e1] text-xs font-semibold transition-colors shadow-sm"
          >
            Aceptar
          </button>
        </div>
      )}

      {/* 3. MODAL DE EDICIÓN FALLIDA */}
      {modalState === 'error' && (
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 p-6 text-center select-none animate-in fade-in zoom-in duration-200">
          <AlertTriangle className="mx-auto text-amber-500 mb-3 select-none" size={48} />
          <h3 className="text-lg font-bold text-[#011140] select-none">Error al actualizar</h3>
          <p className="text-xs text-gray-600 mt-2 mb-6 px-4 select-none">
            Ocurrió un problema al intentar guardar los cambios del usuario. La información no fue actualizada.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setModalState('form')}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 bg-[#0439D9] text-white rounded-xl hover:bg-[#0c41e1] text-xs font-semibold transition-colors shadow-sm"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditUserModal;