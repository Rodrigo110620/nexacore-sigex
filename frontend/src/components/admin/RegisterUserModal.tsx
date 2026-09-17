import { X, Info, CheckCircle, CircleAlert, Copy } from 'lucide-react';
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
}

export default function RegisterUserModal({ isOpen, onClose }: RegisterUserModalProps) {
  const [form, setForm] = useState<RegisterUserFormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordTemporal, setPasswordTemporal] = useState('');

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
    setPasswordTemporal('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setSuccess(false);

    const formErrors = validateForm(form);
    setErrors(formErrors);

    if (hasErrors(formErrors)) {
      setGeneralError('Por favor, completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      // Mapeo: form.documento → ci (nombre del campo en el backend)
      const { data } = await api.post('/usuarios', {
        nombre: form.nombre,
        apellidos: form.apellidos,
        ci: form.documento,
        email: form.email,
        rol: form.rol,
        activo: form.activo,
        notificarEmail: form.notificarEmail,
      });
      setPasswordTemporal(data.passwordTemporal ?? '');
      setSuccess(true);
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
    <>
      <div className="fixed inset-0 lg:left-64 flex items-center justify-center z-50 p-4">

        <div className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100">

          <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-[#011140] font-bold text-xl">Registrar Nuevo Usuario</h2>
              <p className="text-gray-500 text-xs mt-1">
                Ingresa los datos para dar de alta una nueva cuenta y asignar roles de acceso institucional.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="max-h-[calc(90vh-100px)] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
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

            <div className="px-6 pb-4">
              <div className="flex items-start gap-3 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg p-2">
                <Info size={16} className="text-[#0439D9] mt-0.5 flex-shrink-0" />
                <p className="text-[#011140] text-[0.70rem] leading-relaxed">
                  El usuario recibirá un token de seguridad de un solo uso. Toda acción quedará auditada
                  bajo la norma de seguridad académica institucional.
                </p>
              </div>
            </div>

            {generalError && (
              <div className="mx-6 mb-4 flex items-center border border-[#FECACA] bg-[#FEF2F2] p-3 rounded-md">
                <CircleAlert className="text-[#B91C1C] mr-2 flex-shrink-0" size={18} />
                <p className="text-[#B91C1C] text-xs">{generalError}</p>
              </div>
            )}

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-gray-400 text-[0.65rem]">
                Campos con (*) son mandatorios
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 text-sm text-[#011140] font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0439D9] text-white font-bold text-sm rounded-lg hover:bg-[#0027a2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    'GUARDANDO...'
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Guardar y Registrar Usuario
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* ==================== SHADOW PLOMO SOLO SOBRE ESTE MODAL ==================== */}
          {success && (
            <div className="absolute inset-0 bg-gray-400/5 backdrop-blur-[1px] rounded-2xl z-10"></div>
          )}

        </div>

        {/* ==================== MODAL SECUNDARIO (ÉXITO) ENCIMA ==================== */}
        {success && (
          <div className="absolute inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-[#f0f5ff] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[#BFDBFE]">

              {/* Header con ícono de éxito */}
              <div className="flex flex-col items-center pt-8 pb-4 px-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="text-green-600" size={36} />
                </div>

                <h3 className="text-[#011140] font-bold text-lg mb-1">
                  Usuario registrado correctamente
                </h3>
                <p className="text-gray-600 text-xs text-center">
                  La cuenta fue creada exitosamente.
                </p>
              </div>

              {/* Contraseña provisional */}
              {passwordTemporal && (
                <div className="px-6 pb-4">
                  <div className="bg-white border border-[#BFDBFE] rounded-lg p-4">
                    <p className="text-[0.70rem] text-[#011140] mb-2 text-center font-medium">
                      Contraseña provisional (entrégala al usuario):
                    </p>
                    <div className="flex items-center justify-between gap-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-md p-3">
                      <code className="text-base font-bold text-[#011140] tracking-widest flex-1 text-center">
                        {passwordTemporal}
                      </code>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(passwordTemporal)}
                        className="text-gray-500 hover:text-[#0439D9] transition-colors p-1"
                        title="Copiar contraseña"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Botón Cerrar */}
              <div className="px-6 pb-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full px-6 py-3 bg-[#0439D9] text-white font-bold text-sm rounded-lg hover:bg-[#0027a2] transition-colors"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}