import {CircleAlert } from 'lucide-react';
import PersonalInfoSection from './PersonalInfoSection';
import CredentialsSection from './CredentialsSection';
import RegisterUserHeader from './RegisterUserHeader';
import RegisterUserFooter from './RegisterUserFooter';
import RegisterUserSuccess from './RegisterUserSuccess';
import { useRegisterUserForm } from './useRegisterUserForm';

interface RegisterUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RegisterUserModal({ isOpen, onClose, onSuccess }: RegisterUserModalProps) {
  const {
    step,
    form,
    errors,
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

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    resetAll();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-[#011140]/25 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:z-50 sm:items-center sm:bg-black/45 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-user-title"
    >
      <div
        className={`flex w-full flex-col overflow-hidden rounded-t-2xl border border-[#D8E3F5] bg-white shadow-2xl sm:h-auto sm:max-h-[min(90dvh,900px)] sm:rounded-2xl sm:border-gray-100 ${step === 1
            ? 'h-[70dvh] max-h-[680px] max-w-2xl'
            : 'h-[85dvh] max-h-[700px] max-w-2xl'
          }`}
      >
        <RegisterUserHeader step={step} onClose={handleClose} />

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            {step === 1 && (
              <PersonalInfoSection
                form={form}
                errors={errors}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            )}

            {step === 2 && (
              <>
                <CredentialsSection
                  form={form}
                  errors={errors}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              </>
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
            onClose={handleClose}
            onBack={goBack}
            onNext={goNext}
          />
        </form>
      </div>

      {success && (
        <RegisterUserSuccess email={registeredEmail} onClose={handleClose} />
      )}
    </div>
  );
}