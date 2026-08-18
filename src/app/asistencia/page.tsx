"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Jugador, type Asistencia } from "@/lib/supabase";
import {
  ArrowLeft,
  Save,
  Check,
  X,
  AlertTriangle,
  Calendar,
} from "lucide-react";

export default function AsistenciaPage() {
  const router = useRouter();
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [asistencia, setAsistencia] = useState<
    Record<string, { presente: boolean; lesionado: boolean }>
  >({});
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (!usuario) {
      router.push("/");
      return;
    }
    cargarJugadores();
  }, [router, fecha]);

  async function cargarJugadores() {
    setLoading(true);

    // Cargar jugadores activos
    const { data: jugadoresData } = await supabase
      .from("jugadores")
      .select("*")
      .eq("activo", true)
      .order("apellido");

    if (jugadoresData) {
      setJugadores(jugadoresData);

      // Cargar asistencia existente para esta fecha
      const { data: asistenciaData } = await supabase
        .from("asistencia")
        .select("*")
        .eq("fecha", fecha);

      const asistenciaMap: Record<
        string,
        { presente: boolean; lesionado: boolean }
      > = {};
      (asistenciaData || []).forEach((a: Asistencia) => {
        asistenciaMap[a.jugador_id] = {
          presente: a.presente,
          lesionado: a.lesionado,
        };
      });

      setAsistencia(asistenciaMap);
    }
    setLoading(false);
  }

  function togglePresente(jugadorId: string) {
    setAsistencia((prev) => ({
      ...prev,
      [jugadorId]: {
        presente: !prev[jugadorId]?.presente,
        lesionado: prev[jugadorId]?.lesionado || false,
      },
    }));
  }

  function toggleLesionado(jugadorId: string) {
    setAsistencia((prev) => ({
      ...prev,
      [jugadorId]: {
        presente: prev[jugadorId]?.presente || false,
        lesionado: !prev[jugadorId]?.lesionado,
      },
    }));
  }

  async function guardarAsistencia() {
    setGuardando(true);
    setMensaje("");

    const registros = jugadores.map((j) => ({
      jugador_id: j.id,
      fecha,
      presente: asistencia[j.id]?.presente || false,
      lesionado: asistencia[j.id]?.lesionado || false,
    }));

    // Upsert: insertar o actualizar
    const { error } = await supabase.from("asistencia").upsert(registros, {
      onConflict: "jugador_id,fecha",
    });

    if (error) {
      setMensaje("Error al guardar. Intentá de nuevo.");
    } else {
      setMensaje("¡Asistencia guardada correctamente!");
      setTimeout(() => setMensaje(""), 3000);
    }
    setGuardando(false);
  }

  const presentes = Object.values(asistencia).filter((a) => a.presente).length;
  const lesiones = Object.values(asistencia).filter((a) => a.lesionado).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando jugadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="font-bold text-gray-800">Marcar Asistencia</h1>
              <p className="text-xs text-gray-500">Categoría M13</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Selector de fecha y stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-500" />
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 font-bold">
                ✓ {presentes} presentes
              </span>
              <span className="text-red-600 font-bold">
                🤕 {lesiones} lesionados
              </span>
              <span className="text-gray-500">
                {jugadores.length} total
              </span>
            </div>
          </div>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
              mensaje.includes("Error")
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-600"
            }`}
          >
            {mensaje}
          </div>
        )}

        {/* Lista de jugadores */}
        <div className="space-y-2">
          {jugadores.map((jugador) => (
            <div
              key={jugador.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            >
              <div className="flex items-center justify-between">
                {/* Info jugador */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">
                    {jugador.numero_camiseta || "?"}
                  </div>
                  <div>
                    <p className="font-medium">
                      {jugador.nombre} {jugador.apellido}
                    </p>
                    <p className="text-xs text-gray-500">
                      {jugador.posicion || "Sin posición"}
                    </p>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-4">
                  {/* Toggle Presente */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => togglePresente(jugador.id)}
                      className={`toggle-switch ${
                        asistencia[jugador.id]?.presente ? "active" : ""
                      }`}
                    />
                    <span className="text-xs text-gray-500">
                      {asistencia[jugador.id]?.presente ? "Presente" : "Ausente"}
                    </span>
                  </div>

                  {/* Toggle Lesionado */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => toggleLesionado(jugador.id)}
                      className={`toggle-lesion ${
                        asistencia[jugador.id]?.lesionado ? "active" : ""
                      }`}
                    />
                    <span className="text-xs text-gray-500">
                      {asistencia[jugador.id]?.lesionado
                        ? "Lesionado"
                        : "OK"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Botón guardar */}
        <div className="mt-6 sticky bottom-4">
          <button
            onClick={guardarAsistencia}
            disabled={guardando}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save size={20} />
                Guardar Asistencia
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}