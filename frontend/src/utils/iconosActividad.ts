import {
  ArrowLeftRight, BadgeCheck, BookCheck, BookOpen, Building2, CalendarClock, CalendarPlus, CalendarX, Camera, CameraOff,
  CircleCheck, CircleX, ClipboardCheck, DatabaseBackup, FilePen, FileUp, GraduationCap, ImageIcon, ImageOff, KeyRound,
  LifeBuoy, ListChecks, Lock, LockOpen, LogOut, MapPin, Paperclip, Pencil, QrCode, RefreshCw, Settings, Shield, ShieldAlert,
  ShieldCheck, TriangleAlert, Undo2, UserMinus, UserPlus, UserRound, UserX, type LucideIcon,
} from 'lucide-react'

/** Ícono y clases (fondo y color) de una actividad. */
export type IconoActividad = [LucideIcon, string]

const VERDE = 'bg-[#DCFCE7] text-[#16A34A]'
const ROJO = 'bg-[#FEE2E2] text-[#DC2626]'
const ROSA = 'bg-[#FFE4E6] text-[#E11D48]'
const AMBAR = 'bg-[#FEF3C7] text-[#B45309]'
const NARANJA = 'bg-[#FFEDD5] text-[#EA580C]'
const AZUL = 'bg-[#E0E9FF] text-[#0439D9]'
const CIELO = 'bg-[#E0F2FE] text-[#0284C7]'
const VIOLETA = 'bg-[#EDE9FE] text-[#7C3AED]'
const INDIGO = 'bg-[#E0E7FF] text-[#4F46E5]'
const TURQUESA = 'bg-[#CCFBF1] text-[#0F766E]'
const GRIS = 'bg-[#F1F5F9] text-[#45628D]'

/**
 * BUG-A03 (2.º test run): cada tipo de operación del historial con su propio ícono y color, para distinguirlas de
 * un vistazo en «Actividad reciente» (antes iban por módulo y, p. ej., todo lo de Control se veía igual).
 */
const POR_ACCION: Record<string, IconoActividad> = {
  INGRESO_AUTORIZADO: [CircleCheck, VERDE],
  INGRESO_DENEGADO: [CircleX, ROJO],
  SALIDA_REGISTRADA: [LogOut, GRIS],
  EXPULSION_REGISTRADA: [UserX, ROSA],
  EXPULSION_ANULADA: [Undo2, TURQUESA],
  EVIDENCIA_AGREGADA: [Paperclip, GRIS],
  EXCEPCION_REGISTRADA: [ShieldAlert, AMBAR],
  INTENTO_INGRESO_REGISTRADO: [TriangleAlert, NARANJA],
  AULA_INCORRECTA_REGISTRADA: [MapPin, NARANJA],
  ESTUDIANTE_TRASLADADO: [ArrowLeftRight, CIELO],
  QR_DUPLICADO_REPORTADO: [QrCode, VIOLETA],
  QR_REGENERADO: [RefreshCw, VIOLETA],
  FOTO_REPORTADA: [CameraOff, ROJO],
  FOTO_APROBADA: [BadgeCheck, VERDE],
  FOTO_RECHAZADA: [ImageOff, ROJO],
  FOTO_REPORTE_DESCARTADO: [ImageIcon, GRIS],
  ESTUDIANTE_FOTO_CAMBIADA: [Camera, CIELO],
  MI_FOTO_CAMBIADA: [Camera, CIELO],
  ESTUDIANTE_FOTO_QUITADA: [ImageOff, GRIS],
  MI_FOTO_QUITADA: [ImageOff, GRIS],
  EXAMEN_CREADO: [CalendarPlus, AZUL],
  EXAMEN_MODIFICADO: [FilePen, AZUL],
  EXAMEN_REPROGRAMADO: [CalendarClock, INDIGO],
  EXAMEN_CANCELADO: [CalendarX, ROJO],
  ESTUDIANTES_ASOCIADOS: [UserPlus, TURQUESA],
  ESTUDIANTE_QUITADO_DEL_EXAMEN: [UserMinus, GRIS],
  HABILITACION_ACTUALIZADA: [ListChecks, VERDE],
  PERSONAL_CONTROL_ASIGNADO: [ShieldCheck, INDIGO],
  ESTUDIANTE_CREADO: [GraduationCap, NARANJA],
  ESTUDIANTE_EDITADO: [Pencil, NARANJA],
  ESTUDIANTES_IMPORTADOS: [FileUp, NARANJA],
  CUENTA_ESTUDIANTE_ACTIVADA: [KeyRound, VERDE],
  USUARIO_CREADO: [UserPlus, VIOLETA],
  USUARIO_EDITADO: [Pencil, VIOLETA],
  USUARIOS_IMPORTADOS: [FileUp, VIOLETA],
  USUARIO_BLOQUEADO: [Lock, ROJO],
  USUARIO_DESBLOQUEADO: [LockOpen, VERDE],
  MATERIAS_ASIGNADAS: [BookOpen, INDIGO],
  CONTRASENA_CAMBIADA: [KeyRound, GRIS],
  ROL_CREADO: [Shield, VIOLETA],
  ROL_EDITADO: [Shield, VIOLETA],
  ROL_ELIMINADO: [Shield, ROJO],
  AMBIENTE_CREADO: [Building2, CIELO],
  AMBIENTE_AFORO_CAMBIADO: [Building2, CIELO],
  RESPALDO_DESCARGADO: [DatabaseBackup, GRIS],
  AYUDA_ATENDIDA: [LifeBuoy, AZUL],
}

/** Si llega una acción nueva que aún no está arriba: el ícono de su módulo. */
const POR_MODULO: Record<string, IconoActividad> = {
  Exámenes: [BookCheck, AZUL],
  Control: [ClipboardCheck, VERDE],
  Estudiantes: [GraduationCap, NARANJA],
  Usuarios: [UserRound, VIOLETA],
  Roles: [Settings, GRIS],
  Configuración: [Settings, GRIS],
  Ambientes: [MapPin, CIELO],
}

export function iconoOperacion(accion: string, modulo: string): IconoActividad {
  return POR_ACCION[accion] ?? POR_MODULO[modulo] ?? [CircleCheck, GRIS]
}

/** Lo mismo para los avisos (notificaciones), cuando el historial no se puede leer. */
const POR_AVISO: Record<string, IconoActividad> = {
  FOTO_REPORTADA: [CameraOff, ROJO],
  QR_DUPLICADO: [QrCode, VIOLETA],
  INTENTO_INGRESO: [TriangleAlert, NARANJA],
  AULA_INCORRECTA: [MapPin, NARANJA],
  EXCEPCION_NO_HABILITADO: [ShieldAlert, AMBAR],
  EXPULSION: [UserX, ROSA],
  EXPULSION_ANULADA: [Undo2, TURQUESA],
  INGRESO_MANUAL: [CircleCheck, VERDE],
  TRASLADO_AMBIENTE: [ArrowLeftRight, CIELO],
  AYUDA: [LifeBuoy, AZUL],
}

export function iconoAviso(tipo: string): IconoActividad {
  return POR_AVISO[tipo] ?? [TriangleAlert, AMBAR]
}
