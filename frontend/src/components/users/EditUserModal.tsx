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
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 p-0 sm:items-center sm:p-4 sm:overflow-y-auto">
      
      {/* 1. FORMULARIO PRINCIPAL */}
      {modalState === 'form' && (
        <div className="flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl sm:my-auto sm:h-auto sm:max-h-[min(90dvh,900px)] sm:rounded-2xl sm:border sm:border-gray-100">
          
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-4 sm:pt-6">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[#011140] sm:text-xl">Editar datos del usuario</h2>
              <p className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">Modifica la información y los roles de acceso.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          {/* Form Scrollable */}
          <form onSubmit={handleSave} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              
              {/* Columna Izquierda: Información Personal */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0439D9]">
                  <span className="h-2 w-2 rounded-full bg-[#0439D9]"></span>
                  Información Personal
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Nombres *</label>
                  <input
                    type="text"
                    name="nombres"
                    value={formData.nombres}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-gray-50/50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0439D9] ${errors.nombres ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.nombres && <span className="mt-1 block text-[10px] text-red-500">{errors.nombres}</span>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Apellidos Completos *</label>
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-gray-50/50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0439D9] ${errors.apellidos ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.apellidos && <span className="mt-1 block text-[10px] text-red-500">{errors.apellidos}</span>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Documento de Identidad *</label>
                  <input
                    type="text"
                    name="ci"
                    value={formData.ci}
                    onChange={handleChange}
                    placeholder="12345678"
                    className={`w-full rounded-xl border bg-gray-50/50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0439D9] ${errors.ci ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.ci && <span className="mt-1 block text-[10px] text-red-500">{errors.ci}</span>}
                </div>
              </div>

              {/* Columna Derecha: Credenciales y Acceso */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0439D9]">
                  <span className="h-2 w-2 rounded-full bg-[#0439D9]"></span>
                  Credenciales y Acceso
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Correo Institucional *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-gray-50/50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0439D9] ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  <span className="mt-1 block text-[10px] text-gray-400">Dominio permitido: @umss.edu.bo</span>
                  {errors.email && <span className="mt-1 block text-[10px] text-red-500">{errors.email}</span>}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Rol Asignado en Plataforma *</label>
                  <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-3">
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
                          className={`flex min-h-11 items-center gap-3 rounded-xl border p-2.5 text-left transition-all min-[380px]:flex-col min-[380px]:items-center min-[380px]:text-center ${
                            isSelected
                              ? (activeClasses[role.value] ?? 'border-[#0439D9] bg-[#E9F1FF] text-[#0439D9] ring-1 ring-[#0439D9]')
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <IconComponent size={16} className="shrink-0 min-[380px]:mb-1" />
                          <span className="min-w-0">
                            <span className="block text-xs font-bold">{role.titulo}</span>
                            <span className="block text-[9px] text-gray-400">{role.subtitulo}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Estado de cuenta */}
                <div className="pt-2">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-gray-800">Estado de cuenta Activo</span>
                      <span className="text-[10px] text-gray-500">Permite acceso inmediato al sistema</span>
                    </div>
                    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                        <input
                        type="checkbox"
                        checked={formData.activo}
                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#0439D9] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
                    </label>
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#E9F1FF]/60 px-3 py-3 text-xs text-[#011140] sm:px-4">
              <Info size={18} className="shrink-0 text-[#0439D9]" />
              <span>Los cambios se aplicarán inmediatamente. Toda acción queda auditada.</span>
            </div>
          </form>

          {/* Footer fijo */}
          <div className="flex shrink-0 flex-col gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <span className="text-[11px] text-gray-400">* Campos obligatorios</span>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-4 py-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 sm:px-5 sm:py-2.5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-[#0439D9] px-4 py-3 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-[#0c41e1] sm:px-6 sm:py-2.5"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL DE EDICIÓN EXITOSA */}
      {modalState === 'success' && (
        <div className="m-4 w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-2xl select-none">
          <CheckCircle2 className="mx-auto mb-3 select-none text-[#0439D9]" size={48} />
          <h3 className="select-none text-lg font-bold text-[#011140]">Actualización exitosa</h3>
          <p className="mt-2 mb-6 select-none px-2 text-xs text-gray-600 sm:px-4">
            La información y los roles de acceso del usuario fueron actualizados correctamente.
          </p>
          <button
            type="button"
            onClick={handleFinishSuccess}
            className="w-full rounded-xl bg-[#0439D9] py-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#0c41e1]"
          >
            Aceptar
          </button>
        </div>
      )}

      {/* 3. MODAL DE EDICIÓN FALLIDA */}
      {modalState === 'error' && (
        <div className="m-4 w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-2xl select-none">
          <AlertTriangle className="mx-auto mb-3 select-none text-amber-500" size={48} />
          <h3 className="select-none text-lg font-bold text-[#011140]">Error al actualizar</h3>
          <p className="mt-2 mb-6 select-none px-2 text-xs text-gray-600 sm:px-4">
            Ocurrió un problema al intentar guardar los cambios del usuario. La información no fue actualizada.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setModalState('form')}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl bg-[#0439D9] py-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#0c41e1]"
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