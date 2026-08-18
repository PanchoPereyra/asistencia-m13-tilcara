import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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