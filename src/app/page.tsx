"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Usuario } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    const usuario = localStorage.getItem("usuario");
    if (usuario) {
      router.push("/dashboard");
      return;
    }
    checkUsuarios();
  }, [router]);

  async function checkUsuarios() {
    const { data } = await supabase.from("usuarios").select("*");
    if (data && data.length > 0) {
      setUsuarios(data);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: queryError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", email)
      .single();

    if (queryError || !data) {
      setError("Email no registrado. Contactá al administrador.");
      setLoading(false);
      return;
    }

    localStorage.setItem("usuario", JSON.stringify(data));
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center p-4" style={{ backgroundImage: "url('/logo-tilcara.png')" }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
              <img src="/logo-tilcara.png" alt="Escudo Club Tilcara" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              Asistencia M13
            </h1>
            <p className="text-gray-500 mt-1">Club Tilcara</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Ingresando..." : "Iniciar Sesión"}
            </button>
          </form>

          {/* Usuarios registrados */}
          {usuarios.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center mb-3">
                Usuarios registrados:
              </p>
              <div className="space-y-2">
                {usuarios.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setEmail(u.email)}
                    className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                  >
                    <span className="font-medium">{u.nombre}</span>
                    <span className="text-gray-500 ml-2">({u.email})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}