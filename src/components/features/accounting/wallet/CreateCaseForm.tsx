"use client";

import { useState } from "react";
import { Loader2, FileText, CalendarClock } from "lucide-react";
import { legalCasesService } from "@/services/legalCases.service";
import { useAuth } from "@/hooks/useAuth";

export function CreateCaseForm({
  clientId,
  onCancel,
  onSuccess,
}: {
  clientId: number;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [estado, setEstado] = useState("nuevo");
  const [prioridad, setPrioridad] = useState("media");
  const [riesgo, setRiesgo] = useState("medio");
  const [monto, setMonto] = useState<string>("");
  const [proximaAccion, setProximaAccion] = useState("Contactar al cliente");
  const [fechaProxima, setFechaProxima] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });

  // Nuevos campos del caso
  const [tipoProceso, setTipoProceso] = useState("extrajudicial");
  const [estadoVehiculo, setEstadoVehiculo] = useState("poder_cliente");
  const [objetivoCaso, setObjetivoCaso] = useState("recuperar_cartera");
  const [intencionPago, setIntencionPago] = useState("");
  const [contactabilidad, setContactabilidad] = useState("");

  // Novedades para evento inicial
  const [canal, setCanal] = useState("sistema");
  const [descripcion, setDescripcion] = useState(
    "Apertura de caso legal para gestión de cartera.",
  );
  const [detalle, setDetalle] = useState("");

  const { profile } = useAuth();
  const [abogadoId, setAbogadoId] = useState(profile?.id || "");

  const onSubmit = async () => {
    if (!abogadoId) return alert("Debe asignar un abogado al caso.");
    if (!proximaAccion.trim())
      return alert("La próxima acción es obligatoria.");
    if (!fechaProxima)
      return alert("La fecha de próxima acción es obligatoria.");
    if (!descripcion.trim())
      return alert("La descripción del evento inicial es obligatoria.");
    if ((canal === "telefono" || canal === "whatsapp") && !detalle.trim()) {
      return alert(
        "El detalle es obligatorio cuando el canal es llamada o whatsapp.",
      );
    }

    setSaving(true);
    try {
      const montoNum = monto.trim() ? Number(monto) : null;
      await legalCasesService.createCase({
        id_sistema: clientId,
        estado,
        prioridad,
        riesgo,
        abogado_id: abogadoId,
        proxima_accion: proximaAccion,
        fecha_proxima_accion: new Date(fechaProxima).toISOString(),
        monto_referencia: Number.isFinite(montoNum) ? montoNum : null,
        tipo_proceso: tipoProceso,
        estado_vehiculo: estadoVehiculo,
        objetivo_caso: objetivoCaso,
        intencion_pago: intencionPago || null,
        contactabilidad: contactabilidad || null,
        event: {
          tipo: "creacion",
          descripcion,
          canal,
          detalle: detalle.trim() ? detalle : null,
        },
      });
      onSuccess();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error creando caso");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Aperturar caso legal
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Se vinculará automáticamente al ID Sistema:{" "}
            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
              {clientId}
            </span>
          </p>
        </div>
        <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg">
          <FileText className="h-6 w-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* BLOQUE 1: CONTEXTO DEL CASO */}
        <div className="md:col-span-2">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-slate-900 text-white flex items-center justify-center text-xs">
              1
            </span>
            Contexto del Caso
          </h4>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Abogado Asignado
          </label>
          <input
            value={profile?.full_name || profile?.phone || "Usuario actual"}
            readOnly
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none bg-slate-100 text-slate-600 text-sm font-medium cursor-not-allowed"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tipo de Proceso
          </label>
          <select
            value={tipoProceso}
            onChange={(e) => {
              setTipoProceso(e.target.value);
              if (e.target.value === "judicial") setEstado("judicial");
            }}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white"
          >
            <option value="extrajudicial">Cobranza Extrajudicial</option>
            <option value="demanda_ejecutiva">Demanda Ejecutiva</option>
            <option value="mediacion">Mediación</option>
            <option value="judicial">Judicial</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Objetivo del Caso
          </label>
          <select
            value={objetivoCaso}
            onChange={(e) => setObjetivoCaso(e.target.value)}
            disabled={estadoVehiculo === "recuperado"}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="recuperar_cartera">Recuperar Cartera</option>
            <option value="retener_vehiculo">Retener Vehículo</option>
            <option value="renegociar">Renegociar Deuda</option>
            <option value="recuperacion">Recuperación (Bloqueado)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Estado del Vehículo
          </label>
          <select
            value={estadoVehiculo}
            onChange={(e) => {
              setEstadoVehiculo(e.target.value);
              if (e.target.value === "recuperado")
                setObjetivoCaso("recuperacion");
            }}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white"
          >
            <option value="poder_cliente">En poder del cliente</option>
            <option value="retenido">Retenido</option>
            <option value="abandonado">Abandonado / Desconocido</option>
            <option value="taller">En taller</option>
            <option value="recuperado">Recuperado</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Monto de referencia{" "}
            <span className="text-slate-400 font-normal lowercase">
              (opcional)
            </span>
          </label>
          <input
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Ej: 4500"
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all"
          />
        </div>

        {/* BLOQUE 2: SITUACIÓN ACTUAL */}
        <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-slate-900 text-white flex items-center justify-center text-xs">
              2
            </span>
            Situación Actual
          </h4>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Estado del Caso
          </label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            disabled={tipoProceso === "judicial"}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="nuevo" disabled={tipoProceso === "judicial"}>
              Nuevo
            </option>
            <option value="gestionando">Gestionando</option>
            <option value="pre_judicial">Pre-Judicial</option>
            <option value="judicial" disabled={tipoProceso !== "judicial"}>
              Judicial
            </option>
            <option value="cerrado">Cerrado</option>
            <option value="castigado">Castigado</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Nivel de Riesgo
          </label>
          <select
            value={riesgo}
            onChange={(e) => setRiesgo(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white"
          >
            <option value="bajo">Bajo</option>
            <option value="medio">Medio</option>
            <option value="alto">Alto</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Prioridad
          </label>
          <select
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white"
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Contactabilidad{" "}
            <span className="text-slate-400 font-normal lowercase">
              (opcional)
            </span>
          </label>
          <select
            value={contactabilidad}
            onChange={(e) => {
              setContactabilidad(e.target.value);
              if (
                e.target.value === "no_contesta" ||
                e.target.value === "ilocalizable"
              ) {
                setIntencionPago("nula");
              }
            }}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white"
          >
            <option value="">-- Seleccionar --</option>
            <option value="contactado">Contactado</option>
            <option value="no_contesta">No contesta</option>
            <option value="ilocalizable">Ilocalizable</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Intención de Pago{" "}
            <span className="text-slate-400 font-normal lowercase">
              (opcional)
            </span>
          </label>
          <select
            value={intencionPago}
            onChange={(e) => setIntencionPago(e.target.value)}
            disabled={
              contactabilidad === "no_contesta" ||
              contactabilidad === "ilocalizable"
            }
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="">-- Seleccionar --</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
            <option value="nula">Nula / Rechazo</option>
          </select>
        </div>

        {/* BLOQUE 3: PLAN DE ACCIÓN */}
        <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-slate-900 text-white flex items-center justify-center text-xs">
              3
            </span>
            Plan de Acción{" "}
            <span className="text-red-500 ml-1 text-[10px] font-normal tracking-wide bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
              Requerido
            </span>
          </h4>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Próxima acción
          </label>
          <input
            value={proximaAccion}
            onChange={(e) => setProximaAccion(e.target.value)}
            placeholder="Ej: Visita al cliente, Enviar notificación..."
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Fecha límite de acción
          </label>
          <input
            type="datetime-local"
            value={fechaProxima}
            onChange={(e) => setFechaProxima(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white"
          />
        </div>

        {/* BLOQUE 4: REGISTRO INICIAL */}
        <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="h-6 w-6 rounded bg-slate-900 text-white flex items-center justify-center text-xs">
              4
            </span>
            Registro Inicial (Gestión){" "}
            <span className="text-slate-400 font-normal lowercase ml-1">
              lo que se hizo
            </span>
          </h4>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Canal de gestión
          </label>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all bg-white"
          >
            <option value="sistema">Sistema / Interno</option>
            <option value="telefono">Llamada Telefónica</option>
            <option value="whatsapp">WhatsApp / Mensaje</option>
            <option value="email">Correo Electrónico</option>
            <option value="presencial">Reunión Presencial</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Descripción (¿Qué se hizo?){" "}
            <span className="text-red-500 ml-1 text-[10px] font-normal tracking-wide bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
              Requerido
            </span>
          </label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Detalle de la gestión inicial{" "}
            {canal === "telefono" || canal === "whatsapp" ? (
              <span className="text-red-500 ml-1 text-[10px] font-normal tracking-wide bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                Requerido por el canal
              </span>
            ) : (
              <span className="text-slate-400 font-normal lowercase">
                (opcional)
              </span>
            )}
          </label>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Ej: Se ingresa al cliente en proceso de pre-legal por falta de respuesta..."
            rows={3}
            className="mt-1.5 w-full py-3 px-4 rounded-xl border border-slate-200 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 text-sm font-medium transition-all resize-none"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={saving}
          className="h-11 px-6 rounded-full text-slate-600 hover:bg-slate-100 transition text-sm font-bold disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          onClick={onSubmit}
          disabled={saving}
          className="h-11 px-8 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition shadow-lg shadow-slate-200 text-sm font-bold disabled:opacity-60 flex items-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar caso
        </button>
      </div>
    </div>
  );
}
