import React, { useState } from 'react';
import { X, Shield, BookOpen, Users as UsersIcon, Eye, Info, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
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
  const [formData, setFormData] = useState(() => buildFormFromUser(user));
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [modalState, setModalState] = useState<'form' | 'success' | 'error'>('form');
  
  // Estado para el input de agregar un rol nuevo
  const [nuevoRol, setNuevoRol] = useState('');

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'nombres' || name === 'apellidos') {
      const filteredValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
      setFormData({ ...formData, [name]: filteredValue });
      setErrors({ ...errors, [name]: '' });
      return;
    }

    if (name === 'ci') {
      const filteredValue = value.replace(/\D/g, '').slice(0, 8);
      setFormData({ ...formData, [name]: filteredValue });
      setErrors({ ...errors, [name]: '' });
      return;
    }

    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const handleAddRol = () => {
    if (!nuevoRol.trim()) return;
    setNuevoRol('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { [key: string]: string } = {};
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

    if (!formData.nombres.trim()) {
      newErrors.nombres = 'El nombre es obligatorio';
    } else if (formData.nombres.length > 50) {
      newErrors.nombres = 'El nombre no puede superar los 50 caracteres';
    } else if (!nameRegex.test(formData.nombres)) {
      newErrors.nombres = 'El nombre solo debe contener letras y espacios';
    }

    if (!formData.apellidos.trim()) {
      newErrors.apellidos = 'Los apellidos son obligatorios';
    } else if (formData.apellidos.length > 50) {
      newErrors.apellidos = 'Los apellidos no pueden superar los 50 caracteres';
    } else if (!nameRegex.test(formData.apellidos)) {
      newErrors.apellidos = 'Los apellidos solo deben contener letras y espacios';
    }

    if (!formData.ci.trim()) {
      newErrors.ci = 'El documento es obligatorio';
    } else if (formData.ci.length < 5 || formData.ci.length > 8) {
      newErrors.ci = 'El documento de identidad debe tener entre 5 y 8 dígitos';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'El formato del correo no es válido';
    } else if (formData.email.length > 100) {
      newErrors.email = 'El correo no puede superar los 100 caracteres';
    }

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
              <h2 className="text-lg font-bold text-[#011140] sm:text-xl">Editar Datos del Usuario</h2>
              <p className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">Modifica los datos del usuario para mantener actualizada su información y sus roles de acceso.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          {/* Form Scrollable */}
          <form onSubmit={handleSave} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-900">
                  <span className="h-2 w-2 rounded-full bg-[#0439D9]"></span>
                  Información Personal
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Nombres <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nombres"
                    maxLength={20}
                    value={formData.nombres}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-gray-50/50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0439D9] ${errors.nombres ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.nombres && <span className="mt-1 block text-[10px] text-red-500">{errors.nombres}</span>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Apellidos Completos <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="apellidos"
                    maxLength={50}
                    value={formData.apellidos}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-gray-50/50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0439D9] ${errors.apellidos ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.apellidos && <span className="mt-1 block text-[10px] text-red-500">{errors.apellidos}</span>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Documento de Identidad <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <span className="mr-2 inline-flex shrink-0 select-none items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700">
                      CI
                    </span>
                    <input
                      type="text"
                      name="ci"
                      maxLength={8}
                      value={formData.ci}
                      onChange={handleChange}
                      placeholder="Nº de carné"
                      className={`w-full rounded-xl border bg-gray-50/50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0439D9] ${errors.ci ? 'border-red-500' : 'border-gray-200'}`}
                    />
                  </div>
                  {errors.ci && <span className="mt-1 block text-[10px] text-red-500">{errors.ci}</span>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-900">
                  <span className="h-2 w-2 rounded-full bg-[#0439D9]"></span>
                  Credenciales y Acceso
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Correo Institucional <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    maxLength={50}
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-gray-50/50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0439D9] ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  <span className="mt-1 block text-[10px] text-gray-400">Dominio permitido: @umss.edu.bo</span>
                  {errors.email && <span className="mt-1 block text-[10px] text-red-500">{errors.email}</span>}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700">
                    Rol Asignado en Plataforma <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-3">
                    {roles.map((role) => {
                      const icons: Record<string, React.ElementType> = { ADMIN: Shield, DOCENTE: BookOpen, CONTROL: Eye };
                      const roleConfig: Record<string, { badgeText: string }> = {
                        ADMIN: { badgeText: 'text-blue-600' },
                        DOCENTE: { badgeText: 'text-emerald-600' },
                        CONTROL: { badgeText: 'text-amber-600' }
                      };

                      const IconComponent = icons[role.value] ?? UsersIcon;
                      const isSelected = formData.rol === role.value;
                      const config = roleConfig[role.value] || { badgeText: 'text-gray-600' };

                      return (
                        <button
                          type="button"
                          key={role.value}
                          onClick={() => setFormData({ ...formData, rol: role.value })}
                          className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-600'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <IconComponent size={20} className={`mb-1.5 ${isSelected ? 'text-blue-700' : 'text-gray-400'}`} />
                          <span className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-[#011140]'}`}>
                            {role.titulo}
                          </span>
                          <span className={`text-[9px] font-bold tracking-wider mt-1 ${config.badgeText}`}>
                            {role.subtitulo}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sección Agregar Rol */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-400">
                    Agregar Rol
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nuevoRol}
                      onChange={(e) => setNuevoRol(e.target.value)}
                      placeholder="EJ: SUPERVISOR"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-xs uppercase placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0439D9]"
                    />
                    <button
                      type="button"
                      onClick={handleAddRol}
                      className="flex shrink-0 items-center gap-1 rounded-xl bg-[#93C5FD] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#60A5FA]"
                    >
                      <Plus size={14} /> Agregar
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-3">
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

            <div className="mt-6 flex items-center gap-3 rounded-xl bg-[#E9F1FF]/60 px-4 py-3 text-xs text-[#011140]">
              <Info size={18} className="shrink-0 text-[#0439D9]" />
              <span>Los cambios se aplicarán inmediatamente. Toda acción queda auditada bajo la norma de seguridad académica institucional.</span>
            </div>
          </form>

          {/* Footer fijo */}
          <div className="flex shrink-0 flex-col gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
              <span className="inline-block h-2 w-2 rounded-full bg-[#0439D9]"></span>
              Campos con (*) son mandatorios
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 sm:px-5 sm:py-2.5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#0439D9] px-4 py-3 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-[#032ab0] sm:px-6 sm:py-2.5"
              >
                <CheckCircle2 size={16} />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL DE EDICIÓN EXITOSA */}
      {modalState === 'success' && (
        <div className="w-full max-w-md select-none overflow-hidden rounded-3xl border border-gray-100 bg-[#F8FAFC] text-center shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="px-6 pb-4 pt-6">
            <h3 className="select-none text-xl font-bold text-[#011140]">Actualización exitosa</h3>
          </div>
          
          <div className="border-t border-gray-200 bg-white px-6 py-6">
            <p className="mb-6 select-none text-xs font-medium leading-relaxed text-gray-500">
              La información y los roles de acceso del usuario fueron actualizados correctamente.
            </p>
            <button
              type="button"
              onClick={handleFinishSuccess}
              className="mx-auto block w-48 rounded-xl bg-[#0439D9] py-3 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-[#032ab0]"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* 3. MODAL DE EDICIÓN FALLIDA */}
      {modalState === 'error' && (
        <div className="w-full max-w-md select-none overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-2xl animate-in fade-in zoom-in duration-200">
          <AlertTriangle className="mx-auto mb-3 select-none text-amber-500" size={48} />
          <h3 className="select-none text-lg font-bold text-[#011140]">Error al actualizar</h3>
          <p className="mt-2 mb-6 select-none px-4 text-xs text-gray-600">
            Ocurrió un problema al intentar guardar los cambios del usuario. La información no fue actualizada.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setModalState('form')}
              className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl bg-[#0439D9] py-3 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-colors hover:bg-[#032ab0]"
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