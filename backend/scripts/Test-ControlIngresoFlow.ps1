<#
Prueba de integración HTTP + PostgreSQL de ACCS-02, sin dependencias E2E.
Requiere backend actualizado y Docker PostgreSQL local. Las credenciales CONTROL
se reciben por variables de entorno; nunca se guardan en el repositorio.
Ejemplo: ./scripts/Test-ControlIngresoFlow.ps1 -ExamenId 1 -BaseUrl http://localhost:8081/api/v1
Usar exclusivamente un examen local de prueba. Crea estudiantes aislados y los
elimina en finally; no cambia el examen ni estudiantes existentes.
#>
param(
    [Parameter(Mandatory)][int]$ExamenId,
    [string]$BaseUrl = 'http://localhost:8081/api/v1',
    [string]$Container = 'nexacore_postgres',
    [string]$Database = 'taller_TIS'
)
$ErrorActionPreference = 'Stop'
if ($ExamenId -le 0) { throw 'ExamenId debe ser positivo.' }
if ([uri]$BaseUrl | Where-Object { $_.Host -notin @('localhost', '127.0.0.1') }) { throw 'Esta prueba solo admite localhost.' }
if (!$env:SIGEX_QA_CONTROL_EMAIL -or !$env:SIGEX_QA_CONTROL_PASSWORD) { throw 'Define SIGEX_QA_CONTROL_EMAIL y SIGEX_QA_CONTROL_PASSWORD fuera del repositorio.' }
$prefix = 'QAACCS02' + [guid]::NewGuid().ToString('N').Substring(0,12)
$headers = @{}
function Sql([string]$Query) {
    $rows = & docker exec $Container psql -X -q -t -A -v ON_ERROR_STOP=1 -U postgres -d $Database -c $Query
    if ($LASTEXITCODE -ne 0) { throw 'Falló una operación de PostgreSQL.' }
    return ($rows -join "`n").Trim()
}
function Assert-QA([bool]$Condition, [string]$Name) {
    if (!$Condition) { throw "FAIL: $Name" }
    Write-Host "PASS: $Name"
}
function Http([string]$Method, [string]$Path, $Body = $null) {
    $params = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = $headers; SkipHttpErrorCheck = $true }
    if ($null -ne $Body) { $params.Body = ConvertTo-Json -InputObject $Body -Depth 8 -Compress; $params.ContentType = 'application/json; charset=utf-8' }
    $response = Invoke-WebRequest @params
    return @{ Status = [int]$response.StatusCode; Data = ($response.Content | ConvertFrom-Json -NoEnumerate) }
}
try {
    Assert-QA ((Sql "select count(*) from examen where id_examen=$ExamenId and estado <> 'cancelado'") -eq '1') 'Examen local disponible'
    $login = Http POST '/auth/login' @{ email=$env:SIGEX_QA_CONTROL_EMAIL; password=$env:SIGEX_QA_CONTROL_PASSWORD }
    Assert-QA ($login.Status -eq 200 -and 'CONTROL' -in $login.Data.roles) 'Login CONTROL'
    $headers = @{ Authorization = "Bearer $($login.Data.token)" }
    $list = Http GET '/examenes'
    Assert-QA ($list.Status -eq 200 -and $ExamenId -in $list.Data.idExamen) 'Selección de examen disponible para CONTROL'
    Sql "BEGIN; INSERT INTO usuario(nombre,apellidos,ci,email,password,estado) SELECT 'QA ACCS02','Caso '||g,'$prefix-CI-'||g,lower('$prefix')||'-'||g||'@umss.edu.bo','QA_NO_LOGIN','activo' FROM generate_series(1,3) g; INSERT INTO estudiante(id_usuario,codigo_sis) SELECT id_usuario,'$prefix-SIS-'||right(ci,1) FROM usuario WHERE ci IN ('$prefix-CI-1','$prefix-CI-2','$prefix-CI-3'); INSERT INTO asistencia_examen(id_estudiante,id_usuario,id_examen,id_paralelo,habilitado,motivo_inhabilitacion) SELECT s.id_estudiante,s.id_usuario,x.id_examen,x.id_paralelo,s.codigo_sis='$prefix-SIS-1',CASE WHEN s.codigo_sis='$prefix-SIS-2' THEN 'QA: documentación pendiente' END FROM estudiante s CROSS JOIN examen x WHERE x.id_examen=$ExamenId AND s.codigo_sis IN ('$prefix-SIS-1','$prefix-SIS-2'); COMMIT;" | Out-Null
    $identified = Http GET "/examenes/$ExamenId/estudiantes/identificar?tipo=codigo&valor=$prefix-SIS-1"
    Assert-QA ($identified.Status -eq 200 -and $identified.Data.estado -eq 'HABILITADO') 'Identificación por SIS y estudiante habilitado'
    $id = $identified.Data.idEstudiante
    $ci = Http GET "/examenes/$ExamenId/estudiantes/identificar?tipo=ci&valor=$prefix-CI-1"
    Assert-QA ($ci.Data.idEstudiante -eq $id) 'Identificación por CI conserva estudiante'
    $unlinked = Http GET "/examenes/$ExamenId/estudiantes/identificar?tipo=codigo&valor=$prefix-SIS-3"
    Assert-QA ($unlinked.Data.estado -eq 'NO_VINCULADO') 'Estudiante sin vínculo'
    $context = Http GET "/control-ingresos/$id/$ExamenId/contexto"
    Assert-QA ($context.Status -eq 200 -and $context.Data.idEstudiante -eq $id -and $context.Data.idExamen -eq $ExamenId) 'Contexto ACCS-02: estudiante y examen correctos'
    $catalog = Http GET '/control-ingresos/tipos-incidencia'
    $incidentType = @($catalog.Data | Where-Object nombre -eq 'DOCUMENTO_MAL_ESTADO')[0]
    Assert-QA ($null -ne $incidentType) 'Catálogo de incidencias del mockup'
    $payload = @{ idEstudiante=$id; idExamen=$ExamenId; observaciones='QA: observación controlada'; verificacionesAdicionales=@(); incidencias=@() }
    $missing = Http POST '/control-ingresos/autorizar' $payload
    Assert-QA ($missing.Status -eq 422) 'Backend bloquea autorización sin verificación'
    $emptyHistory = Http GET "/control-ingresos/$id/$ExamenId"
    Assert-QA (@($emptyHistory.Data).Count -eq 0) 'Rechazo sin autorización ni historial falso'
    $payload.verificacionesAdicionales = @('Identidad biométrica cotejada / Carnet físico verificado')
    $payload.incidencias = @(@{idTipoIncidencia=$incidentType.id;descripcion='QA: documento deteriorado'})
    $authorized = Http POST '/control-ingresos/autorizar' $payload
    Assert-QA ($authorized.Status -eq 200 -and $authorized.Data.autorizado -and $authorized.Data.incidenciasRegistradas -eq 1) 'Autorización con observación, verificación e incidencia'
    $stored = (Sql "select row_to_json(q) from (select a.fecha_hora_ingreso as timestamp,u.email as control,a.observaciones_control as observacion,(select count(*) from incidencia i where i.id_estudiante=a.id_estudiante and i.id_examen=a.id_examen) as incidencias from asistencia_examen a join usuario u on u.id_usuario=a.id_usuario_control where a.id_estudiante=$id and a.id_examen=$ExamenId) q") | ConvertFrom-Json
    Assert-QA ($stored.control -eq $env:SIGEX_QA_CONTROL_EMAIL -and $stored.observacion -eq $payload.observaciones -and $stored.incidencias -eq 1) 'Persistencia PostgreSQL y usuario CONTROL'
    Assert-QA ([datetime]$stored.timestamp -eq [datetime]$authorized.Data.fechaHoraIngreso) 'Timestamp de respuesta coincide exactamente con PostgreSQL'
    $history = Http GET "/control-ingresos/$id/$ExamenId"
    Assert-QA ($history.Status -eq 200 -and @($history.Data).Count -eq 1 -and $history.Data[0].resultado -eq 'AUTORIZADO' -and $history.Data[0].usuarioControl -eq $authorized.Data.autorizadoPor -and $payload.verificacionesAdicionales[0] -in $history.Data[0].verificacionesAdicionales) 'Historial con identidad, evidencia y resultado'
    $payload.incidencias = @()
    $duplicate = Http POST '/control-ingresos/autorizar' $payload
    Assert-QA ($duplicate.Status -eq 409 -and $duplicate.Data.resultado -eq 'DENEGADO_DUPLICADO') 'Intento duplicado bloqueado'
    $manual = Http POST '/control-ingresos/denegar' $payload
    Assert-QA ($manual.Status -eq 200 -and $manual.Data.resultado -eq 'DENEGADO_CONTROL') 'Denegación manual con usuario y hora del servidor'
    $denialHistory = Http GET "/control-ingresos/$id/$ExamenId"
    $manualRecord = @($denialHistory.Data | Where-Object causa -eq $payload.observaciones)[0]
    Assert-QA ($null -ne $manualRecord -and $manualRecord.usuarioControl -eq $manual.Data.autorizadoPor -and $null -ne $manual.Data.fechaHoraIngreso) 'Denegación manual persistida en historial con CONTROL y timestamp'
    $after = (Sql "select fecha_hora_ingreso from asistencia_examen where id_estudiante=$id and id_examen=$ExamenId")
    Assert-QA ([datetime]$after -eq [datetime]$stored.timestamp) 'Denegación y duplicado no modifican el ingreso registrado'
    $blocked = Http GET "/examenes/$ExamenId/estudiantes/identificar?tipo=codigo&valor=$prefix-SIS-2"
    $payload.idEstudiante = $blocked.Data.idEstudiante
    $denied = Http POST '/control-ingresos/autorizar' $payload
    Assert-QA ($denied.Status -eq 422 -and $denied.Data.resultado -eq 'DENEGADO_NO_HABILITADO' -and $denied.Data.causa -match 'documentación pendiente') 'Estudiante no habilitado: denegación y causa'
    Assert-QA ((Sql "select count(*) from asistencia_examen where id_estudiante=$($payload.idEstudiante) and id_examen=$ExamenId and fecha_hora_ingreso is null") -eq '1') 'Denegación no registra ingreso para estudiante no habilitado'
    Sql "update asistencia_examen set habilitado=true,motivo_inhabilitacion=null where id_estudiante=$($payload.idEstudiante) and id_examen=$ExamenId" | Out-Null
    $payload.observaciones = 'Fuera de tiempo'
    $freshDenial = Http POST '/control-ingresos/denegar' $payload
    $retry = Http POST '/control-ingresos/autorizar' $payload
    $deniedContext = Http GET "/control-ingresos/$($payload.idEstudiante)/$ExamenId/contexto"
    Assert-QA ($freshDenial.Status -eq 200 -and $retry.Status -eq 422 -and !$deniedContext.Data.habilitado -and $deniedContext.Data.motivoInhabilitacion -match 'Fuera de tiempo') 'Denegación manual persistente impide autorizar incluso al recargar'
    Write-Host 'FLUJO ACCS-02 APROBADO'
} finally {
    Sql "BEGIN; DELETE FROM incidencia WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE ci IN ('$prefix-CI-1','$prefix-CI-2','$prefix-CI-3')); DELETE FROM registro_control_ingreso WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE ci IN ('$prefix-CI-1','$prefix-CI-2','$prefix-CI-3')); DELETE FROM asistencia_examen WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE ci IN ('$prefix-CI-1','$prefix-CI-2','$prefix-CI-3')); DELETE FROM estudiante WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE ci IN ('$prefix-CI-1','$prefix-CI-2','$prefix-CI-3')); DELETE FROM usuario WHERE ci IN ('$prefix-CI-1','$prefix-CI-2','$prefix-CI-3'); COMMIT;" | Out-Null
    Assert-QA ((Sql "select count(*) from usuario where ci IN ('$prefix-CI-1','$prefix-CI-2','$prefix-CI-3')") -eq '0') 'Datos temporales eliminados'
}
