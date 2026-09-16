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
      });
      setPasswordTemporal(data.passwordTemporal ?? '');
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { mensaje?: string }; status?: number } };
      if (error.response?.status === 409) {
        setGeneralError(error.response.data?.mensaje ?? 'El email ya está registrado.');
      } else if (error.response?.status === 400) {
        setGeneralError(error.response.data?.mensaje ?? 'Verifica los datos ingresados.');
      } else {
        setGeneralError('No se pudo conectar con el servidor. Intenta más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">


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

        <form onSubmit={handleSubmit}>
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


          {success && (
            <div className="mx-6 mb-4 border border-green-200 bg-green-50 p-3 rounded-md">
              <div className="flex items-center mb-2">
                <CheckCircle className="text-green-600 mr-2 flex-shrink-0" size={18} />
                <p className="text-green-700 text-xs font-semibold">Usuario registrado correctamente</p>
              </div>
              {passwordTemporal && (
                <div className="mt-2 bg-white border border-green-200 rounded-md p-2">
                  <p className="text-[0.65rem] text-gray-500 mb-1">Contraseña provisional (entrégala al usuario):</p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-bold text-[#011140] tracking-widest">{passwordTemporal}</code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(passwordTemporal)}
                      className="text-gray-400 hover:text-[#0439D9] transition-colors"
                      title="Copiar contraseña"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="mt-3 w-full text-xs text-green-700 font-semibold hover:underline"
              >
                Cerrar
              </button>
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

      </div>
    </div>
  );
}