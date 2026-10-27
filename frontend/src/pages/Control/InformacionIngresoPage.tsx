import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  Camera,
  CircleAlert,
  Eye,
  FileText,
  IdCard,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import PanelLayout from "../../components/layout/PanelLayout";
import MobileBottomNav from "../../components/navigation/MobileBottomNav";
import useExamen from "../../hooks/useExamen";
import {
  listarIntentosIngreso,
  type IntentoIngreso,
} from "../../services/intentoIngresoService";
import {
  listarRegistrosControlExamen,
  type RegistroControlIngresoExamen,
} from "../../services/controlIngresoService";
import {
  listarReportesQrDuplicado,
  obtenerFotoReporteQr,
  type ReporteQrDuplicado,
} from "../../services/reporteQrDuplicadoConsultaService";
import useEnVivo from "../../hooks/useEnVivo";
import ExpulsionesReporte from "../../components/control/ExpulsionesReporte";
import ExcepcionesNoHabilitadoReporte from "../../components/control/ExcepcionesNoHabilitadoReporte";

type PestañaIngreso = "intentos" | "autorizados" | "excepciones";

const fechaHora = (valor: string) =>
  new Date(valor).toLocaleString("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  });

export default function InformacionIngresoPage() {
  const idExamen = Number(useParams().idExamen);
  const idValido = Number.isInteger(idExamen) && idExamen > 0;
  const examen = useExamen(idExamen);
  const ubicacion =
    examen &&
    [examen.ambienteUbicacion, examen.ambienteNombre]
      .filter(Boolean)
      .join(" · ");
  const [intentos, setIntentos] = useState<IntentoIngreso[] | null>(null);
  const [registros, setRegistros] = useState<
    RegistroControlIngresoExamen[] | null
  >(null);
  const [reportes, setReportes] = useState<ReporteQrDuplicado[] | null>(null);
  const [reporteAbierto, setReporteAbierto] =
    useState<ReporteQrDuplicado | null>(null);
  const [fotoReporte, setFotoReporte] = useState<string | null>(null);
  const [resultadoCarga, setResultadoCarga] = useState<{
    idExamen: number;
    estado: "error" | "listo";
  }>();
  const [reintentosCarga, setReintentosCarga] = useState(0);
  const [pestaña, setPestaña] = useState<PestañaIngreso>("autorizados");
  const [registroExpandido, setRegistroExpandido] = useState<number | null>(null);

  // Estado para saber qué fila está expandida
  const [expandido, setExpandido] = useState<number | null>(null);

  useEffect(() => {
    if (!idValido) return;
    let vigente = true;
    Promise.all([
      listarIntentosIngreso(idExamen),
      listarRegistrosControlExamen(idExamen),
      listarReportesQrDuplicado(idExamen),
    ])
      .then(([intentosCargados, registrosCargados, reportesCargados]) => {
        if (!vigente) return;
        setIntentos(intentosCargados);
        setRegistros(registrosCargados);
        setReportes(reportesCargados);
        setResultadoCarga({ idExamen, estado: "listo" });
      })
      .catch(() => {
        if (vigente) setResultadoCarga({ idExamen, estado: "error" });
      });
    return () => {
      vigente = false;
    };
  }, [idExamen, idValido, reintentosCarga]);

  useEnVivo(
    (c) => c.idExamen === idExamen,
    () => setReintentosCarga((v) => v + 1),
  );

  useEffect(() => {
    if (!reporteAbierto) return;
    let vigente = true,
      url: string | null = null;
    obtenerFotoReporteQr(idExamen, reporteAbierto.idReporte).then((valor) => {
      url = valor;
      if (vigente) setFotoReporte(valor);
    });
    return () => {
      vigente = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [idExamen, reporteAbierto]);

  const estadoCarga = !idValido
    ? "error"
    : resultadoCarga?.idExamen !== idExamen
      ? "cargando"
      : resultadoCarga.estado;
  const error = !idValido
    ? "El examen indicado no es válido."
    : estadoCarga === "error"
      ? "No se pudo cargar la información de ingreso. Comprueba la conexión e inténtalo de nuevo."
      : "";
  const cargando = estadoCarga === "cargando";

  const totalIntentos =
    intentos === null || reportes === null
      ? null
      : intentos.length + reportes.length;
  const ingresosAutorizados =
    registros?.filter((registro) => registro.resultado === "AUTORIZADO") ?? [];
  const totalAutorizados =
    registros === null ? null : ingresosAutorizados.length;
  const ingresosManuales = ingresosAutorizados.filter((registro) => registro.tipoIngreso === 'MANUAL');
  const lista = pestaña === "intentos" ? intentos : pestaña === "excepciones" ? ingresosManuales : ingresosAutorizados;
  const detalleReporte = reporteAbierto?.detalle ?? "";
  const extraerDetalle = (etiqueta: string) =>
    detalleReporte
      .split("\n")
      .find((linea) => linea.startsWith(etiqueta))
      ?.slice(etiqueta.length)
      .trim();
  const documentoPresentado = extraerDetalle("Documento presentado:");
  const motivoObservado = extraerDetalle("Qué no coincide:");
  const verificacionRealizada = extraerDetalle("Verificación realizada:");
  const sinCarnet = reporteAbierto ? !reporteAbierto.presentoCarnet : false;
  const resultadoPrincipal = sinCarnet
    ? "La persona no presentó su carnet."
    : motivoObservado === "Foto no coincide."
      ? "La fotografía del documento no coincide con la persona presente."
      : motivoObservado === "Datos del carnet."
        ? "Los datos del carnet requieren una revisión adicional."
        : motivoObservado === "Documento alterado."
          ? "El documento presentado requiere una revisión adicional."
          : "Se registró una observación durante la verificación de identidad.";

  return (
    <PanelLayout
      compactDesktop
      topBarVariant="controlMinimal"
      locationLabel={ubicacion}
    >
      <div className="mx-auto w-full max-w-6xl p-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-4 md:p-6 md:pb-[calc(5rem+env(safe-area-inset-bottom))] min-[960px]:pb-6">
        <Link
          to={`/dashboard/control/${idExamen}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#0439D9]"
        >
          <ArrowLeft size={16} />
          Volver al control
        </Link>
        <section className="mt-4 rounded-2xl border border-[#D8E3F5] bg-white p-4 shadow-sm md:min-h-[calc(100dvh-170px)] md:rounded-xl md:border-[#E2E6EC] md:p-5">
          <header className="flex flex-col gap-3 border-b border-[#E6EAF0] pb-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-base font-extrabold uppercase text-[#171C27]">
                Información de ingreso tiempo real
              </h1>
              <p className="mt-1 text-xs text-[#627A9B]">
                {examen
                  ? `${examen.fecha} · ${examen.horaInicio} · ${examen.asignatura} · ${examen.ambienteNombre}${examen.docente ? ` · Docente: ${examen.docente}` : ""}`
                  : "Registros de control e intentos de ingreso del examen."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-[#E6ECFF] px-3 py-2 text-center text-[10px] font-bold uppercase text-[#0439D9]">
                Registros válidos
                <br />
                <span>
                  {totalAutorizados ?? "…"} ingreso
                  {totalAutorizados === 1 ? "" : "s"} autorizado
                  {totalAutorizados === 1 ? "" : "s"}
                </span>
              </div>
              <div className="rounded-lg bg-[#FDECEC] px-3 py-2 text-center text-[10px] font-bold uppercase text-[#B91C1C]">
                Incidencias
                <br />
                <span>
                  {totalIntentos ?? "…"} intento{totalIntentos === 1 ? "" : "s"}{" "}
                  observado{totalIntentos === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </header>

          <div
            className="-mx-3 mt-3 flex gap-1 overflow-x-auto border-b border-[#E6EAF0] px-3 sm:mx-0 sm:gap-2 sm:px-0"
            role="tablist"
            aria-label="Información de ingreso"
          >
            <button
              type="button"
              role="tab"
              aria-selected={pestaña === "autorizados"}
              onClick={() => setPestaña("autorizados")}
              className={`min-h-11 shrink-0 rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold ${pestaña === "autorizados" ? "border-[#0439D9] text-[#0439D9]" : "border-transparent text-[#627A9B]"}`}
            >
              Ingresos Autorizados en Tiempo Real{" "}
              <span className="ml-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-xs text-[#0439D9]">
                {totalAutorizados ?? "…"}
              </span>
            </button>
            <button type="button" role="tab" aria-selected={pestaña === "excepciones"} onClick={() => setPestaña("excepciones")}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0439D9]/40 ${pestaña === "excepciones" ? "border-[#0439D9] bg-[#F1F6FF] text-[#0439D9]" : "border-transparent text-[#627A9B] hover:bg-slate-50"}`}>
              <FileText size={16} aria-hidden="true" /> Excepciones
              <span className="rounded-full bg-[#E6ECFF] px-2 py-0.5 text-xs text-[#0439D9]">{ingresosManuales.length} manual{ingresosManuales.length === 1 ? '' : 'es'}</span>
            </button>
            <button type="button" role="tab" aria-selected={pestaña === "intentos"} onClick={() => setPestaña("intentos")}
              className={`min-h-11 shrink-0 rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold ${pestaña === "intentos" ? "border-[#0439D9] text-[#0439D9]" : "border-transparent text-[#627A9B]"}`}>
              <TriangleAlert className="mr-1 inline" size={16} aria-hidden="true" />
              Ingresos no autorizados <span className="ml-1 rounded-full bg-red-50 px-1.5 py-0.5 text-xs text-red-700">{totalIntentos ?? "…"}</span>
            </button>
          </div>

          <div role="tabpanel" className="pt-3">
            <h2 className="border-b border-[#E6EAF0] pb-2 text-base font-bold text-[#20242A]">
              {pestaña === "intentos"
                ? "Ingresos no autorizados"
                : pestaña === "excepciones" ? "Excepciones del examen" : "Ingresos autorizados"}
            </h2>
            {pestaña === "excepciones" && <>
              {idValido && <ExpulsionesReporte idExamen={idExamen} controles={registros ?? []}
                examen={examen?.idExamen === idExamen ? examen.asignatura : undefined} />}
              {idValido && <ExcepcionesNoHabilitadoReporte idExamen={idExamen} />}
              <h3 className="mt-4 font-semibold text-[#011140]">Ingresos manuales autorizados</h3>
              <p className="mt-2 text-sm text-[#627A9B]">Ingresos realizados sin QR, con justificación del personal de control. También se incluyen en la lista de ingresos autorizados.</p>
            </>}
            {error ? (
              <div
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                role="alert"
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setResultadoCarga(undefined);
                    setReintentosCarga((valor) => valor + 1);
                  }}
                  className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700"
                >
                  Reintentar
                </button>
              </div>
            ) : cargando ? (
              <p
                role="status"
                className="py-8 text-center text-sm text-gray-500"
              >
                Cargando información de ingreso…
              </p>
            ) : lista === null ||
              (lista.length === 0 && (pestaña !== "intentos" || (reportes?.length ?? 0) === 0)) ? (
              <p className="py-8 text-center text-sm text-gray-500">
                {pestaña === "intentos"
                  ? "No hay incidencias registradas para este examen."
                  : pestaña === "excepciones" ? "No hay ingresos manuales registrados para este examen." : "No hay ingresos autorizados registrados para este examen."}
              </p>
            ) : pestaña === "intentos" ? (
              <>
                <div className="mt-3 space-y-2">
                  {reportes?.map((reporte) => (
                    <article
                      key={reporte.idReporte}
                      className="rounded-xl border border-[#F1C4C9] bg-[#FFF8F8] p-4 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#20242A]">
                            Incidencia reportada
                          </p>
                          <p className="mt-0.5 text-xs text-red-700">
                            Presentado por {reporte.nombresPresentado}
                          </p>
                          <p className="mt-1 text-xs text-[#627A9B]">
                            {fechaHora(reporte.fechaHora)} ·{" "}
                            {reporte.personalControl} ·{" "}
                            <span className="font-semibold">
                              {reporte.estado === "PRUEBA"
                                ? "Dato de prueba / no válido"
                                : "Pendiente de revisión"}
                            </span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFotoReporte(null);
                            setReporteAbierto(reporte);
                          }}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border-2 border-[#0439D9] bg-white px-3 py-1.5 text-xs font-semibold text-[#0439D9]"
                        >
                          <Eye size={14} />
                          Ver detalles
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <ul
                  aria-label="Intentos no autorizados"
                  className="mt-3 space-y-3"
                >
                  {(lista as IntentoIngreso[]).map((intento) => {
                    const [textoPrincipal, textoDetalles] = (intento.motivo || "").split(" ### ");
                    const estaExpandido = expandido === intento.idIntento;

                    return (
                      <li
                        key={intento.idIntento}
                        className="rounded-xl border border-[#E1E7F0] bg-slate-50 p-4 shadow-[0_2px_8px_rgba(1,17,64,.05)]"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-[#011140] text-sm md:text-base">
                              {intento.estudiante || intento.identificador}
                            </p>
                            <p className="mt-1 break-words leading-5 text-red-700 text-xs md:text-sm font-semibold">
                              {textoPrincipal}
                            </p>
                            <p className="mt-1 text-[11px] md:text-xs font-medium text-[#627A9B]">
                              {intento.codigoSis || intento.identificador} · {fechaHora(intento.fechaHora)} · Personal: {intento.personalControl}
                            </p>
                          </div>
                          
                          {(
                            <button
                              type="button"
                              aria-expanded={estaExpandido}
                              onClick={() => setExpandido(estaExpandido ? null : intento.idIntento)}
                              className="shrink-0 self-start sm:self-center inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#0439D9] border border-[#D8E3F5] shadow-sm hover:bg-[#F4F7FB] transition-colors"
                            >
                              {estaExpandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              {estaExpandido ? "Ocultar" : "Ver detalles"}
                            </button>
                          )}
                        </div>

                        {/* Panel de detalles optimizado */}
                        {estaExpandido && (
                          <div className="mt-4 rounded-r-xl rounded-bl-xl border border-[#E2E8F0] border-l-4 border-l-[#1d40a9] bg-[#F8FAFC] p-3.5 shadow-sm sm:p-4">
                            <div className="flex flex-col gap-2.5">
                              {(textoDetalles || `Motivo: ${textoPrincipal} | Identificador: ${intento.codigoSis || intento.identificador} | Fecha y hora: ${fechaHora(intento.fechaHora)} | Registrado por: ${intento.personalControl}`).split(" | ").map((detalle, idx) => {
                                const [label, ...rest] = detalle.split(": ");
                                const value = rest.join(": ");
                                
                                if (!value) {
                                  return <p key={idx} className="text-xs md:text-sm font-medium text-[#475569]">{detalle}</p>;
                                }
                                
                                return (
                                  <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 border-b border-[#E2E8F0]/60 pb-2 last:border-0 last:pb-0">
                                    <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-[#4c678e] shrink-0">
                                      {label}:
                                    </span>
                                    <span className="text-xs md:text-xs font-medium text-[#0F172A] leading-snug">
                                      {value}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <ul
                aria-label="Ingresos autorizados"
                className="mt-3 space-y-3"
              >
                {(lista as RegistroControlIngresoExamen[]).map((registro) => (
                  <li
                    key={registro.idRegistro}
                    className="rounded-xl border border-[#E1E7F0] bg-white p-4 shadow-[0_2px_8px_rgba(1,17,64,.05)]"
                  >
                    <p className="font-bold text-[#011140] text-sm md:text-base">
                      {registro.estudiante}
                    </p>
                    <p className="mt-1 text-xs md:text-sm leading-5 text-[#0439D9]">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${registro.tipoIngreso === 'MANUAL' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}><ShieldCheck size={13} aria-hidden="true" />{registro.tipoIngreso === 'MANUAL' ? 'Autorizado · Ingreso manual' : 'Autorizado · Ingreso normal'}</span>
                    </p>
                    <p className="mt-1 break-words text-[11px] md:text-xs leading-5 text-[#627A9B]">
                      {registro.codigoSis ??
                        `Estudiante ${registro.idEstudiante}`}{" "}
                      · Fecha y hora: {fechaHora(registro.fechaHora)}
                      {registro.usuarioControl
                        ? ` · Autorizado por: ${registro.usuarioControl}`
                        : ""}
                    </p>
                    <button type="button" aria-expanded={registroExpandido === registro.idRegistro} onClick={() => setRegistroExpandido(registroExpandido === registro.idRegistro ? null : registro.idRegistro)} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#D8E3F5] bg-white px-3 py-1.5 text-xs font-bold text-[#0439D9] shadow-sm hover:bg-[#F4F7FB]">
                      {registroExpandido === registro.idRegistro ? <ChevronUp size={16} /> : <Eye size={16} />}
                      {registroExpandido === registro.idRegistro ? 'Ocultar detalles' : 'Ver detalles'}
                    </button>
                    {registroExpandido === registro.idRegistro && <div className="mt-3 space-y-2 rounded-lg border border-[#E6EAF0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#344158]">
                      <p><strong>Estudiante:</strong> {registro.estudiante}</p>
                      <p><strong>Código SIS:</strong> {registro.codigoSis ?? 'No registrado'}</p>
                      <p><strong>Tipo de ingreso:</strong> {registro.tipoIngreso === 'MANUAL' ? 'Manual por CI/SIS' : 'Normal'}</p>
                      {registro.tipoIngreso === 'MANUAL' && <p className="whitespace-pre-wrap break-words"><strong>Justificación:</strong> {registro.justificacionManual}</p>}
                      <p><strong>Fecha y hora:</strong> {fechaHora(registro.fechaHora)}</p>
                      <p><strong>Autorizado por:</strong> {registro.usuarioControl || 'No registrado'}</p>
                      {registro.observaciones && <p className="whitespace-pre-wrap break-words"><strong>Observaciones:</strong> {registro.observaciones}</p>}
                      {registro.verificacionesAdicionales.length > 0 && <p><strong>Verificaciones:</strong> {registro.verificacionesAdicionales.join(' · ')}</p>}
                      {registro.ambienteIngreso && <p><strong>Aula:</strong> {registro.ambienteIngreso}{registro.reasignado ? (registro.trasladadoDesde ? ` · trasladado desde ${registro.trasladadoDesde}` : ' (Reasignado)') : ''}</p>}
                    </div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
      {reporteAbierto && (
        <div
          className="control-overlay fixed inset-0 z-[70] grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Detalles de incidencia"
        >
          <section className="max-h-[94vh] w-full max-w-[690px] overflow-y-auto rounded-[22px] border border-white/80 bg-white shadow-[0_26px_80px_rgba(26,38,65,.16)]">
            <header className="flex items-center justify-between border-b border-[#EDF0F4] px-6 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#FFF0F2] text-[#CE273A]">
                  <TriangleAlert size={21} />
                </span>
                <div>
                  <p className="text-[10px] font-bold tracking-[.15em] text-[#8792A3]">
                    CONTROL DE IDENTIDAD
                  </p>
                  <h2 className="text-xl font-bold tracking-tight text-[#172235]">
                    Detalle de incidencia
                  </h2>
                </div>
              </div>
              <button
                className="grid h-9 w-9 place-items-center rounded-lg text-[#718096] transition hover:bg-[#F2F5FA] hover:text-[#172235]"
                aria-label="Cerrar detalles"
                onClick={() => setReporteAbierto(null)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="space-y-5 p-6 text-sm sm:p-7">
              <div className="grid gap-3 sm:grid-cols-2">
                <div
                  className={`flex items-center gap-3 rounded-xl border p-4 ${reporteAbierto.estado === "PRUEBA" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-[#CDEDE0] bg-[#F6FFFA] text-[#087656]"}`}
                >
                  <ShieldCheck size={20} className="shrink-0" />
                  <span className="text-sm font-bold">
                    {reporteAbierto.estado === "PRUEBA"
                      ? "Dato de prueba / no válido"
                      : "Pendiente de revisión"}
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-[#D9E4FB] bg-[#F5F8FF] p-4 text-[#1A3159]">
                  <FileText size={20} className="shrink-0 text-[#315BD5]" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#73839D]">
                      Tipo de incidencia
                    </p>
                    <p className="text-sm font-bold">
                      Observación en la verificación de identidad
                    </p>
                  </div>
                </div>
              </div>

              <section className="flex items-start gap-3 rounded-xl border border-[#F3B8C0] bg-[#FFF5F6] p-4 text-[#B61F35]">
                <CircleAlert className="mt-0.5 shrink-0" size={23} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#8A7380]">
                    Resultado de la verificación
                  </p>
                  <p className="mt-1 text-base font-bold leading-6">
                    {resultadoPrincipal}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-[#876270]">
                    {sinCarnet
                      ? "El personal dejó constancia de que no se contó con el documento al momento del control."
                      : "Se registró la observación para su revisión; este reporte no confirma una suplantación."}
                  </p>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-[#DDE6F2] bg-white">
                <div className="flex items-center gap-3 border-b border-[#E8EDF4] bg-[#F7F9FC] px-4 py-3">
                  <UserRound size={19} className="text-[#315BD5]" />
                  <p className="text-sm font-bold text-[#172235]">Información de la persona</p>
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:divide-x sm:divide-[#DCE4EF] sm:px-6">
                  <p>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#71819A]">
                      Nombre
                    </span>
                    <b className="text-[15px] font-semibold text-[#172235]">
                      {reporteAbierto.nombresPresentado}
                    </b>
                  </p>
                  <p className="sm:pl-6">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#71819A]">
                      Documento
                    </span>
                    <b
                      className={`flex items-center gap-2 text-[15px] font-semibold ${sinCarnet ? "text-[#C62035]" : "text-[#172235]"}`}
                    >
                      <IdCard size={17} />
                      {sinCarnet
                        ? "No presentó carnet"
                        : documentoPresentado ?? "Carnet de identidad"}
                    </b>
                  </p>
                  {reporteAbierto.codigoSisPresentado && (
                    <p>
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#71819A]">
                        Código SIS dictado
                      </span>
                      <b className="text-[15px] font-semibold text-[#172235]">
                        {reporteAbierto.codigoSisPresentado}
                      </b>
                    </p>
                  )}
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-[#DDE6F2] bg-[#FCFDFF]">
                <div className="flex items-center gap-3 border-b border-[#E8EDF4] bg-[#F7F9FC] px-4 py-3">
                  <ShieldCheck size={19} className="text-[#315BD5]" />
                  <p className="text-sm font-bold text-[#172235]">Detalle de verificación</p>
                </div>
                <ol className="space-y-3 p-5">
                  <li className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EAF0FF] text-xs font-bold text-[#315BD5]">1</span>
                    <p className="pt-0.5 text-[13px] leading-6 text-[#44546D]"><b>Documento revisado:</b> {sinCarnet ? "No presentó carnet." : documentoPresentado ?? "Carnet de identidad."}</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EAF0FF] text-xs font-bold text-[#315BD5]">2</span>
                    <p className="pt-0.5 text-[13px] leading-6 text-[#44546D]"><b>Observación detectada:</b> {sinCarnet ? "No presentó carnet." : motivoObservado ?? "Se registró una observación durante el control."}</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EAF0FF] text-xs font-bold text-[#315BD5]">3</span>
                    <p className="pt-0.5 text-[13px] leading-6 text-[#44546D]"><b>Verificación realizada:</b> {sinCarnet ? "El personal dejó constancia de la ausencia del carnet." : verificacionRealizada ?? "Registrada por personal de control de ingreso."}</p>
                  </li>
                </ol>
              </section>

              <div className="grid items-center gap-3 rounded-xl bg-[#F5F7FB] px-5 py-4 text-sm text-[#627A9B] sm:grid-cols-2 sm:divide-x sm:divide-[#DCE4EF]">
                <p className="flex items-center gap-3">
                  <CalendarClock size={18} className="text-[#315BD5]" />
                  {fechaHora(reporteAbierto.fechaHora)}
                </p>
                <p className="flex items-center gap-3 sm:pl-6">
                  <UserRound size={18} className="text-[#315BD5]" />
                  Registrado por {reporteAbierto.personalControl}
                </p>
              </div>

              <section>
                <p className="mb-2 flex items-center gap-2 text-xs font-bold text-[#172235]">
                  <Camera size={16} className="text-[#315BD5]" />
                  Fotografía de evidencia
                </p>
                {fotoReporte ? (
                  <img
                    src={fotoReporte}
                    alt="Evidencia del reporte"
                    className="max-h-72 w-full rounded-xl border border-[#DDE6F2] bg-[#F7F9FC] object-contain"
                  />
                ) : (
                  <p className="rounded-xl border border-dashed border-[#D3DDEA] bg-[#F7F9FC] p-5 text-center text-xs text-[#627A9B]">
                    Cargando fotografía…
                  </p>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
      <MobileBottomNav variant="controlDetail" />
    </PanelLayout>
  );
}
