import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Faltan las variables de entorno de Supabase");
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getSupabase() as any)[prop];
  },
});

export type Jugador = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  numero_camiseta: number | null;
  posicion: string | null;
  activo: boolean;
  created_at: string;
};

export type Asistencia = {
  id: string;
  jugador_id: string;
  fecha: string;
  presente: boolean;
  lesionado: boolean;
  observaciones: string | null;
  created_at: string;
};

export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  rol: "admin" | "staff";
  created_at: string;
};