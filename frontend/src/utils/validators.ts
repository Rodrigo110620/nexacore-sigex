import type { FormErrors, RegisterUserFormState } from '../types/usuario.types';

export const validateNombre = (value: string): string => {
  if (!value.trim()) return 'El nombre es obligatorio';
  if (value.trim().length < 2) return 'Mínimo 2 caracteres';
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return 'Solo letras y espacios';
  return '';
};

export const validateApellidos = (value: string): string => {
  if (!value.trim()) return 'Los apellidos son obligatorios';
  if (value.trim().length < 2) return 'Mínimo 2 caracteres';
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) return 'Solo letras y espacios';
  return '';
};

export const validateDocumento = (value: string): string => {
  if (!value.trim()) return 'El documento es obligatorio';
  if (!/^\d+$/.test(value)) return 'Solo números';
  if (value.length < 7 || value.length > 8) return 'Debe tener 7 u 8 dígitos';
  return '';
};

export const validateEmail = (value: string): string => {
  if (!value.trim()) return 'El correo es obligatorio';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) return 'Formato de correo inválido';
  return '';
};

export const validateRol = (value: string): string => {
  if (!value.trim()) return 'Debes seleccionar un rol';
  // No se valida contra lista fija: los roles válidos vienen del backend (GET /usuarios/roles).
  return '';
};

export const validateForm = (form: RegisterUserFormState): FormErrors => {
  const errors: FormErrors = {};

  const nombreError = validateNombre(form.nombre);
  if (nombreError) errors.nombre = nombreError;

  const apellidosError = validateApellidos(form.apellidos);
  if (apellidosError) errors.apellidos = apellidosError;

  const documentoError = validateDocumento(form.documento);
  if (documentoError) errors.documento = documentoError;

  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;

  const rolError = validateRol(form.rol);
  if (rolError) errors.rol = rolError;

  return errors;
};



export const hasErrors = (errors: FormErrors): boolean => {
  return Object.keys(errors).length > 0;
};