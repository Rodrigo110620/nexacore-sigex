# INCI-01 — cliente, botón y modal (contrato provisional)

Reutiliza Axios con JWT, `TextoLibreCampo`, clases del modal de denegación y el enlace
actual de identificación. Tabla y tarjetas comparten permisos ADMIN e ingreso efectivo;
un `expulsado: true` explícito de la API oculta la acción, sin inventar ese estado.
Referencia: las seis capturas aprobadas de INCI01 del chat «Diseñar mockups SIGEX INCI-01».
POST `/control-ingresos/expulsar` envía solo estudiante, examen y motivo; propaga errores.
Un 2xx sin contrato de respuesta muestra un aviso pendiente, bloquea otro envío en ese modal
y no modifica al estudiante. Badge y consulta de auditoría quedan para la próxima entrega.

Propuesta backend revisada, sin modificar código, migraciones ni BD:
- Controller: `@PreAuthorize("hasRole('ADMIN')")`; `puedeControlar` también permite CONTROL.
- Service transaccional: responsable desde Authentication, motivo obligatorio, asociación,
  ingreso previo y ausencia de expulsión; serializar con `buscarParaAutorizar` y unicidad en BD.
- Hora desde `obtenerFechaHoraServidor()`/BD, nunca `fechaHoraDispositivo` ni `horaDispositivo`.
- V7 cataloga EXPULSION; no define su persistencia. V11 solo permite AUTORIZADO/DENEGADO.
  V1, V12 y V42 tampoco resuelven el registro disciplinario. Emitir cambios tras confirmar.
Rodrigo debe acordar persistencia, unicidad y respuesta con motivo, responsable y hora con zona;
no integrar éxito ni registro hasta disponer de datos confirmados. Toda migración requiere
la autorización expresa del usuario. Las pruebas mock no demuestran autorización del servidor.

Verificación: 496 pruebas/59 archivos aprobados, ESLint y TypeScript enfocado aprobados.
TypeScript global sigue fallando por dependencias ausentes `@mediapipe/tasks-vision` y `qrcode` en archivos ajenos a INCI-01.
