import { useState } from 'react';
import api from '../../services/api';
import {
  INITIAL_FORM_STATE,
  type RegisterUserFormState,
  type FormErrors,
  type Rol,
} from '../../types/usuario.types';
import {
  validateForm,
  hasErrors,
  validateNombre,
  validateApellidos,
  validateDocumento,
  validateEmail,
  validateRol,
  sanitizeNombreInput,
} from '../../utils/validators';

export interface UseRegisterUserFormResult {
  step: 1 | 2;
  form: RegisterUserFormState;
  errors: FormErrors;
  generalError: string;
  loading: boolean;
  success: boolean;
  registeredEmail: string;
  handleChange: (field: keyof RegisterUserFormState, value: string | boolean | Rol) => void;
  handleBlur: (field: keyof RegisterUserFormState) => string;
  goNext: () => FormErrors | null;
  goBack: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<FormErrors | null>;
  resetAll: () => void;
}

export function useRegisterUserForm(onSuccess?: () => void): UseRegisterUserFormResult {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<RegisterUserFormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const resetAll = () => {
    setStep(1);
    setForm(INITIAL_FORM_STATE);
    setErrors({});
    setGeneralError('');
    setSuccess(false);
    setRegisteredEmail('');
  };

  const handleChange = (field: keyof RegisterUserFormState, value: string | boolean | Rol) => {
    setForm({ ...form, [field]: value });
    if (errors[field as keyof FormErrors]) {
      setErrors({ ...errors, [field]: undefined });
    }
    if (generalError) setGeneralError('');
  };

  const handleBlur = (field: keyof RegisterUserFormState): string => {
    const value = form[field];
    if (typeof value !== 'string') return '';

    if (!value.trim()) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      return '';
    }

    let error = '';
    if (field === 'nombre') error = validateNombre(value);
    if (field === 'apellidos') error = validateApellidos(value);
    if (field === 'documento') error = validateDocumento(value);
    if (field === 'email') error = validateEmail(value);
    if (field === 'rol') error = validateRol(value);

    setErrors((prev) => ({ ...prev, [field]: undefined }));

    return error;
  };

  const validateStep1 = (): FormErrors => {
    const next: FormErrors = {};
    const nombreError = validateNombre(form.nombre);
    const apellidosError = validateApellidos(form.apellidos);
    const documentoError = validateDocumento(form.documento);
    if (nombreError) next.nombre = nombreError;
    if (apellidosError) next.apellidos = apellidosError;
    if (documentoError) next.documento = documentoError;
    return next;
  };

  const validateStep2 = (): FormErrors => {
    const next: FormErrors = {};
    const emailError = validateEmail(form.email);
    const rolError = validateRol(form.rol);
    if (emailError) next.email = emailError;
    if (rolError) next.rol = rolError;
    return next;
  };

  const goNext = (): FormErrors | null => {
    const stepErrors = validateStep1();
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return stepErrors;
    }
    setErrors({});
    setGeneralError('');
    setStep(2);
    return null;
  };

  const goBack = () => {
    setGeneralError('');
    setErrors({});
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<FormErrors | null> => {
    e.preventDefault();

    if (step === 1) {
      return goNext();
    }

    const stepErrors = validateStep2();
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return stepErrors;
    }

    setGeneralError('');
    setSuccess(false);

    const cleanForm = {
      ...form,
      nombre: sanitizeNombreInput(form.nombre, { trimEnds: true }),
      apellidos: sanitizeNombreInput(form.apellidos, { trimEnds: true }),
      documento: form.documento.trim(),
      email: form.email.trim().toLowerCase(),
    };

    const formErrors = validateForm(cleanForm);
    if (hasErrors(formErrors)) {
      setErrors(formErrors);
      return formErrors;
    }

    setLoading(true);
    try {
      await api.post(
        '/usuarios',
        {
          nombre: cleanForm.nombre,
          apellidos: cleanForm.apellidos,
          ci: cleanForm.documento,
          email: cleanForm.email,
          rol: cleanForm.rol,
          activo: cleanForm.activo,
          notificarEmail: true,
        },
        { _skipAutoLogout: true } as object,
      );
      setRegisteredEmail(cleanForm.email);
      setSuccess(true);
      onSuccess?.();
      return null;
    } catch (err: unknown) {
      const error = err as {
        response?: {
          status?: number;
          data?: { mensaje?: string; campos?: Record<string, string> };
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
          if (data.campos.ci || data.campos.documento)
            fieldErrors.documento = data.campos.ci || data.campos.documento;
          if (data.campos.nombre) fieldErrors.nombre = data.campos.nombre;
          if (data.campos.apellidos) fieldErrors.apellidos = data.campos.apellidos;
          if (data.campos.rol) fieldErrors.rol = data.campos.rol;
          setErrors(fieldErrors);
          return fieldErrors;
        } else {
          setGeneralError(data?.mensaje ?? 'Verifica los datos ingresados.');
        }
      } else if (status === 503) {
        // El correo con la clave temporal no salió: el backend no registró al usuario.
        setGeneralError(data?.mensaje ?? 'No se pudo enviar el correo. El usuario no fue registrado.');
      } else if (status === 403) {
        setGeneralError('No tienes permisos para registrar usuarios.');
      } else if (status === 401) {
        setGeneralError('Sesión expirada. Inicia sesión nuevamente.');
      } else {
        setGeneralError('No se pudo conectar con el servidor. Intenta más tarde.');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
}