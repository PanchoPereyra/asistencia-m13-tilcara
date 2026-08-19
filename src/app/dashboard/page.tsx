"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Jugador, type Asistencia } from "@/lib/supabase";
import {
  Users,
  LogOut,
  ClipboardList,
  UserPlus,
  BarChart3,
  AlertTriangle,
  Award,
  FileSpreadsheet,
  FileText,
  Calendar,
  Eye,
  Check,
  X,
  Search,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Stats = {
  totalJugadores: number;
  asistenciaHoy: number;
  lesiones: number;
  mejorAsistencia: { nombre: string; porcentaje: number } | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalJugadores: 0,
    asistenciaHoy: 0,
    lesiones: 0,
    mejorAsistencia: null,
  });
  const [cumpleaneros, setCumpleaneros] = useState<Jugador[]>([]);
  const [topAsistencia, setTopAsistencia] = useState<
    { nombre: string; total: number; porcentaje: number }[]
  >([]);
  const [mostrarTop, setMostrarTop] = useState(5);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [fechaConsulta, setFechaConsulta] = useState("");
  const [consultaResult, setConsultaResult] = useState<{
    presentes: (Jugador & { observaciones: string | null })[];
    lesionados: (Jugador & { observaciones: string | null })[];
    ausentes: Jugador[];
  }>({ presentes: [], lesionados: [], ausentes: [] });
  const [consultando, setConsultando] = useState(false);
  const [consultaSearched, setConsultaSearched] = useState(false);

  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (!usuario) {
      router.push("/");
      return;
    }
    const hoy = new Date().toISOString().split("T")[0];
    const hace30 = new Date();
    hace30.setDate(hace30.getDate() - 30);
    setFechaHasta(hoy);
    setFechaConsulta(hoy);
    setFechaDesde(hace30.toISOString().split("T")[0]);
    cargarDatos();
  }, [router]);

  async function cargarConsultaFecha(fecha: string) {
    setConsultando(true);

    const { data: jugadoresData } = await supabase
      .from("jugadores")
      .select("*")
      .eq("activo", true)
      .order("apellido");

    const { data: asistenciaData } = await supabase
      .from("asistencia")
      .select("*")
      .eq("fecha", fecha);

    const jugadores = jugadoresData || [];
    const asistenciaMap: Record<
      string,
      { presente: boolean; lesionado: boolean; observaciones: string | null }
    > = {};
    (asistenciaData || []).forEach((a: Asistencia) => {
      asistenciaMap[a.jugador_id] = {
        presente: a.presente,
        lesionado: a.lesionado,
        observaciones: a.observaciones,
      };
    });

    const presentes: (Jugador & { observaciones: string | null })[] = [];
    const lesionados: (Jugador & { observaciones: string | null })[] = [];
    const ausentes: Jugador[] = [];

    jugadores.forEach((j) => {
      const a = asistenciaMap[j.id];
      if (a?.lesionado) {
        lesionados.push({ ...j, observaciones: a.observaciones });
      } else if (a?.presente) {
        presentes.push({ ...j, observaciones: a.observaciones });
      } else {
        ausentes.push(j);
      }
    });

    setConsultaResult({ presentes, lesionados, ausentes });
    setConsultaSearched(true);
    setConsultando(false);
  }

  async function cargarDatos() {
    setLoading(true);
    const hoy = new Date().toISOString().split("T")[0];

    const { count: totalJugadores } = await supabase
      .from("jugadores")
      .select("*", { count: "exact", head: true })
      .eq("activo", true);

    const { data: asistenciaHoy } = await supabase
      .from("asistencia")
      .select("*")
      .eq("fecha", hoy);

    const presentesHoy = asistenciaHoy?.filter((a) => a.presente).length || 0;
    const lesionesHoy = asistenciaHoy?.filter((a) => a.lesionado).length || 0;

    const mesActual = new Date().getMonth() + 1;
    const diaActual = new Date().getDate();
    const { data: cumpleanerosData } = await supabase
      .from("jugadores")
      .select("*")
      .eq("activo", true)
      .not("fecha_nacimiento", "is", null);

    const cumpleHoy = (cumpleanerosData || []).filter((j) => {
      if (!j.fecha_nacimiento) return false;
      const [a, m, d] = j.fecha_nacimiento.split("-").map(Number);
      return m === mesActual && d === diaActual;
    });

    const hace30 = new Date();
    hace30.setDate(hace30.getDate() - 30);
    const fechaDesde = hace30.toISOString().split("T")[0];

    const { data: asistenciaReciente } = await supabase
      .from("asistencia")
      .select("*, jugadores(*)")
      .gte("fecha", fechaDesde);

    const conteoAsistencia: Record<
      string,
      { nombre: string; total: number }
    > = {};
    (
      asistenciaReciente || ([] as (Asistencia & { jugadores: Jugador })[])
    ).forEach((a) => {
      if (!a.jugadores) return;
      const key = a.jugador_id;
      if (!conteoAsistencia[key]) {
        conteoAsistencia[key] = {
          nombre: `${a.jugadores.nombre} ${a.jugadores.apellido}`,
          total: 0,
        };
      }
      if (a.presente) conteoAsistencia[key].total++;
    });

    const diasUnicos = new Set(
      (asistenciaReciente || []).map((a) => a.fecha)
    );
    const totalDias = diasUnicos.size || 1;

    const top = Object.values(conteoAsistencia)
      .map((j) => ({
        ...j,
        porcentaje: Math.round((j.total / totalDias) * 100),
      }))
      .sort((a, b) => b.porcentaje - a.porcentaje);

    setStats({
      totalJugadores: totalJugadores || 0,
      asistenciaHoy: presentesHoy,
      lesiones: lesionesHoy,
      mejorAsistencia: top.length > 0 ? top[0] : null,
    });
    setCumpleaneros(cumpleHoy);
    setTopAsistencia(top);
    setMostrarTop(5);
    setLoading(false);
  }

  function handleLogout() {
    localStorage.removeItem("usuario");
    router.push("/");
  }

  async function exportarExcel() {
    const { data } = await supabase
      .from("asistencia")
      .select("*, jugadores(*)")
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta)
      .order("fecha");

    const rows = (data || []).map((a) => ({
      Fecha: a.fecha,
      Nombre: a.jugadores?.nombre || "",
      Apellido: a.jugadores?.apellido || "",
      "Nro Camiseta": a.jugadores?.numero_camiseta || "",
      Estado: a.lesionado
        ? "Lesionado"
        : a.presente
        ? "Presente"
        : "Ausente",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSX.writeFile(wb, `asistencia_${fechaDesde}_al_${fechaHasta}.xlsx`);
  }

  async function exportarPDF() {
    const { data } = await supabase
      .from("asistencia")
      .select("*, jugadores(*)")
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta)
      .order("fecha");

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Asistencia M13 - Club Tilcara", 14, 20);
    doc.setFontSize(11);
    doc.text(`Desde: ${fechaDesde}  Hasta: ${fechaHasta}`, 14, 28);

    const rows = (data || []).map((a) => [
      a.fecha,
      a.jugadores?.nombre || "",
      a.jugadores?.apellido || "",
      String(a.jugadores?.numero_camiseta || ""),
      a.lesionado ? "Lesionado" : a.presente ? "Presente" : "Ausente",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Fecha", "Nombre", "Apellido", "Nro", "Estado"]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74] },
    });

    doc.save(`asistencia_${fechaDesde}_al_${fechaHasta}.pdf`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center overflow-hidden">
              <img src="/logo-tilcara.png" alt="Escudo Club Tilcara" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800">M13 - Club Tilcara</h1>
              <p className="text-xs text-gray-500">Panel de asistencia</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {cumpleaneros.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-4 mb-6 text-white">
            <div className="flex items-center gap-3">
              <AlertTriangle size={24} />
              <div>
                <p className="font-bold">Hoy es el cumpleanos!</p>
                <p>
                  {cumpleaneros
                    .map((c) => `${c.nombre} ${c.apellido}`)
                    .join(", ")}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalJugadores}</p>
                <p className="text-xs text-gray-500">Jugadores</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ClipboardList size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.asistenciaHoy}</p>
                <p className="text-xs text-gray-500">Presentes hoy</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.lesiones}</p>
                <p className="text-xs text-gray-500">Lesiones hoy</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Award size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-lg font-bold truncate">
                  {stats.mejorAsistencia
                    ? stats.mejorAsistencia.nombre.split(" ")[0]
                    : "N/A"}
                </p>
                <p className="text-xs text-gray-500">
                  {stats.mejorAsistencia
                    ? `${stats.mejorAsistencia.porcentaje}% asistencia`
                    : "Sin datos"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Descargar asistencia
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <label className="text-gray-500">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-gray-500">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportarExcel}
                className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
              <button
                onClick={exportarPDF}
                className="flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <FileText size={16} />
                PDF
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-green-600" />
            <h2 className="font-bold text-lg">Top Asistencia (30 dias)</h2>
          </div>
          {topAsistencia.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay datos de asistencia aun
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {topAsistencia.slice(0, mostrarTop).map((j, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : i === 1
                          ? "bg-gray-100 text-gray-600"
                          : i === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-50 text-gray-500"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{j.nombre}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${j.porcentaje}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-600">
                      {j.porcentaje}%
                    </span>
                  </div>
                ))}
              </div>
              {topAsistencia.length > mostrarTop && (
                <button
                  onClick={() => setMostrarTop(topAsistencia.length)}
                  className="mt-4 w-full text-center text-sm text-green-600 hover:text-green-700 font-medium py-2 rounded-lg hover:bg-green-50 transition-colors"
                >
                  Ver todos ({topAsistencia.length})
                </button>
              )}
              {mostrarTop > 5 && topAsistencia.length > 5 && (
                <button
                  onClick={() => setMostrarTop(5)}
                  className="mt-2 w-full text-center text-sm text-gray-500 hover:text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Mostrar menos
                </button>
              )}
            </>
          )}
        </div>

        {/* Consulta de asistencia por fecha */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Eye size={20} className="text-green-600" />
              <h2 className="font-bold text-lg">Consulta de Asistencia</h2>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <input
                type="date"
                value={fechaConsulta}
                onChange={(e) => setFechaConsulta(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
              <button
                onClick={() => cargarConsultaFecha(fechaConsulta)}
                disabled={consultando}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Search size={14} />
                Buscar
              </button>
            </div>
          </div>

          {consultando ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !consultaSearched ? (
            <p className="text-gray-500 text-center py-8">
              Seleccioná una fecha y hacé clic en Buscar para ver la asistencia
            </p>
          ) : (
            <>
              {/* Resumen */}
              <div className="flex gap-4 mb-4 text-sm">
                <span className="flex items-center gap-1 text-green-600 font-bold">
                  <Check size={14} /> {consultaResult.presentes.length} presentes
                </span>
                <span className="flex items-center gap-1 text-red-600 font-bold">
                  <AlertTriangle size={14} /> {consultaResult.lesionados.length} lesionados
                </span>
                <span className="flex items-center gap-1 text-gray-500 font-bold">
                  <X size={14} /> {consultaResult.ausentes.length} ausentes
                </span>
              </div>

              {/* Presentes */}
              {consultaResult.presentes.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-green-700 mb-2 bg-green-50 rounded-lg px-3 py-1.5">
                    Presentes ({consultaResult.presentes.length})
                  </h3>
                  <div className="space-y-1">
                    {consultaResult.presentes.map((j) => (
                      <div key={j.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-50 transition-colors">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-700">
                          {j.numero_camiseta || "?"}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{j.nombre} {j.apellido}</p>
                          <p className="text-xs text-gray-400">{j.posicion || "Sin posición"}</p>
                        </div>
                        <Check size={16} className="text-green-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lesionados */}
              {consultaResult.lesionados.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-red-700 mb-2 bg-red-50 rounded-lg px-3 py-1.5">
                    Lesionados ({consultaResult.lesionados.length})
                  </h3>
                  <div className="space-y-1">
                    {consultaResult.lesionados.map((j) => (
                      <div key={j.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold text-red-700">
                          {j.numero_camiseta || "?"}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{j.nombre} {j.apellido}</p>
                          <p className="text-xs text-gray-400">{j.posicion || "Sin posición"}</p>
                        </div>
                        <AlertTriangle size={16} className="text-red-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ausentes */}
              {consultaResult.ausentes.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2 bg-gray-50 rounded-lg px-3 py-1.5">
                    Ausentes ({consultaResult.ausentes.length})
                  </h3>
                  <div className="space-y-1">
                    {consultaResult.ausentes.map((j) => (
                      <div key={j.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                          {j.numero_camiseta || "?"}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{j.nombre} {j.apellido}</p>
                          <p className="text-xs text-gray-400">{j.posicion || "Sin posición"}</p>
                        </div>
                        <X size={16} className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sin datos */}
              {consultaResult.presentes.length === 0 &&
                consultaResult.lesionados.length === 0 &&
                consultaResult.ausentes.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No hay jugadores activos en el sistema
                  </p>
                )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/asistencia")}
            className="bg-green-600 hover:bg-green-700 text-white rounded-xl p-6 shadow-sm transition-colors flex flex-col items-center gap-2"
          >
            <ClipboardList size={32} />
            <span className="font-bold">Marcar Asistencia</span>
          </button>
          <button
            onClick={() => router.push("/jugadores")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-6 shadow-sm transition-colors flex flex-col items-center gap-2"
          >
            <UserPlus size={32} />
            <span className="font-bold">Gestionar Jugadores</span>
          </button>
        </div>
      </main>
    </div>
  );
}