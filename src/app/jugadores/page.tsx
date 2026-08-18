"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Jugador } from "@/lib/supabase";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  UserMinus,
  UserCheck,
} from "lucide-react";

type FormData = {
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  numero_camiseta: string;
  posicion: string;
};

const initialForm: FormData = {
  nombre: "",
  apellido: "",
  fecha_nacimiento: "",
  numero_camiseta: "",
  posicion: "",
};

export default function JugadoresPage() {
  const router = useRouter();
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(initialForm);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (!usuario) {
      router.push("/");
      return;
    }
    cargarJugadores();
  }, [router]);

  async function cargarJugadores() {
    setLoading(true);
    const { data } = await supabase
      .from("jugadores")
      .select("*")
      .order("apellido");

    if (data) setJugadores(data);
    setLoading(false);
  }

  function abrirModal(jugador?: Jugador) {
    if (jugador) {
      setEditando(jugador.id);
      setForm({
        nombre: jugador.nombre,
        apellido: jugador.apellido,
        fecha_nacimiento: jugador.fecha_nacimiento || "",
        numero_camiseta: jugador.numero_camiseta?.toString() || "",
        posicion: jugador.posicion || "",
      });
    } else {
      setEditando(null);
      setForm(initialForm);
    }
    setShowModal(true);
  }

  function cerrarModal() {
    setShowModal(false);
    setEditando(null);
    setForm(initialForm);
  }

  async function guardarJugador(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);

    const datos = {
      nombre: form.nombre,
      apellido: form.apellido,
      fecha_nacimiento: form.fecha_nacimiento || null,
      numero_camiseta: form.numero_camiseta
        ? parseInt(form.numero_camiseta)
        : null,
      posicion: form.posicion || null,
    };

    if (editando) {
      const { error } = await supabase
        .from("jugadores")
        .update(datos)
        .eq("id", editando);

      if (error) {
        setMensaje("Error al actualizar el jugador.");
      } else {
        setMensaje("Jugador actualizado correctamente.");
        cerrarModal();
        cargarJugadores();
      }
    } else {
      const { error } = await supabase.from("jugadores").insert([datos]);

      if (error) {
        setMensaje("Error al crear el jugador.");
      } else {
        setMensaje("Jugador agregado correctamente.");
        cerrarModal();
        cargarJugadores();
      }
    }

    setGuardando(false);
    setTimeout(() => setMensaje(""), 3000);
  }

  async function toggleActivo(jugador: Jugador) {
    const { error } = await supabase
      .from("jugadores")
      .update({ activo: !jugador.activo })
      .eq("id", jugador.id);

    if (!error) {
      cargarJugadores();
    }
  }

  async function eliminarJugador(id: string) {
    if (!confirm("¿Estás seguro de eliminar este jugador?")) return;

    const { error } = await supabase.from("jugadores").delete().eq("id", id);

    if (!error) {
      setMensaje("Jugador eliminado.");
      cargarJugadores();
    }
    setTimeout(() => setMensaje(""), 3000);
  }

  const jugadoresFiltrados = jugadores.filter((j) => {
    const busquedaLower = busqueda.toLowerCase();
    return (
      j.nombre.toLowerCase().includes(busquedaLower) ||
      j.apellido.toLowerCase().includes(busquedaLower) ||
      j.numero_camiseta?.toString().includes(busquedaLower)
    );
  });

  const activos = jugadores.filter((j) => j.activo).length;
  const inactivos = jugadores.filter((j) => !j.activo).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
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
              <h1 className="font-bold text-gray-800">Jugadores</h1>
              <p className="text-xs text-gray-500">
                {activos} activos · {inactivos} inactivos
              </p>
            </div>
          </div>
          <button
            onClick={() => abrirModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
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

        {/* Búsqueda */}
        <div className="mb-4">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o número..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {jugadoresFiltrados.map((jugador) => (
            <div
              key={jugador.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${
                !jugador.activo ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                    {jugador.numero_camiseta || "?"}
                  </div>
                  <div>
                    <p className="font-medium">
                      {jugador.nombre} {jugador.apellido}
                    </p>
                    <p className="text-xs text-gray-500">
                      {jugador.posicion || "Sin posición"}
                      {jugador.fecha_nacimiento && (
                        <>
                          {" · "}
                          {new Date(
                            jugador.fecha_nacimiento
                          ).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActivo(jugador)}
                    className={`p-2 rounded-lg transition-colors ${
                      jugador.activo
                        ? "text-green-600 hover:bg-green-50"
                        : "text-gray-400 hover:bg-gray-50"
                    }`}
                    title={jugador.activo ? "Desactivar" : "Activar"}
                  >
                    {jugador.activo ? (
                      <UserCheck size={18} />
                    ) : (
                      <UserMinus size={18} />
                    )}
                  </button>
                  <button
                    onClick={() => abrirModal(jugador)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => eliminarJugador(jugador.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {jugadoresFiltrados.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No se encontraron jugadores</p>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">
                {editando ? "Editar Jugador" : "Nuevo Jugador"}
              </h2>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={guardarJugador} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) =>
                      setForm({ ...form, nombre: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    value={form.apellido}
                    onChange={(e) =>
                      setForm({ ...form, apellido: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={(e) =>
                    setForm({ ...form, fecha_nacimiento: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    N° Camiseta
                  </label>
                  <input
                    type="number"
                    value={form.numero_camiseta}
                    onChange={(e) =>
                      setForm({ ...form, numero_camiseta: e.target.value })
                    }
                    min="1"
                    max="99"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Posición
                  </label>
                  <select
                    value={form.posicion}
                    onChange={(e) =>
                      setForm({ ...form, posicion: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Pilar">Pilar</option>
                    <option value="Hooker">Hooker</option>
                    <option value="Segunda Línea">Segunda Línea</option>
                    <option value="Ala">Ala</option>
                    <option value="Nro 8">Octavo</option>
                    <option value="Medio Scrum">Medio Scrum</option>
                    <option value="Apertura">Apertura</option>
                    <option value="Centro">Centro</option>
                    <option value="Wing">Wing</option>
                    <option value="Fullback">Fullback</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {guardando ? (
                    "Guardando..."
                  ) : (
                    <>
                      <Save size={16} />
                      {editando ? "Actualizar" : "Crear"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}