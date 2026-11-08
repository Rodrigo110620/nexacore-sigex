import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import PersonalInfoSection from './PersonalInfoSection';
import CredentialsSection from './CredentialsSection';
import RoleSelector from './RoleSelector';
import RegisterUserHeader from './RegisterUserHeader';
import RegisterUserFooter from './RegisterUserFooter';
import RegisterUserSuccess from './RegisterUserSuccess';
import { PasoDelRol, ResumenRegistro } from './RegistroPorRol';
import { nombrePasoDelRol, textoRegistrar } from '../../utils/registroUsuario';
import FieldErrorModal from '../ui/FieldErrorModal';
import { useRegisterUserForm } from './useRegisterUserForm';
import { ConfirmDiscardDialog } from '../examenes/ExamFormDialogs';
import { INITIAL_FORM_STATE } from '../../types/usuario.types';

interface RegisterUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  nombre: 'el Nombre',
  apellidos: 'los Apellidos',
  documento: 'el Documento',
  email: 'el Correo',
  rol: 'el Rol',
  materias: 'las Materias',
  confirmaAdmin: 'la Confirmación',
};

/**
 * Registrar usuario en 4 pasos, uno a la vez: 1 Rol · 2 Datos personales y correo · 3 lo propio del rol
 * (DOCENTE: sus materias, IMP-12; ADMIN: confirmar el acceso total) · 4 Confirmar.
 */
export default function RegisterUserModal({ isOpen, onClose, onSuccess }: RegisterUserModalProps) {
  const {
    step,
    form,
    materias,
    setMaterias,
    datosDocente,
    setDatosDocente,
    confirmaAdmin,
    setConfirmaAdmin,
    errors,
    generalError,
    loading,
    success,
    registeredEmail,
    handleChange,
    handleBlur,
    goNext,
    goBack,
    irAPaso,
    handleSubmit,
    resetAll,
  } = useRegisterUserForm(onSuccess);

  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorField, setErrorField] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [descartar, setDescartar] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    resetAll();
    setErrorModalOpen(false);
    setDescartar(false);
    onClose();
  };

  // Con datos ingresados, la X y Cancelar piden confirmar antes de descartar.
  const hayDatos = !success && (JSON.stringify(form) !== JSON.stringify(INITIAL_FORM_STATE) || materias.length > 0 || confirmaAdmin);
  const pedirCerrar = () => {
    if (loading) return;
    if (hayDatos) setDescartar(true);
    else handleClose();
  };

  const showFieldError = (field: string, message: string) => {
    setErrorField(field);
    setErrorMessage(message);
    setErrorModalOpen(true);
  };

  const handleContinue = () => {
    setErrorModalOpen(false);
    setTimeout(() => {
      const input = document.querySelector(`[name="${errorField}"]`) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select?.();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  /** Muestra el primer error de un objeto de errores */
  const showFirstError = (stepErrors: Record<string, string | undefined>) => {
    const firstField = Object.keys(stepErrors).find((key) => stepErrors[key]);
    if (!firstField) return;
    const firstMessage = stepErrors[firstField];
    if (typeof firstMessage === 'string') {
      showFieldError(firstField, firstMessage);
    }
  };

  const handleNext = () => {
    const stepErrors = goNext();
    if (stepErrors) showFirstError(stepErrors);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Solo se registra desde el paso 4, con el botón «Registrar»; Enter en los pasos anteriores avanza.
    if (step !== 4) {
      handleNext();
      return;
    }
    const stepErrors = await handleSubmit(e);
    if (stepErrors) showFirstError(stepErrors);
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-[#011140]/25 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:z-50 sm:items-center sm:bg-black/45 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-user-title"
    >
      <div className="flex h-[85dvh] max-h-[760px] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[#D8E3F5] bg-white shadow-2xl sm:h-auto sm:max-h-[min(90dvh,860px)] sm:rounded-2xl sm:border-gray-100">
        <ConfirmDiscardDialog open={descartar} onStay={() => setDescartar(false)} onLeave={handleClose} />
        <RegisterUserHeader step={step} pasoDelRol={nombrePasoDelRol(form.rol)} onClose={pedirCerrar} />

        <form noValidate onSubmit={handleFinalSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            {step === 1 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-[#627A9B]">Cada rol pide sus propios datos en el paso 3.</p>
                <RoleSelector value={form.rol} onChange={(rol) => handleChange('rol', rol)} error={errors.rol} />
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-5">
                <PersonalInfoSection form={form} onChange={handleChange} onBlur={handleBlur} onFieldError={showFieldError} />
                <CredentialsSection form={form} onChange={handleChange} onBlur={handleBlur} onFieldError={showFieldError} soloCorreo />
              </div>
            )}

            {step === 3 && (
              <PasoDelRol rol={form.rol} materias={materias} onMaterias={setMaterias}
                datosDocente={datosDocente} onDatosDocente={setDatosDocente}
                confirmaAdmin={confirmaAdmin} onConfirmaAdmin={setConfirmaAdmin} errores={errors} />
            )}

            {step === 4 && (
              <ResumenRegistro form={form} materias={materias} datosDocente={datosDocente} onActivo={(v) => handleChange('activo', v)} onEditar={irAPaso} />
            )}

            {generalError && (
              <div className="mt-4 flex items-start rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3">
                <CircleAlert className="mr-2 mt-0.5 flex-shrink-0 text-[#B91C1C]" size={18} />
                <p className="text-xs text-[#B91C1C]">{generalError}</p>
              </div>
            )}
          </div>

          <RegisterUserFooter
            step={step}
            loading={loading}
            onClose={pedirCerrar}
            onBack={goBack}
            onNext={handleNext}
            textoRegistrar={textoRegistrar(form.rol)}
          />
        </form>
      </div>

      {success && <RegisterUserSuccess email={registeredEmail} onClose={handleClose} />}

      <FieldErrorModal
        open={errorModalOpen}
        fieldLabel={FIELD_LABELS[errorField] ?? errorField}
        message={errorMessage}
        onContinue={handleContinue}
        onClose={() => setErrorModalOpen(false)}
      />
    </div>
  );
}
