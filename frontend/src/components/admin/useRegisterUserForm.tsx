import { useState } from 'react';
import api from '../../services/api';
import type { MateriaDto } from '../../services/materiaService';
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
import { DATOS_DOCENTE_INICIALES, type DatosDocente } from '../../utils/datosDocente';

export type PasoRegistro = 1 | 2 | 3 | 4;
export const TOTAL_PASOS = 4;

export interface UseRegisterUserFormResult {
  step: PasoRegistro;
  form: RegisterUserFormState;
  /** IMP-12: materias del DOCENTE (paso 3). */
  materias: MateriaDto[];
  setMaterias: (materias: MateriaDto[]) => void;
  /** Título, especialidad y categoría del DOCENTE (paso 3). */
  datosDocente: DatosDocente;
  setDatosDocente: (datos: DatosDocente) => void;
  /** El ADMIN confirma que el nuevo usuario debe tener acceso total (paso 3). */
  confirmaAdmin: boolean;
  setConfirmaAdmin: (valor: boolean) => void;
  errors: FormErrors;
  generalError: string;
  loading: boolean;
  success: boolean;
  registeredEmail: string;
  handleChange: (field: keyof RegisterUserFormState, value: string | boolean | Rol) => void;
  handleBlur: (field: keyof RegisterUserFormState) => string;
  goNext: () => FormErrors | null;
  goBack: () => void;
  /** Vuelve a un paso anterior (desde el resumen, para corregir un dato). */
  irAPaso: (paso: PasoRegistro) => void;
  handleSubmit: (e: React.FormEvent) => Promise<FormErrors | null>;
  resetAll: () => void;
}

export function useRegisterUserForm(onSuccess?: () => void): UseRegisterUserFormResult {
  const [step, setStep] = useState<PasoRegistro>(1);
  const [form, setForm] = useState<RegisterUserFormState>(INITIAL_FORM_STATE);
  const [materias, setMateriasEstado] = useState<MateriaDto[]>([]);
  const [datosDocente, setDatosDocente] = useState<DatosDocente>(DATOS_DOCENTE_INICIALES);
  const [confirmaAdmin, setConfirmaAdminEstado] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const resetAll = () => {
    setStep(1);
    setForm(INITIAL_FORM_STATE);
    setMateriasEstado([]);
    setDatosDocente(DATOS_DOCENTE_INICIALES);
    setConfirmaAdminEstado(false);
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

  const setMaterias = (lista: MateriaDto[]) => {
    setMateriasEstado(lista);
    if (errors.materias) setErrors({ ...errors, materias: undefined });
    if (generalError) setGeneralError('');
  };

  const setConfirmaAdmin = (valor: boolean) => {
    setConfirmaAdminEstado(valor);
    if (errors.confirmaAdmin) setErrors({ ...errors, confirmaAdmin: undefined });
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

  /** Paso 1: el rol. */
  const validarRol = (): FormErrors => {
    const rolError = validateRol(form.rol);
    return rolError ? { rol: rolError } : {};
  };

  /** Paso 2: datos personales y correo. */
  const validarDatos = (): FormErrors => {
    const next: FormErrors = {};
    const nombreError = validateNombre(form.nombre);
    const apellidosError = validateApellidos(form.apellidos);
    const documentoError = validateDocumento(form.documento);
    const emailError = validateEmail(form.email);
    if (nombreError) next.nombre = nombreError;
    if (apellidosError) next.apellidos = apellidosError;
    if (documentoError) next.documento = documentoError;
    if (emailError) next.email = emailError;
    return next;
  };

  /** Paso 3: lo propio del rol. */
  const validarDelRol = (): FormErrors => {
    if (form.rol === 'DOCENTE' && materias.length === 0) return { materias: 'Elige al menos una materia para el docente.' };
    if (form.rol === 'ADMIN' && !confirmaAdmin) return { confirmaAdmin: 'Confirma que esta persona debe tener acceso total al sistema.' };
    return {};
  };

  const VALIDAR: Record<1 | 2 | 3, () => FormErrors> = { 1: validarRol, 2: validarDatos, 3: validarDelRol };

  const goNext = (): FormErrors | null => {
    if (step === 4) return null;
    const stepErrors = VALIDAR[step]();
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return stepErrors;
    }
    setErrors({});
    setGeneralError('');
    setStep((step + 1) as PasoRegistro);
    return null;
  };

  const goBack = () => {
    setGeneralError('');
    setErrors({});
    if (step > 1) setStep((step - 1) as PasoRegistro);
  };

  const irAPaso = (paso: PasoRegistro) => {
    if (paso < step) {
      setErrors({});
      setGeneralError('');
      setStep(paso);
    }
  };

  /** Lleva al paso donde está el error que devolvió el servidor. */
  const irAlPasoDe = (campos: FormErrors) => {
    if (campos.materias) setStep(3);
    else if (campos.rol) setStep(1);
    else if (campos.nombre || campos.apellidos || campos.documento || campos.email) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<FormErrors | null> => {
    e.preventDefault();

    if (step !== 4) {
      return goNext();
    }

    for (const paso of [1, 2, 3] as const) {
      const pasoErrores = VALIDAR[paso]();
      if (Object.keys(pasoErrores).length > 0) {
        setErrors(pasoErrores);
        setStep(paso);
        return pasoErrores;
      }
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
      irAlPasoDe(formErrors);
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
          // IMP-12: el docente se registra con sus materias.
          ...(cleanForm.rol === 'DOCENTE' ? { idMaterias: materias.map((m) => m.id), docente: datosDocente } : {}),
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
          irAlPasoDe(fieldErrors);
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
  };
}