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
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [fechaHasta, setFechaHasta] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (!usuario) {
      router.push("/");
      return;
    }
    cargarDatos();
  }, [router]);

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
      .sort((a, b) => b.porcentaje - a.porcentaje)
      .slice(0, 5);

    setStats({
      totalJugadores: totalJugadores || 0,
      asistenciaHoy: presentesHoy,
      lesiones: lesionesHoy,
      mejorAsistencia: top.length > 0 ? top[0] : null,
    });
    setCumpleaneros(cumpleHoy);
    setTopAsistencia(top);
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
            <div className="flex items-center gap-2 text-sm">
              <label className="text-gray-500">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
              <label className="text-gray-500">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
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
            <div className="space-y-3">
              {topAsistencia.map((j, i) => (
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