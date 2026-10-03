# Pruebas locales SIGEX

Sistema disponible en `http://localhost:3000`.

## Cuentas disponibles

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Admin | `admin.prueba@umss.edu.bo` | `Prueba2026*` |
| Control | `control.prueba@umss.edu.bo` | `Prueba2026*` |
| Docente | `docente.prueba@umss.edu.bo` | `Prueba2026*` |

## Datos de estudiantes

| Estudiante | Código SIS | CI |
| --- | --- | --- |
| Ana María Torres Rojas | `202600001` | `71000001` |
| Luis Alberto Mendoza Flores | `202600002` | `71000002` |
| Carla Sofía Rojas Pérez | `202600003` | `71000003` |

## Registrar estudiante

1. Iniciar sesión como **Admin** y abrir **Estudiantes** > **Registrar estudiante**.
2. Para validar duplicados, intentar registrar a Ana con el código `202600001`, CI `71000001` o su correo ya existente. Debe rechazarse el duplicado y no crear otro estudiante.
3. Para probar un registro exitoso, usar únicamente datos de un estudiante real autorizado por la institución: código SIS, CI y correo institucional no registrados. No se incluyeron datos ficticios para evitar contaminar la base local.
4. Confirmar que el estudiante exitoso aparece una sola vez en el listado y puede buscarse por código o CI.

## ACCS-02 — Registrar información y autorizar ingreso

### Preparación vigente

- Examen: **Programación I** (`INF-113`).
- Hoy, `17:53` a `18:53`.
- Ambiente: **AUDINF**.
- Estudiante habilitada: **Carla Sofía Rojas Pérez** (`202600003`, CI `71000003`).
- Su ingreso está pendiente, por lo que puede realizarse una autorización limpia.

### Caso A: autorización con evidencia

1. Iniciar sesión como **Control**.
2. Abrir **Control**, seleccionar *Programación I* e iniciar el control.
3. Identificar a Carla con `202600003` o `71000003`.
4. Verificar que se muestran estudiante, examen, ambiente y normas.
5. Marcar la verificación de identidad, escribir una observación y, opcionalmente, añadir una incidencia.
6. Pulsar **Autorizar ingreso**.

Resultado esperado: se muestra el comprobante con el personal de control, hora oficial del servidor, observaciones, verificaciones e incidencias registradas.

### Caso B: impedir duplicado

1. Volver a identificar a Carla para el mismo examen.
2. Intentar autorizar otra vez.

Resultado esperado: el sistema bloquea la segunda autorización; no se crea un segundo ingreso.

### Caso C: denegación con motivo

1. Usar un estudiante habilitado pendiente en otro examen o preparar uno mediante Admin.
2. En el control, abrir **Denegar**, seleccionar una razón y confirmar.

Resultado esperado: se registra la denegación con motivo, usuario y hora del servidor; una autorización posterior queda bloqueada.

## ACCS-05 — Registrar intento de ingreso incorrecto

### Evidencia ya disponible

En *Programación I* ya existe un intento de **Ana María Torres Rojas** (`202600001`), quien no está asociada a ese examen. Se puede ver con **Ver intentos**.

### Nuevo caso de prueba

1. Como **Control**, abrir *Programación I* > **Ver intentos**.
2. Registrar a **Luis Alberto Mendoza Flores** (`202600002`, CI `71000002`) como intento incorrecto: tampoco está asociado a ese examen.
3. Indicar un motivo descriptivo, por ejemplo: `Intentó ingresar a un examen que no le corresponde.`
4. Consultar el historial del examen y filtrar por estudiante si corresponde.

Resultado esperado: se muestra estudiante, identificador presentado, motivo, personal de control y fecha/hora del servidor. El registro queda asociado al examen correcto.

## Criterio de aprobación

- Las acciones de Control no permiten duplicar una autorización para el mismo estudiante y examen.
- Autorizar y denegar guardan la hora del servidor, no la del navegador.
- ACCS-05 conserva el historial de intentos con su motivo y responsable.
- Un Docente solo puede consultar o controlar sus propios exámenes; Admin y Control pueden acceder a todos.
