import { CircleAlert, Info } from 'lucide-react';
import { useState } from 'react';
import PersonalInfoSection from './PersonalInfoSection';
import CredentialsSection from './CredentialsSection';
import RegisterUserHeader from './RegisterUserHeader';
import RegisterUserFooter from './RegisterUserFooter';
import RegisterUserSuccess from './RegisterUserSuccess';
import FieldErrorModal from '../ui/FieldErrorModal';
import { useRegisterUserForm } from './useRegisterUserForm';

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
};

export default function RegisterUserModal({ isOpen, onClose, onSuccess }: RegisterUserModalProps) {
  const {
    step,
    form,
    generalError,
    loading,
    success,
    registeredEmail,
    handleChange,
    handleBlur,
    goNext,
    goBack,
    handleSubmit,
    resetAll,
  } = useRegisterUserForm(onSuccess);

  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorField, setErrorField] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    resetAll();
    setErrorModalOpen(false);
    onClose();
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
        input.select();
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

  /** Paso 1: Valida y avanza al paso 2 */
  const handleNext = () => {
    const stepErrors = goNext();
    if (stepErrors) {
      showFirstError(stepErrors);
    }
  };

  /** Paso 2: Envía al backend y muestra errores si hay */
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stepErrors = await handleSubmit(e);
    if (stepErrors) {
      showFirstError(stepErrors);
    }
  };

  /** Contenido del paso actual */
  const renderContent = () => (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
      {step === 1 && (
        <PersonalInfoSection
          form={form}
          onChange={handleChange}
          onBlur={handleBlur}
          onFieldError={showFieldError}
        />
      )}

      {step === 2 && (
        <>
          <CredentialsSection
            form={form}
            onChange={handleChange}
            onBlur={handleBlur}
            onFieldError={showFieldError}
          />
          <div className="mt-4">
            <div className="flex items-start gap-3 rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] p-3">
              <Info size={16} className="mt-0.5 flex-shrink-0 text-[#0439D9]" />
              <p className="text-[0.70rem] leading-relaxed text-[#011140]">
                El usuario recibirá un token de seguridad de un solo uso. Toda acción quedará auditada bajo la norma de seguridad académica institucional.
              </p>
            </div>
          </div>
        </>
      )}

      {generalError && (
        <div className="mt-4 flex items-start rounded-md border border-[#FECACA] bg-[#FEF2F2] p-3">
          <CircleAlert className="mr-2 mt-0.5 flex-shrink-0 text-[#B91C1C]" size={18} />
          <p className="text-xs text-[#B91C1C]">{generalError}</p>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-[#011140]/25 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:z-50 sm:items-center sm:bg-black/45 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-user-title"
    >
      <div
        className={`flex w-full flex-col overflow-hidden rounded-t-2xl border border-[#D8E3F5] bg-white shadow-2xl sm:h-auto sm:max-h-[min(90dvh,900px)] sm:rounded-2xl sm:border-gray-100 ${
          step === 1
            ? 'h-[80dvh] max-h-[680px] max-w-xl'
            : 'h-[85dvh] max-h-[800px] max-w-2xl'
        }`}
      >
        <RegisterUserHeader step={step} onClose={handleClose} />

        {/* PASO 1: SIN FORM (solo validación) */}
        {step === 1 && (
          <>
            {renderContent()}
            <RegisterUserFooter
              step={step}
              loading={loading}
              onClose={handleClose}
              onBack={goBack}
              onNext={handleNext}
            />
          </>
        )}

        {/* PASO 2: CON FORM (envía al backend) */}
        {step === 2 && (
          <form onSubmit={handleFinalSubmit} className="flex min-h-0 flex-1 flex-col">
            {renderContent()}
            <RegisterUserFooter
              step={step}
              loading={loading}
              onClose={handleClose}
              onBack={goBack}
              onNext={handleNext}
            />
          </form>
        )}
      </div>

      {success && (
        <RegisterUserSuccess email={registeredEmail} onClose={handleClose} />
      )}

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