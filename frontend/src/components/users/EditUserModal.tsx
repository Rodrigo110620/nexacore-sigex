import { X, Info, Check, CircleAlert, Mail, Dot, ShieldCheck, BookOpen, Eye, Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import api from '../../services/api';
import { useRoles } from '../../hooks/useRoles';
import { FIELD_LIMITS, sanitizeNombreInput } from '../../utils/validators';
import { ROLES_OPTIONS, type Rol } from '../../types/usuario.types';

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

const ROLES_PRINCIPALES = new Set(['ADMIN', 'DOCENTE', 'CONTROL']);
const ICONS: Record<string, typeof ShieldCheck> = {
  ADMIN: ShieldCheck,
  DOCENTE: BookOpen,
  CONTROL: Eye,
};

function buildFormFromUser(user?: User | null) {
  return {
    nombre: user?.nombre || '',
    apellidos: user?.apellidos || '',
    documento: user?.ci || '',
    email: user?.email || '',
    rol: (user?.rol as Rol) || 'DOCENTE',
    activo: user?.estado === 'activo',
  };
}

export default function EditUserModal({ isOpen, onClose, user, onSaveSuccess }: EditUserModalProps) {
  const [form, setForm] = useState(() => buildFormFromUser(user));
  const [errors, setErrors] = useState<{ nombre?: string; apellidos?: string; documento?: string; email?: string; rol?: string }>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Lógica de roles extra / agregar rol
  const { roles, cargando, crearRol } = useRoles();
  const [nuevoRol, setNuevoRol] = useState('');
  const [guardandoRol, setGuardandoRol] = useState(false);
  const [errorRol, setErrorRol] = useState('');
  const rolesExtra = roles.filter(r => !ROLES_PRINCIPALES.has(r.value));

  if (!isOpen) return null;

  const handleChange = (field: string, value: string | boolean | Rol) => {
    setForm({ ...form, [field]: value });
    if (errors[field as keyof typeof errors]) {
      setErrors({ ...errors, [field]: undefined });
    }
    if (generalError) setGeneralError('');
  };

  const handleAgregarRol = async () => {
    const nombre = nuevoRol.trim().toUpperCase();
    if (!nombre) return;
    if (!/^[A-Z_]+$/.test(nombre)) {
      setErrorRol('Solo letras mayúsculas y guiones bajos');
      return;
    }
    setGuardandoRol(true);
    setErrorRol('');
    try {
      await crearRol(nombre);
      setNuevoRol('');
      handleChange('rol', nombre as Rol);
    } catch {
      setErrorRol('Ese rol ya existe o hubo un error');
    } finally {
      setGuardandoRol(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    setGeneralError('');
    setSuccess(false);
    setRegisteredEmail('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setSuccess(false);

    const cleanForm = {
      ...form,
      nombre: form.nombre.trim(),
      apellidos: form.apellidos.trim(),
      documento: form.documento.trim(),
      email: form.email.trim(),
    };

    const newErrors: { nombre?: string; apellidos?: string; documento?: string; email?: string } = {};
    if (!cleanForm.nombre) newErrors.nombre = 'El nombre es obligatorio';
    if (!cleanForm.apellidos) newErrors.apellidos = 'Los apellidos son obligatorios';
    if (!cleanForm.documento) {
      newErrors.documento = 'El documento es obligatorio';
    } else if (cleanForm.documento.length < 5 || cleanForm.documento.length > 8) {
      newErrors.documento = 'Debe tener entre 5 y 8 dígitos';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanForm.email)) newErrors.email = 'El formato del correo no es válido';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setGeneralError('Por favor, completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/usuarios/${user?.id}`, {
        nombre: cleanForm.nombre,
        apellidos: cleanForm.apellidos,
        ci: cleanForm.documento,
        email: cleanForm.email,
        rol: cleanForm.rol,
        activo: cleanForm.activo,
        notificarEmail: false,
      });
      setRegisteredEmail(cleanForm.email);
      setSuccess(true);
      onSaveSuccess?.(cleanForm);
    } catch {
      setGeneralError('Ocurrió un problema al intentar guardar los cambios. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-title"
    >
      <div className="flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl sm:h-auto sm:max-h-[min(90dvh,900px)] sm:rounded-2xl sm:border sm:border-gray-100">
        
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6 sm:pb-4">
          <div className="min-w-0">
            <h2 id="edit-user-title" className="text-lg font-bold text-[#011140] sm:text-xl">
              Editar datos del usuario
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500 sm:text-xs">
              Modifica los datos del usuario para mantener actualizada su información y sus roles de acceso.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              
              {/* Columna Izquierda: Información Personal */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0439D9]"></span>
                  <h3 className="text-[#011140] font-bold text-xs tracking-wide">
                    INFORMACIÓN PERSONAL
                  </h3>
                </div>

                {/* Nombres */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[#011140] font-medium text-[0.70rem]">
                      Nombres <span className="text-red-500">*</span>
                    </label>
                    <span className={`text-[0.65rem] font-medium ${form.nombre.length >= FIELD_LIMITS.nombre.max ? 'text-red-500' : 'text-gray-400'}`}>
                      {form.nombre.length}/{FIELD_LIMITS.nombre.max}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => handleChange('nombre', sanitizeNombreInput(e.target.value))}
                    placeholder="Ej. Roberto Carlos"
                    maxLength={FIELD_LIMITS.nombre.max}
                    className={`text-xs border rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 transition-colors ${
                      errors.nombre ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]' : 'border-gray-300 focus:ring-[#E1ECFF]'
                    }`}
                  />
                  <p className="text-gray-600 text-[0.60rem]">Solo letras · Máximo {FIELD_LIMITS.nombre.max} caracteres</p>
                  {errors.nombre && <p className="text-[#B91C1C] text-[0.65rem]">⚠️ {errors.nombre}</p>}
                </div>

                {/* Apellidos */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[#011140] font-medium text-[0.70rem]">
                      Apellidos Completos <span className="text-red-500">*</span>
                    </label>
                    <span className={`text-[0.65rem] font-medium ${form.apellidos.length >= FIELD_LIMITS.apellidos.max ? 'text-red-500' : 'text-gray-400'}`}>
                      {form.apellidos.length}/{FIELD_LIMITS.apellidos.max}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={form.apellidos}
                    onChange={(e) => handleChange('apellidos', sanitizeNombreInput(e.target.value))}
                    placeholder="Ej. Méndez Quispe"
                    maxLength={FIELD_LIMITS.apellidos.max}
                    className={`text-xs border rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 transition-colors ${
                      errors.apellidos ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]' : 'border-gray-300 focus:ring-[#E1ECFF]'
                    }`}
                  />
                  <p className="text-gray-600 text-[0.60rem]">Solo letras · Máximo {FIELD_LIMITS.apellidos.max} caracteres</p>
                  {errors.apellidos && <p className="text-[#B91C1C] text-[0.65rem]">⚠️ {errors.apellidos}</p>}
                </div>

                {/* Documento de Identidad */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[#011140] font-medium text-[0.70rem]">
                      Documento de Identidad <span className="text-red-500">*</span>
                    </label>
                    <span className={`text-[0.65rem] font-medium ${form.documento.length >= FIELD_LIMITS.documento.max ? 'text-red-500' : 'text-gray-400'}`}>
                      {form.documento.length}/{FIELD_LIMITS.documento.max}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center px-3 py-2.5 border border-gray-300 rounded-md bg-gray-50 text-xs text-[#011140] font-medium min-w-[60px]">
                      CI
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.documento}
                      onChange={(e) => {
                        const onlyNumbers = e.target.value.replace(/\D/g, '');
                        handleChange('documento', onlyNumbers);
                      }}
                      placeholder="8 dígitos"
                      maxLength={FIELD_LIMITS.documento.max}
                      className={`flex-1 text-xs border rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 transition-colors ${
                        errors.documento ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]' : 'border-gray-300 focus:ring-[#E1ECFF]'
                      }`}
                    />
                  </div>
                  <p className="text-gray-600 text-[0.60rem]">Solo números · Máximo {FIELD_LIMITS.documento.max} caracteres</p>
                  {errors.documento && <p className="text-[#B91C1C] text-[0.65rem]">⚠️ {errors.documento}</p>}
                </div>
              </div>

              {/* Columna Derecha: Credenciales y Acceso */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0439D9]"></span>
                  <h3 className="text-[#011140] font-bold text-xs tracking-wide">
                    CREDENCIALES Y ACCESO
                  </h3>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label className="text-[#011140] font-medium text-[0.70rem]">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="usuario@"
                    maxLength={FIELD_LIMITS.email.max}
                    className={`text-xs border rounded-md py-2.5 px-3 focus:outline-none focus:ring-1 transition-colors ${
                      errors.email ? 'border-[#FECACA] bg-[#FEF2F2] focus:ring-[#FECACA]' : 'border-gray-300 focus:ring-[#E1ECFF]'
                    }`}
                  />
                  <p className="text-gray-600 text-[0.60rem]">Dominio permitido: cualquiera · Máximo {FIELD_LIMITS.email.max} caracteres</p>
                  {errors.email && <p className="text-[#B91C1C] text-[0.65rem]">⚠️ {errors.email}</p>}
                </div>

                {/* Selector de Rol */}
                <div className="flex flex-col gap-2">
                  <label className="text-[#011140] font-medium text-[0.70rem]">
                    Rol Asignado en Plataforma <span className="text-red-500">*</span>
                  </label>
                  {cargando ? (
                    <div className="h-20 rounded-lg border border-gray-200 bg-gray-50 animate-pulse" />
                  ) : (
                    <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-3 sm:gap-3">
                      {ROLES_OPTIONS.map((rol) => {
                        const Icon = ICONS[rol.value];
                        const isSelected = form.rol === rol.value;
                        return (
                          <button
                            key={rol.value}
                            type="button"
                            onClick={() => handleChange('rol', rol.value)}
                            className={`flex min-h-11 items-center gap-3 rounded-lg border p-3 transition-all min-[380px]:flex-col min-[380px]:items-center min-[380px]:justify-center min-[380px]:gap-1 min-[380px]:p-2.5 sm:p-3 ${
                              isSelected ? 'border-[#0439D9] bg-[#E1ECFF] shadow-sm' : 'border-gray-200 bg-white hover:border-[#0439D9]/50'
                            }`}
                          >
                            <Icon size={20} className={`shrink-0 ${isSelected ? 'text-[#0439D9]' : 'text-gray-400'}`} />
                            <span className="min-w-0 flex-1 text-left min-[380px]:flex-none min-[380px]:text-center">
                              <span className={`block text-[0.70rem] font-bold ${isSelected ? 'text-[#0439D9]' : 'text-[#011140]'}`}>
                                {rol.titulo}
                              </span>
                              <span className={`block text-[0.55rem] font-semibold tracking-wider ${
                                rol.value === 'ADMIN' ? 'text-[#0439D9]' : rol.value === 'DOCENTE' ? 'text-green-600' : 'text-orange-500'
                              }`}>
                                {rol.subtitulo}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Roles adicionales */}
                  {rolesExtra.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1">
                      <p className="text-gray-400 text-[0.60rem] font-medium tracking-wide">ROLES ADICIONALES</p>
                      <div className="flex flex-wrap gap-2">
                        {rolesExtra.map((rol) => {
                          const isSelected = form.rol === rol.value;
                          return (
                            <button
                              key={rol.value}
                              type="button"
                              onClick={() => handleChange('rol', rol.value as Rol)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[0.70rem] font-semibold transition-all ${
                                isSelected ? 'border-[#0439D9] bg-[#E1ECFF] text-[#0439D9]' : 'border-gray-200 bg-white text-gray-500 hover:border-[#0439D9]/50'
                              }`}
                            >
                              <ShieldCheck size={12} />
                              {rol.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Agregar rol nuevo */}
                  <div className="flex flex-col gap-1 mt-1">
                    <p className="text-gray-400 text-[0.60rem] font-medium tracking-wide">AGREGAR ROL</p>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={nuevoRol}
                        onChange={e => { setNuevoRol(e.target.value.toUpperCase()); setErrorRol(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleAgregarRol()}
                        placeholder="Ej: SUPERVISOR"
                        maxLength={30}
                        className="flex-1 text-xs border border-gray-200 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-[#E1ECFF] uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleAgregarRol}
                        disabled={guardandoRol || !nuevoRol.trim()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#0439D9] text-white text-xs font-semibold rounded-md hover:bg-[#0027a2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {guardandoRol ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        Agregar
                      </button>
                    </div>
                    {errorRol && <p className="text-[#B91C1C] text-[0.65rem]">⚠️ {errorRol}</p>}
                  </div>
                </div>

                {/* Toggles y tarjetas informativas */}
                <div className="flex flex-col gap-3 mt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#011140] text-[0.70rem] font-semibold">Estado de cuenta Activo</p>
                      <p className="text-gray-400 text-[0.60rem]">Permite acceso inmediato al sistema</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange('activo', !form.activo)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${form.activo ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.activo ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  {/* Credenciales por correo Card */}
                  {/*<div className="rounded-lg border border-[#DBEAFE] bg-[#F8FBFF] px-3 py-2.5">
                    <p className="text-[0.70rem] font-semibold text-[#011140]">Credenciales por correo</p>
                    <p className="text-[0.60rem] text-gray-500 leading-relaxed">
                      La contraseña provisional se envía automáticamente al correo institucional del usuario. No se muestra en pantalla.
                    </p>
                  </div>*/}
                </div>

              </div>
            </div>

            {/* Banner inferior de auditoría */}
            <div className="mt-4">
              <div className="flex items-start gap-3 rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] p-3">
                <Info size={16} className="mt-0.5 flex-shrink-0 text-[#0439D9]" />
                <p className="text-[0.70rem] leading-relaxed text-[#011140]">
                  El usuario recibirá un token de seguridad de un solo uso. Toda acción quedará auditada bajo la norma de seguridad académica institucional.
                </p>
              </div>
            </div>

            {generalError && (
              <div className="mt-4 flex items-start rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3">
                <CircleAlert className="mr-2 mt-0.5 flex-shrink-0 text-[#B91C1C]" size={18} />
                <p className="text-xs text-[#B91C1C]">{generalError}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[#e3eaf1] bg-[#f8fbff] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
            <p className="flex items-center mb-3 text-[0.75rem] text-[#94A3B8] sm:mb-0 sm:hidden">
              <span className="text-[#3B82F6]"><Dot/></span> Campos con (*) son mandatorios
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="hidden text-[0.75rem] text-gray-400 sm:flex sm:items-center">
                <span className="text-[#3B82F6]"><Dot/></span> Campos con (*) son mandatorios
              </p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-[#011140] transition-colors hover:bg-gray-200 sm:px-5 sm:py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0439D9] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0027a2] disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:py-2.5"
                >
                  {loading ? (
                    'Guardando...'
                  ) : (
                    <>
                      <span className="sm:hidden">+ Guardar</span>
                      <span className="hidden sm:flex sm:items-center gap-2">
                        <Check size={18} strokeWidth={4} aria-hidden="true" className="shrink-0" /> Guardar cambios
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de éxito */}
      {success && (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md overflow-hidden rounded-t-2xl border border-[#BFDBFE] bg-[#f0f5ff] shadow-2xl sm:rounded-2xl">
            <div className="flex flex-col items-center px-5 pb-4 pt-8 sm:px-6">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 sm:h-16 sm:w-16">
                <Check className="text-green-600" size={34} />
              </div>
              <h3 className="mb-1 text-center text-base font-bold text-[#011140] sm:text-lg">
                Usuario actualizado correctamente
              </h3>
              <p className="text-center text-xs text-gray-600">
                La información de la cuenta fue actualizada con éxito.
              </p>
            </div>

            <div className="px-5 pb-4 sm:px-6">
              <div className="rounded-lg border border-[#BFDBFE] bg-white p-4">
                <div className="mb-2 flex items-center justify-center gap-2 text-[#0439D9]">
                  <Mail size={18} aria-hidden="true" />
                  <p className="text-center text-[0.70rem] font-medium text-[#011140]">
                    Correo institucional actualizado:
                  </p>
                </div>
                <p className="break-all text-center text-sm font-semibold text-[#011140]">
                  {registeredEmail}
                </p>
              </div>
            </div>

            <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-lg bg-[#0439D9] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0027a2]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}