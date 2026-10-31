import { ConfirmDiscardDialog } from "../examenes/ExamFormDialogs";
import { useEffect, useRef, useState } from "react";
import {
  AlertOctagon,
  Camera,
  CheckCircle2,
  ChevronRight,
  Info,
  LockKeyhole,
  Shield,
  X,
} from "lucide-react";
import { prepararFoto, validarArchivoFoto } from "../../utils/fotoEstudiante";
import { registrarReporteQrDuplicado } from "../../services/reporteQrDuplicadoService";
import { motivoIdentificadorFicticio } from "../../utils/identificacionValidators";
import { sanitizeNombreInput, validateDocumento } from "../../utils/validators";
import "./ReporteQrDuplicadoModal.css";
import "./ReporteQrDuplicadoCamera.css";

const motivos = [
  "Foto no coincide",
  "Datos del carnet",
  "Documento alterado",
  "Otro motivo",
] as const;
type Motivo = (typeof motivos)[number];
const horaLocal = () => {
  const d = new Date(),
    m = -d.getTimezoneOffset(),
    a = Math.abs(m);
  return `${new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19)}${m >= 0 ? "+" : "-"}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
};

export default function ReporteQrDuplicadoModal({
  idExamen,
  idEstudianteQr,
  onClose,
}: {
  idExamen: number;
  idEstudianteQr: number;
  onClose: () => void;
}) {
  const [nombres, setNombres] = useState(""),
    [ci, setCi] = useState(""),
    [sis, setSis] = useState(""),
    [sisAbierto, setSisAbierto] = useState(false);
  const [motivo, setMotivo] = useState<Motivo | null>(null),
    [detalle, setDetalle] = useState(""),
    [revisado, setRevisado] = useState(false),
    [sinCarnet, setSinCarnet] = useState(false),
    [foto, setFoto] = useState<Blob | null>(null),
    [fotoNombre, setFotoNombre] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState(""),
    [enviando, setEnviando] = useState(false),
    [idReporte, setIdReporte] = useState<number | null>(null);
  const [descartar, setDescartar] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const limpiarError = (campo: string) => setErrores(prev => ({...prev, [campo]: ""}));
  const cerrar = () => {
    if (enviando) return;
    if (!idReporte && (nombres || ci || sis || motivo || detalle || revisado || sinCarnet || foto)) setDescartar(true);
    else { detenerCamara(); onClose(); }
  };
  const errorCampo = (campo: string) => errores[campo] ? <p className="report-incidence-error" role="alert" id={`error-${campo}`}>{errores[campo]}</p> : null;
  const videoRef = useRef<HTMLVideoElement>(null);
  const vigente = useRef(true);
  const solicitandoCamara = useRef(false);
  const [camaraPendiente, setCamaraPendiente] = useState(false);
  useEffect(() => {
    vigente.current = true;
    return () => { vigente.current = false; };
  }, []);
  const detenerCamara = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [stream]);
  const abrirCamara = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrores(prev => ({...prev, foto: "Este dispositivo no permite usar la cámara."}));
      return;
    }
    if (solicitandoCamara.current) return;
    solicitandoCamara.current = true;
    setCamaraPendiente(true);
    try {
      const nueva = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (!vigente.current) {
        nueva.getTracks().forEach(t => t.stop());
        return;
      }
      setStream(nueva);
      setError("");
    } catch {
      if (vigente.current) setErrores(prev => ({...prev, foto: "No se pudo acceder a la cámara. Revisa el permiso del navegador."}));
    } finally {
      solicitandoCamara.current = false;
      if (vigente.current) setCamaraPendiente(false);
    }
  };

  const capturarFoto = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      setErrores(prev => ({...prev, foto: "Espera a que se active la cámara."}));
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/jpeg", 0.9),
    );
    if (!blob) return;
    const archivo = new File([blob], "evidencia-incidencia.jpg", {
        type: "image/jpeg",
      }),
      invalido = validarArchivoFoto(archivo);
    if (invalido) {
      setErrores(prev => ({...prev, foto: invalido}));
      return;
    }
    try {
      setFoto(await prepararFoto(archivo));
      setFotoNombre("Fotografía capturada");
      setErrores(prev => ({...prev, foto: ""}));
      detenerCamara();
    } catch {
      setErrores(prev => ({...prev, foto: "No se pudo preparar la fotografía."}));
    }
  };
  const enviar = async () => {
    const campos: Record<string, string> = {};
    if (nombres.trim().length < 3 || nombres.trim().length > 75) campos.nombres = "Los nombres y apellidos deben tener entre 3 y 75 caracteres.";
    else if (!/^[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:[ '-][A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+)*$/.test(nombres.trim())) campos.nombres = "Escribe nombres y apellidos válidos.";
    else if (/(\p{L})\1\1/iu.test(nombres.trim())) campos.nombres = "Los nombres no pueden repetir una letra 3 veces seguidas.";
    const ciError = sinCarnet ? "" : validateDocumento(ci);
    if (ciError) campos.ci = ciError;
    if (sis && !/^\d{9}$/.test(sis)) campos.sis = "El código SIS debe tener 9 dígitos.";
    else if (sis) { const invalido = motivoIdentificadorFicticio('codigo', sis); if (invalido) campos.sis = invalido; }
    if (!motivo) campos.motivo = "Selecciona qué no coincide.";
    if (motivo === "Otro motivo" && detalle.trim().length < 20) campos.detalle = "La descripción debe tener al menos 20 caracteres.";
    if (!revisado && !sinCarnet) campos.carnet = "Indica si revisaste el carnet o no fue presentado.";
    if (!foto) campos.foto = "La fotografía es obligatoria.";
    setErrores(campos);
    if (Object.keys(campos).length || !foto) { setError(""); return; }
    const compuesto = `Documento presentado: ${sinCarnet ? "No presentó carnet." : "Carnet de identidad."}\nQué no coincide: ${motivo}.\nVerificación realizada: ${sinCarnet ? "La persona indicó no contar con su carnet." : "Carnet comparado con la persona presente."}${detalle.trim() ? `\nObservación adicional: ${detalle.trim()}` : ""}`;
    setEnviando(true);
    setError("");
    try {
      setIdReporte(
        await registrarReporteQrDuplicado({
          idExamen,
          idEstudianteQr,
          nombresPresentado: nombres.trim(),
          ciPresentado: ci,
          presentoCarnet: !sinCarnet,
          codigoSisPresentado: sis,
          detalle: compuesto,
          fechaHoraDispositivo: horaLocal(),
          foto,
        }),
      );
    } catch (e: unknown) {
      const mensaje = (e as { response?: { data?: { mensaje?: string } } }).response?.data?.mensaje ?? "No se pudo registrar la incidencia.";
      const campo = /nombre/i.test(mensaje) ? 'nombres' : /código|SIS/i.test(mensaje) ? 'sis' : /\bCI\b|carnet/i.test(mensaje) ? 'ci' : /foto|imagen/i.test(mensaje) ? 'foto' : null;
      if (campo) setErrores({ [campo]: mensaje });
      else setError(mensaje);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div
      className="report-incidence-stage"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
    >
      <section className="report-incidence-dialog">
        <header className="report-incidence-header">
          <span className="report-incidence-icon">
            <AlertOctagon size={23} />
          </span>
          <div className="report-incidence-head-main">
            <p>CONTROL DE IDENTIDAD</p>
            <h2 id="report-title">Reportar incidencia</h2>
          </div>
          <button
            aria-label="Cerrar formulario"
            onClick={() => {
              cerrar();
            }}
          >
            <X size={21} />
          </button>
        </header>
        <div className="report-incidence-divider" />
        {idReporte ? (
          <div className="report-incidence-success">
            <p>Incidencia #{idReporte} registrada y pendiente de revisión.</p>
            <button onClick={onClose}>Volver a escanear</button>
          </div>
        ) : (
          <>
            <main className="report-incidence-form">
              <div className="report-incidence-notice">
                <Info size={17} />
                <span>
                  Registra lo que observaste.{" "}
                  <strong>Este reporte no confirma una suplantación.</strong>
                </span>
              </div>
              <section className="report-incidence-section">
                <div className="report-incidence-section-head">
                  <h3>Datos del carnet</h3>
                  <span>* Obligatorio</span>
                </div>
                <div className="report-incidence-fields">
                  <label>
                    Nombres y apellidos <b>*</b>
                    <input
                      aria-label="Nombres y apellidos"
                      minLength={3} maxLength={75} aria-invalid={!!errores.nombres} aria-describedby="error-nombres"
                      value={nombres}
                      onChange={(e) =>
                        { setNombres(sanitizeNombreInput(e.target.value).slice(0, 75)); limpiarError("nombres"); }
                      }
                      placeholder="Como figuran en el carnet"
                    />
                    {errorCampo("nombres")}
                  </label>
                  <label>
                    CI / N.º de carnet <b>*</b>
                    <input
                      aria-label="CI / N.º de carnet" aria-invalid={!!errores.ci} aria-describedby="error-ci"
                      value={ci}
                      disabled={sinCarnet}
                      inputMode="numeric"
                      onChange={(e) =>
                        { setCi(e.target.value.replace(/\D/g, "").slice(0, 8)); limpiarError("ci"); }
                      }
                      placeholder={sinCarnet ? "No presentó carnet" : "7 u 8 dígitos"}
                    />
                    {errorCampo("ci")}
                  </label>
                </div>
                <button
                  className="report-incidence-text-action"
                  type="button"
                  onClick={() => {
                    setSisAbierto(!sisAbierto);
                    if (sisAbierto) setSis("");
                  }}
                >
                  {sisAbierto
                    ? "− Ocultar código SIS"
                    : "+ Añadir código SIS (opcional)"}
                </button>
                {sisAbierto && (
                  <label className="report-incidence-sis">
                    Código SIS
                    <input
                      aria-label="Código SIS" aria-invalid={!!errores.sis} aria-describedby="error-sis"
                      value={sis}
                      inputMode="numeric"
                      onChange={(e) =>
                        { setSis(e.target.value.replace(/\D/g, "").slice(0, 9)); limpiarError("sis"); }
                      }
                      placeholder="Código del estudiante"
                    />
                    {errorCampo("sis")}
                  </label>
                )}
              </section>
              <section className="report-incidence-section">
                <div className="report-incidence-section-head">
                  <h3>
                    ¿Qué no coincide? <b>*</b>
                  </h3>
                  <span>Selecciona una opción</span>
                </div>
                <div className="report-incidence-reasons">
                  {motivos.map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => {setMotivo(x); limpiarError("motivo"); limpiarError("detalle");}}
                      className={motivo === x ? "active" : ""}
                    >
                      <i />
                      {x}
                    </button>
                  ))}
                </div>
                {errorCampo("motivo")}
                {motivo === "Otro motivo" && (
                  <label className="report-incidence-detail">
                    Describe brevemente lo que observaste <b>*</b>
                    <textarea
                      value={detalle}
                      minLength={20}
                      onChange={(e) => {setDetalle(e.target.value); limpiarError("detalle");}}
                      placeholder="¿Qué ocurrió?"
                    />
                    {errorCampo("detalle")}
                  </label>
                )}
              </section>
              <section
                className="report-incidence-verification"
              >
                <div>
                  <h3>Verificación del carnet</h3>
                  <p>Compara el documento con la persona presente.</p>
                </div>
                <div className="report-incidence-verification-actions">
                  <button type="button" className={revisado ? "reviewed-active" : ""} onClick={() => { setRevisado(!revisado); setSinCarnet(false); limpiarError("carnet") }}>
                    <CheckCircle2 size={16} />
                    {revisado ? "Carnet revisado ✓" : "Marcar como revisado"}
                  </button>
                  <button type="button" className={sinCarnet ? "absence-active" : ""} onClick={() => { setSinCarnet(!sinCarnet); setRevisado(false); limpiarError("carnet"); limpiarError("ci"); if (!sinCarnet) setCi("") }}>
                    No presentó carnet
                  </button>
                </div>
              </section>
              {errorCampo("carnet")}
              <section className="report-incidence-photo">
                <div className="report-incidence-section-head">
                  <h3>
                    Evidencia fotográfica <b>*</b>
                  </h3>
                  <span>Uso interno</span>
                </div>
                {stream ? (
                  <div className="report-incidence-camera">
                    <video ref={videoRef} autoPlay playsInline />
                    <div>
                      <button type="button" onClick={() => void capturarFoto()}>
                        <Camera size={16} />
                        Capturar fotografía
                      </button>
                      <button type="button" onClick={detenerCamara}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={camaraPendiente}
                    onClick={() => void abrirCamara()}
                    className={`report-incidence-upload ${foto ? "has-photo" : ""}`}
                  >
                    <span className="upload-icon">
                      <Camera size={21} />
                    </span>
                    {foto && <span className="photo-preview">✓</span>}
                    <span>
                      <strong>
                        {foto ? "Tomar otra fotografía" : "Tomar fotografía"}
                      </strong>
                      <small>
                        {foto
                          ? fotoNombre
                          : "Incluye a la persona presente y su carnet."}
                      </small>
                    </span>
                    <ChevronRight size={19} />
                  </button>
                )}
                {errorCampo("foto")}
                <p className="report-incidence-privacy">
                  <LockKeyhole size={12} />
                  La imagen se guarda como evidencia privada del reporte.
                </p>
              </section>
              {error && (
                <p className="report-incidence-error" role="alert">
                  {error}
                </p>
              )}
            </main>
            <footer className="report-incidence-footer">
              <p>
                <Shield size={15} />
                Reporte confidencial, sujeto a revisión.
              </p>
              <div>
                <button
                  onClick={() => {
                    cerrar();
                  }}
                >
                  Cancelar
                </button>
                <button disabled={enviando} onClick={() => void enviar()}>
                  {enviando ? "Registrando…" : "Registrar incidencia"}
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
      <ConfirmDiscardDialog open={descartar} onStay={() => setDescartar(false)} onLeave={() => {detenerCamara();onClose();}}/>
    </div>
  );
}
