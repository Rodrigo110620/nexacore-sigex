import { X, Info, Check, CircleAlert, Mail, Dot } from 'lucide-react';
import { useState } from 'react';
import api from '../../services/api';
import {
  INITIAL_FORM_STATE,
  type RegisterUserFormState,
  type FormErrors,
  type Rol,
} from '../../types/usuario.types';
import { validateForm, hasErrors, validateNombre, validateApellidos, validateDocumento, validateEmail, validateRol } from '../../utils/validators';
import PersonalInfoSection from './PersonalInfoSection';
import CredentialsSection from './CredentialsSection';

interface RegisterUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RegisterUserModal({ isOpen, onClose, onSuccess }: RegisterUserModalProps) {
  const [form, setForm] = useState<RegisterUserFormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  if (!isOpen) return null;

  const handleChange = (field: keyof RegisterUserFormState, value: string | boolean | Rol) => {
    setForm({ ...form, [field]: value });
    if (errors[field as keyof FormErrors]) {
      setErrors({ ...errors, [field]: undefined });
    }
    if (generalError) setGeneralError('');
  };

  const handleBlur = (field: keyof RegisterUserFormState) => {
    const value = form[field];
    if (typeof value !== 'string' || !value.trim()) return;

    let error = '';
    if (field === 'nombre') error = validateNombre(value);
    if (field === 'apellidos') error = validateApellidos(value);
    if (field === 'documento') error = validateDocumento(value);
    if (field === 'email') error = validateEmail(value);
    if (field === 'rol') error = validateRol(value);

    if (error) setErrors({ ...errors, [field]: error });
  };

  const handleClose = () => {
    setForm(INITIAL_FORM_STATE);
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

    //BUG1: Limpiar espacios al inicio/final de los campos de texto
    const cleanForm = {
      ...form,
      nombre: form.nombre.trim(),
      apellidos: form.apellidos.trim(),
      documento: form.documento.trim(),
      email: form.email.trim(),
    };

    const formErrors = validateForm(cleanForm);
    setErrors(formErrors);

    if (hasErrors(formErrors)) {
      setGeneralError('Por favor, completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      await api.post('/usuarios', {
        nombre: cleanForm.nombre,
        apellidos: cleanForm.apellidos,
        ci: cleanForm.documento,
        email: cleanForm.email,
        rol: cleanForm.rol,
        activo: cleanForm.activo,
        notificarEmail: true,
      });
      setRegisteredEmail(cleanForm.email);
      setSuccess(true);
      onSuccess?.();
    } catch (err: unknown) {
      const error = err as {
        response?: {
          status?: number;
          data?: {
            mensaje?: string;
            campos?: Record<string, string>;
          };
        };
      };

      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 409) {
        setGeneralError(data?.mensaje ?? 'El email ya está registrado.');
      } else if (status === 400) {
        if (data?.campos) {
          const fieldErrors: FormErrors = {};
          if (data.campos.email) fieldErrors.email = data.campos.email;
          if (data.campos.ci || data.campos.documento) fieldErrors.documento = data.campos.ci || data.campos.documento;
          if (data.campos.nombre) fieldErrors.nombre = data.campos.nombre;
          if (data.campos.apellidos) fieldErrors.apellidos = data.campos.apellidos;
          if (data.campos.rol) fieldErrors.rol = data.campos.rol;
          setErrors(fieldErrors);
          setGeneralError('Verifica los campos marcados en rojo.');
        } else {
          setGeneralError(data?.mensaje ?? 'Verifica los datos ingresados.');
        }
      } else if (status === 403) {
        setGeneralError('No tienes permisos para registrar usuarios.');
      } else if (status === 401) {
        setGeneralError('Sesión expirada. Inicia sesión nuevamente.');
      } else {
        setGeneralError('No se pudo conectar con el servidor. Intenta más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-user-title"
    >
      <div className="flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl sm:h-auto sm:max-h-[min(90dvh,900px)] sm:rounded-2xl sm:border sm:border-gray-100">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6 sm:pb-4">
          <div className="min-w-0">
            <h2 id="register-user-title" className="text-lg font-bold text-[#011140] sm:text-xl">
              Registrar nuevo usuario
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500 sm:text-xs">
              Ingresa los datos para dar de alta una nueva cuenta y asignar roles de acceso institucional.            </p>
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
              <PersonalInfoSection
                form={form}
                errors={errors}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              <CredentialsSection
                form={form}
                errors={errors}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </div>

            <div className="mt-4">
              <div className="flex items-start gap-3 rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] p-3">
                <Info size={16} className="mt-0.5 flex-shrink-0 text-[#0439D9]" />
                <p className="text-[0.70rem] leading-relaxed text-[#011140] sm:text-[0.70rem]">
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

          <div className="shrink-0 border-t border-[#e3eaf1] bg-[#f8fbff] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
            <p className="flex items-center mb-3 text-[0.75rem] text-[#94A3B8] sm:mb-0 sm:hidden"> <span className="text-[#3B82F6]"><Dot/></span> Campos con (*) son mandatorios</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="hidden text-[0.75rem] text-gray-400 sm:flex sm:items-center"> <span className="text-[#3B82F6]"><Dot/></span> Campos con (*) son mandatorios</p>
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
                    'Registrando...'
                  ) : (
                    <>
                      <span className="sm:hidden"> + Registrar Usuario</span>
                      <span className="hidden sm:flex sm:items-center gap-2 "> <Check size={18} strokeWidth={4} aria-hidden="true" className="shrink-0" /> Guardar y Registrar usuario</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {success && (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md overflow-hidden rounded-t-2xl border border-[#BFDBFE] bg-[#f0f5ff] shadow-2xl sm:rounded-2xl">
            <div className="flex flex-col items-center px-5 pb-4 pt-8 sm:px-6">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 sm:h-16 sm:w-16">
                <Check className="text-green-600" size={34} />
              </div>
              <h3 className="mb-1 text-center text-base font-bold text-[#011140] sm:text-lg">
                Usuario registrado correctamente
              </h3>
              <p className="text-center text-xs text-gray-600">
                La cuenta fue creada. Las credenciales se enviaron por correo.
              </p>
            </div>

            <div className="px-5 pb-4 sm:px-6">
              <div className="rounded-lg border border-[#BFDBFE] bg-white p-4">
                <div className="mb-2 flex items-center justify-center gap-2 text-[#0439D9]">
                  <Mail size={18} aria-hidden="true" />
                  <p className="text-center text-[0.70rem] font-medium text-[#011140]">
                    Contraseña enviada a:
                  </p>
                </div>
                <p className="break-all text-center text-sm font-semibold text-[#011140]">
                  {registeredEmail}
                </p>
                <p className="mt-2 text-center text-[0.65rem] text-gray-500">
                  Revisa Mailtrap (o el buzón institucional) para entregar la clave al usuario.
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